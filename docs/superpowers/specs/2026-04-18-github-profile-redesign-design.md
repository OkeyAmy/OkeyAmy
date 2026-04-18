# GitHub Profile Redesign — Design Spec
Date: 2026-04-18

## Goal

Redesign the GitHub profile README generator to be lean, terminal-consistent, and data-honest. No fake data, no duplicate API calls, no aesthetic breaks, no bloat.

## Problems Being Fixed

1. **Fake data** — `generateTechStackSection()` claims "live repository analysis" but uses hardcoded versions (`3.11.5-1`) and static progress bar values. The `languages` parameter is passed in but never used.
2. **Duplicate API call** — `fetchLanguageStats()` hits the same endpoint as `fetchRepositories()` to extract language fields. One call can serve both.
3. **Aesthetic breaks** — "Metrics" and "Connect" sections drop the terminal theme, rendering as plain badge rows.
4. **Redundant sections** — Boot sequence + System Status carry the same identity info. The repo section has a bash listing above cards that shows identical data.
5. **Dead weight images** — github-readme-stats and streak-stats are two stacked images with overlapping information.

## New README Structure (4 sections, ~80 lines)

### 1. Header
- ASCII banner (unchanged)
- Typing SVG (kept)

### 2. `$ neofetch` block
Replaces boot sequence + system status sections. One bash code block styled as neofetch output, side-by-side with typing SVG. Fields: OS, Build date (live), Status, Repos (live count from API), Focus, Contact, GitHub.

### 3. `$ pacman -Qs` — Tech Stack
Real language percentages calculated from repo count per language vs total repos. Progress bars derived from actual data. No version numbers. No fake "live analysis" claim — the comment says what it actually is: repo language counts.

Format per line:
```
[████████████████████] python        42%  (primary · AI/ML)
```

### 4. Repo Cards
2×3 HTML table of `github-readme-stats` pin cards. The bash listing above the table is removed — the cards already show name, description, stars, language.

### 5. Activity Graph
Single `github-readme-activity-graph` image. Replaces the two stacked stats+streak images.

### 6. `$ cat /etc/contact.conf`
Terminal-styled bash block. Linked text for GitHub, email, Twitter. No badge images.

## Code Changes — `scripts/update-readme.js`

### Merge API calls
Remove `fetchLanguageStats()` entirely. `fetchRepositories()` already fetches all repos — extract language data from the same response and return both.

```js
// Single fetch, returns both
async function fetchData() {
  const repos = await github.get(`/users/${CONFIG.username}/repos`, { params: { per_page: 100 } });
  const active = repos.data.filter(r => !r.fork && !r.archived);
  const featured = active.slice(0, 6).map(...);
  const languages = computeLanguageStats(active); // extracted from same data
  return { featured, languages, totalCount: active.length };
}
```

### Real language stats
`computeLanguageStats(repos)` counts repos per language, calculates percentages, sorts descending, returns top 8. Progress bar width = `Math.round(percentage / 5)` blocks out of 20.

### Remove `generateTechStackSection` hardcoded data
Replace the hardcoded `techStack` and `frameworks` arrays with output derived from `computeLanguageStats`. No version strings.

### Remove bash listing from repo section
`generateRepositorySection()` renders only the HTML card table. The bash block above it is deleted.

### Replace stats/streak images
Remove `github-readme-stats` stats image and `streak-stats` image from the System Status section. That section is replaced by the neofetch block entirely.

### Update connect section
Replace badge `img` tags with a bash code block containing linked markdown text.

## What Stays the Same
- ASCII banner
- Typing SVG
- Repo card table (2×3 grid, same service)
- Activity graph image
- `CONFIG` object and environment variable pattern
- GitHub Actions deploy workflow (not in this repo, but no changes needed)

## External Service Calls — Before vs After

| Service | Before | After |
|---|---|---|
| github-readme-stats (stats) | ✓ | removed |
| streak-stats | ✓ | removed |
| github-readme-stats (pin cards) | ✓ (×6) | ✓ (×6) |
| activity-graph | ✓ | ✓ |
| readme-typing-svg | ✓ | ✓ |
| komarev (views) | ✓ | removed |
| shields.io (badges) | ✓ (×4) | removed |

Reduced from 8 service dependencies to 3.
