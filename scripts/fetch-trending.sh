#!/bin/bash
# ============================================================================
# GitHub 每日盲盒 — 抓取 + Push Pipeline
# ============================================================================
# 每天 05:00 CST 执行，抓取全天完整数据，缓存到本地 + push 到 GitHub。
# 10:00 的 run-trending.sh 从此缓存读取数据发邮件。
#
# Cron: 0 5 * * * bash /var/www/github-blindbox/scripts/fetch-trending.sh
#
# ⚠️ 部署须知：本脚本 L66 有 `git reset --hard origin/master`，会覆盖服务器上
# 所有 tracked 文件。部署改动必须走 git push，不要 scp 直传服务器——05:00 会被
# reset 覆盖回 git 仓库版本。
# ============================================================================

set -e

PROJECT_DIR="/var/www/github-blindbox"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
CACHE_DIR="$PROJECT_DIR/cache"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TMP_DIR="/tmp/github-blindbox"
mkdir -p "$TMP_DIR" "$CACHE_DIR"

LOG_FILE="$TMP_DIR/fetch-$(date '+%Y%m%d-%H%M').log"

echo "[$TIMESTAMP] === GitHub 每日盲盒 — 抓取阶段 ===" | tee -a "$LOG_FILE"     

# Step 1: Fetch trending repos
echo "[$TIMESTAMP] Step 1: Fetching GitHub Trending..." | tee -a "$LOG_FILE"    
node "$SCRIPTS_DIR/github-trending.js" 2>>"$LOG_FILE" > "$TMP_DIR/trending-data-raw.json"

if [ $? -ne 0 ] || [ ! -s "$TMP_DIR/trending-data-raw.json" ]; then
  echo "[$TIMESTAMP] WARNING: Fetch failed, keeping previous cache" | tee -a "$LOG_FILE"
  exit 0
fi

# Step 2: Validate JSON
if ! node -e "JSON.parse(require('fs').readFileSync('$TMP_DIR/trending-data-raw.json','utf-8'))" 2>>"$LOG_FILE"; then
  echo "[$TIMESTAMP] WARNING: Invalid JSON from trending API, keeping previous cache" | tee -a "$LOG_FILE"
  rm -f "$TMP_DIR/trending-data-raw.json"
  exit 0
fi

REPO_COUNT=$(node -e "const d=require('$TMP_DIR/trending-data-raw.json'); console.log(d.repos?.length||0)" 2>/dev/null || echo "0")
echo "[$TIMESTAMP] Fetched $REPO_COUNT repos" | tee -a "$LOG_FILE"

# Step 3: Copy to cache (for 18:00 email)
if [ "$REPO_COUNT" -gt 0 ]; then
  cp "$TMP_DIR/trending-data-raw.json" "$CACHE_DIR/trending-data.json"
  echo "[$TIMESTAMP] Cache updated: $CACHE_DIR/trending-data.json ($REPO_COUNT repos)" | tee -a "$LOG_FILE"
  date '+%Y-%m-%d %H:%M:%S' > "$CACHE_DIR/trending-fetched-at.txt"
else
  echo "[$TIMESTAMP] WARNING: 0 repos fetched, keeping previous cache" | tee -a "$LOG_FILE"
  exit 0
fi

# Step 4: Push to GitHub (for 球友 to consume)
GITHUB_REPO_DIR="$PROJECT_DIR"
GITHUB_REPO="git@github.com:zhangxq0606-ctrl/github-blindbox.git"

echo "[$TIMESTAMP] Step 4: Pushing to GitHub via SSH..." | tee -a "$LOG_FILE"

# Clone or pull
if [ -d "$GITHUB_REPO_DIR/.git" ]; then
  cd "$GITHUB_REPO_DIR"
  git remote set-url origin "$GITHUB_REPO" 2>/dev/null || true
  # The clone is only used to publish trending-feed.json; never keep local edits.
  # Reset hard to avoid diverging branches when remote has new code commits.
  git fetch origin 2>>"$LOG_FILE" || true
  git reset --hard origin/master 2>>"$LOG_FILE" || true
else
  git clone "$GITHUB_REPO" "$GITHUB_REPO_DIR" 2>>"$LOG_FILE"
  cd "$GITHUB_REPO_DIR"
fi

# Copy cache to repo
cp "$CACHE_DIR/trending-data.json" "$GITHUB_REPO_DIR/trending-feed.json"

# Configure git user (needed for commit)
cd "$GITHUB_REPO_DIR"
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Commit and push
git add trending-feed.json
if ! git diff --cached --quiet; then
  git commit -m "chore: update trending feed [skip ci]"
  git push 2>>"$LOG_FILE"
  echo "[$TIMESTAMP] Successfully pushed to GitHub via SSH" | tee -a "$LOG_FILE"
else
  echo "[$TIMESTAMP] No changes to push" | tee -a "$LOG_FILE"
fi

# Cleanup
rm -f "$TMP_DIR/trending-data-raw.json"

# Cleanup old logs (keep 30 days)
find "$TMP_DIR" -name 'fetch-*.log' -mtime +30 -delete 2>/dev/null || true      

echo "[$TIMESTAMP] === 抓取阶段完成 ===" | tee -a "$LOG_FILE"
