# GitHub Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `scripts/update-readme.js` to generate a lean, terminal-consistent profile README with real data and no duplicate API calls.

**Architecture:** Single fetch → compute language stats from same response → generate 4-section README (neofetch block, tech stack, repo cards, activity + connect). All section generators are pure functions tested with Node's built-in `assert`.

**Tech Stack:** Node.js 18+, axios, fs-extra, dotenv, Node built-in `assert`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/update-readme.js` | Modify | All generation logic — merge API calls, fix generators, rewrite template |
| `scripts/test-local.js` | Modify | Add unit tests for pure functions before the integration run |

---

### Task 1: Add `computeLanguageStats` and merge API calls

**Files:**
- Modify: `scripts/update-readme.js:68-96` (remove `fetchLanguageStats`), `scripts/update-readme.js:34-63` (replace `fetchRepositories` with `fetchData`)

- [ ] **Step 1: Write the failing unit tests in `test-local.js`**

Add this block above the `runTests` call at the bottom of `scripts/test-local.js`:

```js
const assert = require('assert');
const { computeLanguageStats, generateTechStackSection, generateRepositorySection } = require('./update-readme');

function runUnitTests() {
  console.log('\n🧪 Unit Tests:');

  // computeLanguageStats
  const fakeRepos = [
    { language: 'Python' },
    { language: 'Python' },
    { language: 'TypeScript' },
    { language: 'JavaScript' },
    { language: 'Python' },
    { language: null },
  ];
  const stats = computeLanguageStats(fakeRepos);
  assert.strictEqual(stats[0][0], 'Python', 'top language should be Python');
  assert.strictEqual(stats[0][1], 60, 'Python should be 60% (3 of 5 repos with language)');
  assert.strictEqual(stats[1][0], 'TypeScript');
  assert.strictEqual(stats.length, 3, 'null language repos are excluded');
  console.log('├── computeLanguageStats: ✓');

  // generateTechStackSection: output contains real language names
  const section = generateTechStackSection(stats);
  assert.ok(section.includes('python'), 'section must include python');
  assert.ok(!section.includes('3.11.5'), 'must not contain fake version');
  assert.ok(section.includes('50%'), 'must show real percentage');
  console.log('├── generateTechStackSection: ✓');

  // generateRepositorySection: no bash listing block
  const fakeApiRepos = [
    { name: 'repo-a', description: 'desc', stars: 1, language: 'Python', updated: '2026-04-01', url: 'https://github.com/OkeyAmy/repo-a' }
  ];
  const repoSection = generateRepositorySection(fakeApiRepos);
  assert.ok(!repoSection.includes('find /home/okey/repositories'), 'bash listing must be removed');
  assert.ok(repoSection.includes('<table>'), 'card table must be present');
  console.log('└── generateRepositorySection: ✓');
}

runUnitTests();
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
node scripts/test-local.js 2>&1 | head -30
```

Expected: `TypeError: computeLanguageStats is not a function` (or similar — functions not yet exported)

- [ ] **Step 3: Add `computeLanguageStats` to `update-readme.js`**

Add this function after the `github` axios client definition (around line 29), replacing the entire `fetchLanguageStats` function:

```js
/**
 * Compute language percentages from a repos array
 * Returns: [ [langName, pct], ... ] sorted desc, top 8
 */
function computeLanguageStats(repos) {
  const counts = {};
  const withLang = repos.filter(r => r.language);
  for (const r of withLang) {
    counts[r.language] = (counts[r.language] || 0) + 1;
  }
  const total = withLang.length;
  if (total === 0) return [];
  return Object.entries(counts)
    .map(([lang, n]) => [lang, Math.round((n / total) * 100)])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
}
```

- [ ] **Step 4: Replace `fetchRepositories` + `fetchLanguageStats` with single `fetchData`**

Remove both functions and replace with:

```js
/**
 * Single GitHub API fetch — returns featured repos, language stats, total count
 */
async function fetchData() {
  try {
    console.log('🔄 Fetching GitHub data...');
    const response = await github.get(`/users/${CONFIG.username}/repos`, {
      params: { sort: 'updated', direction: 'desc', per_page: 100 }
    });

    const active = response.data.filter(r => !r.fork && !r.archived);

    const featured = active.slice(0, 6).map(repo => ({
      name: repo.name,
      description: repo.description || 'No description available',
      stars: repo.stargazers_count,
      language: repo.language,
      updated: repo.updated_at.split('T')[0],
      url: repo.html_url
    }));

    const languages = computeLanguageStats(active);
    console.log(`✅ Fetched ${active.length} repos, ${languages.length} languages`);
    return { featured, languages, totalCount: active.length };
  } catch (error) {
    console.log('⚠️ Error fetching GitHub data:', error.message);
    return { featured: [], languages: [], totalCount: 0 };
  }
}
```

- [ ] **Step 5: Export `computeLanguageStats` at the bottom of `update-readme.js`**

Update the exports line:

```js
module.exports = { generateReadme, computeLanguageStats, CONFIG };
```

- [ ] **Step 6: Run unit tests — `computeLanguageStats` should pass**

```bash
node scripts/test-local.js 2>&1 | head -40
```

Expected: `├── computeLanguageStats: ✓` — other two tests still failing

- [ ] **Step 7: Commit**

```bash
git add scripts/update-readme.js scripts/test-local.js
git commit -m "refactor: merge API calls, add computeLanguageStats"
```

---

### Task 2: Rewrite `generateTechStackSection` with real data

**Files:**
- Modify: `scripts/update-readme.js:176-217` (replace entire function)

- [ ] **Step 1: Replace `generateTechStackSection` with real-data version**

Remove the hardcoded `techStack` and `frameworks` arrays. Replace the entire function with:

```js
/**
 * Generate tech stack section from real language stats
 */
