#!/usr/bin/env node

// GitHub Trending 抓取器：daily 提供新鲜度，weekly 补充热度，monthly 提供常青树候选。
// stdout 只输出最终 JSON；诊断信息一律写入 stderr，供 fetch-trending.sh 安全重定向。

const API_BASE = 'https://cloudflare-mcp1.zx1993.top/api/trending';
const GITHUB_API_BASE = 'https://api.github.com';
const PERIODS = ['daily', 'weekly', 'monthly'];
const LANGUAGES = ['', 'python', 'javascript', 'typescript', 'go', 'rust', 'java'];
const REQUEST_CONCURRENCY = 6;

async function fetchJSON(url, timeout = 15000) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'github-blindbox/1.0' },
    signal: AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

async function resolveSponsorsOwner(ownerName) {
  const url = `${GITHUB_API_BASE}/search/repositories?q=user:${encodeURIComponent(ownerName)}&sort=stars&order=desc&per_page=1`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'github-blindbox/1.0', Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const top = (await response.json()).items?.[0];
    return top ? { owner: top.owner.login, name: top.name } : null;
  } catch {
    return null;
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try { results[index] = { status: 'fulfilled', value: await worker(items[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

// 周期优先级：daily > weekly > monthly（越短越能反映真实热度，展示时取最短周期）
const PERIOD_PRIORITY = { daily: 3, weekly: 2, monthly: 1 };

function toRepo(item, period, language) {
  return {
    rank: 0,
    owner: item.username,
    name: item.reponame,
    fullName: `${item.username}/${item.reponame}`,
    url: `https://github.com/${item.username}/${item.reponame}`,
    description: (item.description || '').trim() || '（暂无描述）',
    language: item.language || 'Unknown',
    stars: Number(item.stars) || 0,
    forks: Number(item.forks) || 0,
    starsToday: Number(item.starsToday) || 0,
    periods: [period],
    sources: [`${period}:${language || 'all'}`],
    primaryPeriod: period
  };
}

function mergeRepo(existing, incoming) {
  // primaryPeriod 取最短周期（daily > weekly > monthly），保证 starsToday 的语义跟展示单位一致
  const primaryPeriod = (PERIOD_PRIORITY[incoming.primaryPeriod] || 0) > (PERIOD_PRIORITY[existing.primaryPeriod] || 0)
    ? incoming.primaryPeriod
    : existing.primaryPeriod;
  // starsToday 跟随 primaryPeriod：取最短周期对应的 starsToday，避免 monthly 的月增量冒充周增量
  const starsToday = primaryPeriod === incoming.primaryPeriod
    ? Math.max(existing.starsToday, incoming.starsToday)
    : existing.starsToday;
  return {
    ...existing,
    description: existing.description === '（暂无描述）' ? incoming.description : existing.description,
    language: existing.language === 'Unknown' ? incoming.language : existing.language,
    stars: Math.max(existing.stars, incoming.stars),
    forks: Math.max(existing.forks, incoming.forks),
    starsToday,
    periods: [...new Set([...existing.periods, ...incoming.periods])],
    sources: [...new Set([...existing.sources, ...incoming.sources])],
    primaryPeriod
  };
}

async function main() {
  const requests = PERIODS.flatMap(period => LANGUAGES.map(language => ({ period, language })));
  const results = await mapWithConcurrency(requests, REQUEST_CONCURRENCY, async ({ period, language }) => {
    const query = new URLSearchParams({ since: period });
    if (language) query.set('language', language);
    const body = await fetchJSON(`${API_BASE}?${query}`);
    return { period, repos: (body.data || []).map(item => toRepo(item, period, language)) };
  });

  const seen = new Map();
  let failedRequests = 0;
  const periodQuality = Object.fromEntries(PERIODS.map(period => [period, {
    successfulRequests: 0
  }]));
  for (const result of results) {
    if (result.status === 'rejected') {
      failedRequests++;
      console.error(`[trending] Request failed: ${result.reason.message}`);
      continue;
    }
    const { period, repos } = result.value;
    if (periodQuality[period]) periodQuality[period].successfulRequests++;
    for (const repo of repos) {
      const existing = seen.get(repo.fullName);
      seen.set(repo.fullName, existing ? mergeRepo(existing, repo) : repo);
    }
  }
  if (seen.size === 0) throw new Error(`All ${requests.length} Trending requests failed or returned no projects`);

  const sponsorsEntries = [...seen.values()].filter(repo => repo.owner === 'sponsors');
  if (sponsorsEntries.length > 0) {
    console.error(`[trending] Resolving ${sponsorsEntries.length} sponsors entries via GitHub API...`);
    for (const entry of sponsorsEntries) {
      const resolved = await resolveSponsorsOwner(entry.name);
      seen.delete(entry.fullName);
      if (!resolved) {
        console.error(`[trending] ${entry.fullName} could not be resolved and was removed`);
      } else {
        const fullName = `${resolved.owner}/${resolved.name}`;
        const resolvedRepo = { ...entry, owner: resolved.owner, name: resolved.name, fullName, url: `https://github.com/${fullName}` };
        const existing = seen.get(fullName);
        seen.set(fullName, existing ? mergeRepo(existing, resolvedRepo) : resolvedRepo);
        console.error(`[trending] ${entry.fullName} resolved to ${fullName}`);
      }
      await sleep(1000);
    }
  }

  const repos = [...seen.values()]
    .filter(repo => repo.owner !== 'sponsors')
    .sort((a, b) => b.starsToday - a.starsToday || b.stars - a.stars)
    .map((repo, index) => ({ ...repo, rank: index + 1, source: repo.sources.join(',') }));
  const periodCounts = Object.fromEntries(PERIODS.map(period => [period, repos.filter(repo => repo.periods.includes(period)).length]));
  const quality = {
    totalRepos: repos.length,
    minimumTotalRepos: 120,
    meetsMinimum: repos.length >= 120,
    degraded: periodCounts.monthly < 20,
    periods: Object.fromEntries(PERIODS.map(period => [period, {
      successfulRequests: periodQuality[period].successfulRequests,
      uniqueRepos: periodCounts[period]
    }]))
  };
  console.error(`[trending] Final: ${repos.length} unique repos; daily=${periodCounts.daily} (${quality.periods.daily.successfulRequests} requests), weekly=${periodCounts.weekly} (${quality.periods.weekly.successfulRequests} requests), monthly=${periodCounts.monthly} (${quality.periods.monthly.successfulRequests} requests), failed requests=${failedRequests}, sponsors resolved/filtered=${sponsorsEntries.length}`);
  if (!quality.meetsMinimum) console.error(`[trending] Quality gate failed: ${repos.length}/120 repos; cache must not be replaced`);
  if (quality.degraded) console.error(`[trending] DEGRADED: monthly unique repos ${periodCounts.monthly}/20`);
  console.log(JSON.stringify({ repos, fetchedAt: new Date().toISOString(), count: repos.length, source: 'cloudflare-multi-period', quality }, null, 2));
}

main().catch(error => {
  console.error(`[trending] Error: ${error.message}`);
  process.exit(1);
});
