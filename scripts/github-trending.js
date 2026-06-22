#!/usr/bin/env node

// ============================================================================
// GitHub Trending Scraper
// ============================================================================
// Uses multi-language requests to gather ~50-80 unique repos.
// Deduplicates and passes to AI for selection.
//
// Usage: node github-trending.js
// Output: JSON to stdout
// ============================================================================

const API_BASE = 'https://cloudflare-mcp1.zx1993.top/api/trending';

// Request trending for different languages to get enough data
const LANGUAGES = ['', 'python', 'javascript', 'typescript', 'go'];

async function fetchJSON(url, timeout = 15000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'github-blindbox/1.0' },
    signal: AbortSignal.timeout(timeout)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function main() {
  const seen = new Map();

  const results = await Promise.allSettled(
    LANGUAGES.map(async (lang) => {
      const url = lang ? `${API_BASE}?since=daily&language=${lang}` : `${API_BASE}?since=daily`;
      const body = await fetchJSON(url);
      return (body.data || []).map(item => ({
        rank: 0,
        owner: item.username,
        name: item.reponame,
        fullName: `${item.username}/${item.reponame}`,
        url: item.url,
        description: (item.description || '').trim() || '（暂无描述）',
        language: item.language || 'Unknown',
        stars: item.stars || 0,
        forks: item.forks || 0,
        starsToday: item.starsToday || 0,
        source: `api-${lang || 'all'}`
      }));
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const repo of result.value) {
        if (!seen.has(repo.fullName)) {
          seen.set(repo.fullName, repo);
        }
      }
    }
  }

  let repos = Array.from(seen.values());
  repos.sort((a, b) => b.starsToday - a.starsToday);
  repos = repos.map((repo, i) => ({ ...repo, rank: i + 1 }));

  console.error(`[trending] Got ${repos.length} unique repos`);

  console.log(JSON.stringify({
    repos,
    fetchedAt: new Date().toISOString(),
    count: repos.length
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});