function generateTechStackSection(languages) {
  if (languages.length === 0) {
    return `
\`\`\`bash
$ pacman -Qs | sort -k2 -rn
# No language data available
\`\`\``;
  }

  const generateBar = (pct) => {
    const filled = Math.round(pct / 5);
    return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + ']';
  };

  const lines = languages.map(([lang, pct]) =>
    `${generateBar(pct)} ${lang.toLowerCase().padEnd(14)} ${String(pct).padStart(3)}%`
  ).join('\n');

  return `
\`\`\`bash
$ pacman -Qs | sort -k2 -rn
# languages — calculated from repo counts

${lines}
\`\`\``;
}
```

- [ ] **Step 2: Export `generateTechStackSection` for tests**

Update exports:

```js
module.exports = { generateReadme, computeLanguageStats, generateTechStackSection, CONFIG };
```

- [ ] **Step 3: Run unit tests — tech stack test should now pass**

```bash
node scripts/test-local.js 2>&1 | head -40
```

Expected:
```
├── computeLanguageStats: ✓
├── generateTechStackSection: ✓
```

- [ ] **Step 4: Commit**

```bash
git add scripts/update-readme.js
git commit -m "refactor: generateTechStackSection uses real language percentages"
```

---

### Task 3: Remove bash listing from `generateRepositorySection`

**Files:**
- Modify: `scripts/update-readme.js:101-171` (replace entire function)

- [ ] **Step 1: Replace `generateRepositorySection` with cards-only version**

Remove the bash listing block entirely. Keep only the card table:

```js
/**
 * Generate repository section — card table only, no duplicate bash listing
 */
function generateRepositorySection(repos) {
  if (repos.length === 0) {
    return `
\`\`\`bash
$ ls ~/repos/
# No active repositories found
\`\`\``;
  }

  let tableHtml = '<table>\n';
  for (let i = 0; i < repos.length; i += 2) {
    tableHtml += '  <tr>\n';
    const repo1 = repos[i];
    tableHtml += `    <td><a href="${repo1.url}"><img align="center" src="https://github-readme-stats.vercel.app/api/pin/?username=${CONFIG.username}&repo=${repo1.name}&theme=dark&hide_border=true&bg_color=000000&title_color=00ff00&text_color=c9d1d9&icon_color=00ff00" /></a></td>\n`;
    if (i + 1 < repos.length) {
      const repo2 = repos[i + 1];
      tableHtml += `    <td><a href="${repo2.url}"><img align="center" src="https://github-readme-stats.vercel.app/api/pin/?username=${CONFIG.username}&repo=${repo2.name}&theme=dark&hide_border=true&bg_color=000000&title_color=00ff00&text_color=c9d1d9&icon_color=00ff00" /></a></td>\n`;
    } else {
      tableHtml += '    <td></td>\n';
    }
    tableHtml += '  </tr>\n';
  }
  tableHtml += '</table>';

  return `\n<div align="center">\n\n${tableHtml}\n\n</div>`;
}
```

- [ ] **Step 2: Export `generateRepositorySection` for tests**

Update exports:

```js
module.exports = { generateReadme, computeLanguageStats, generateTechStackSection, generateRepositorySection, CONFIG };
```

- [ ] **Step 3: Run unit tests — all three should pass**

```bash
node scripts/test-local.js 2>&1 | head -40
```

Expected:
```
├── computeLanguageStats: ✓
├── generateTechStackSection: ✓
└── generateRepositorySection: ✓
```

- [ ] **Step 4: Commit**

```bash
git add scripts/update-readme.js
git commit -m "refactor: generateRepositorySection returns cards only"
```

---

### Task 4: Rewrite `generateReadme` — new template

**Files:**
- Modify: `scripts/update-readme.js:222-351` (replace `generateReadme` function)

- [ ] **Step 1: Replace `generateReadme` with new template**

Replace the entire `generateReadme` function:

```js
async function generateReadme() {
  console.log('🚀 Starting README generation...');

  const { featured, languages, totalCount } = await fetchData();
  const today = new Date().toISOString().split('T')[0];

  const readmeContent = `# 🖥️ OKEY-AMY OS | Build ${today}-LTS

<div align="center">

\`\`\`
     ██████╗ ██╗  ██╗███████╗██╗   ██╗     █████╗ ███╗   ███╗██╗   ██╗
    ██╔═══██╗██║ ██╔╝██╔════╝██╗ ██╔╝     ██╔══██╗████╗ ████║╚██╗ ██╔╝
    ██║   ██║█████╔╝ █████╗  ╚████╔╝█████╗███████║██╔████╔██║ ╚████╔╝
    ██║   ██║██╔═██╗ ██╔══╝   ╚██╔╝ ╚════╝██╔══██║██║╚██╔╝██║  ╚██╔╝
    ╚██████╔╝██║  ██╗███████╗  ██║        ██║  ██║██║ ╚═╝ ██║   ██║
     ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═╝        ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝
\`\`\`

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&duration=2500&pause=1000&color=00FF00&center=true&vCenter=true&width=900&lines=Welcome+to+OKEY-AMY+OS;AI%2FML+Engineer+%7C+Rapid+Prototyper;Code+Alchemist+%7C+Exploring+Rust+Learning+Daily;Full+Stack+Frameworks+with+Python+at+Core;Formulas+%3E+Spelling+%7C+I+love+doing+hard+things)](https://git.io/typing-svg)

</div>

---

## SYSTEM INFO

\`\`\`bash
$ neofetch --source banner.txt

okey@amy-os ~
──────────────
OS:      OkeyAmy Linux x86_64
Build:   ${today}-LTS
Status:  active (running)
Repos:   ${totalCount}
Focus:   AI/ML · Rapid prototyping · Rust
GitHub:  github.com/${CONFIG.username}
Contact: amaobiokeoma@gmail.com
\`\`\`

---

## TECH STACK

${generateTechStackSection(languages)}

---

## REPOSITORIES

${generateRepositorySection(featured)}

---

## ACTIVITY

<div align="center">

![Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=${CONFIG.username}&theme=github-dark&hide_border=true&bg_color=000000&color=00ff00&line=ff6b35&point=c9d1d9&area=true&area_color=00ff00)

</div>

---

## CONNECT

\`\`\`bash
$ cat /etc/okey-amy/contact.conf

github  = OkeyAmy
email   = amaobiokeoma@gmail.com
twitter = okey_amy
\`\`\`

<div align="center">

[GitHub](https://github.com/${CONFIG.username}) · [Email](mailto:amaobiokeoma@gmail.com) · [Twitter](https://twitter.com/okey_amy)

*Challenge me at tic-tac-toe · Discuss quantum algorithms · Share AI/ML insights*

</div>`;

  try {
    await fs.writeFile(CONFIG.readmePath, readmeContent);
    console.log('✅ README.md updated successfully!');
    console.log(`📄 Generated ${readmeContent.length} characters`);
    console.log(`📊 Featured ${featured.length} repositories`);
  } catch (error) {
    console.error('❌ Error writing README.md:', error.message);
    throw error;
  }
}
```

- [ ] **Step 2: Run unit tests to confirm they still all pass**

```bash
node scripts/test-local.js 2>&1 | head -40
```

Expected:
```
├── computeLanguageStats: ✓
├── generateTechStackSection: ✓
└── generateRepositorySection: ✓
```

- [ ] **Step 3: Run full integration test (requires .env with GITHUB_TOKEN)**

```bash
node scripts/test-local.js 2>&1
```

Expected: `✅ README.md updated successfully!` and no fake version strings in the output.

Verify the output README has no fake data:

```bash
grep -c "3.11.5\|5.2.2\|fake\|dummy" README.md
```

Expected: `0`

Verify sections are gone:

```bash
grep -c "streak-stats\|github-readme-stats.vercel.app/api?" README.md
```

Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add scripts/update-readme.js
git commit -m "feat: rewrite README template — neofetch block, real data, no bloat"
```

---

### Task 5: Final verification and cleanup

- [ ] **Step 1: Check README line count is under 100**

```bash
wc -l README.md
```

Expected: under 100 lines

- [ ] **Step 2: Verify no dead sections remain**

```bash
grep -E "SYSTEM STATUS|streak-stats|komarev|shields.io/badge/repos" README.md
```

Expected: no output (all removed)

- [ ] **Step 3: Verify all 4 expected sections are present**

```bash
grep -E "^## (SYSTEM INFO|TECH STACK|REPOSITORIES|ACTIVITY|CONNECT)" README.md
```

Expected:
```
## SYSTEM INFO
## TECH STACK
## REPOSITORIES
## ACTIVITY
## CONNECT
```

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "chore: regenerate README with new lean template"
```
