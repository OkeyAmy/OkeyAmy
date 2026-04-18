#!/usr/bin/env node

/**
 * 🖥️ OKEY-AMY OS | Profile README Generator
 * Generates dynamic GitHub profile with live repository data
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const CONFIG = {
  username: process.env.GITHUB_USERNAME || 'OkeyAmy',
  token: process.env.GITHUB_TOKEN,
  readmePath: path.join(__dirname, '..', 'README.md'),
  baseUrl: 'https://api.github.com'
};

// GitHub API client
const github = axios.create({
  baseURL: CONFIG.baseUrl,
  headers: {
    'Authorization': `Bearer ${CONFIG.token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OkeyAmy-Profile-Generator/1.0'
  }
});

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

/**
 * Generate the complete README content
 */
async function generateReadme() {
  console.log('🚀 Starting README generation...');
  
  const { featured: repos, languages, totalCount } = await fetchData();

  const readmeContent = `# 🖥️ OKEY-AMY OS | Build ${new Date().toISOString().split('T')[0]}-LTS

\`\`\`bash
[    0.000000] Booting Okey-Amy Linux 6.10.3-arch1-1 (tty1)
[    0.234891] Initializing GitHub API drivers... [ OK ]
[    0.445623] Mounting /dev/repositories... scanning...
[    0.672145] Loading user profile from matrix.local... authenticated
[    0.891337] Starting system services...
[    1.042689] All systems operational. Welcome, user.
\`\`\`

<div align="center">

\`\`\`
     ██████╗ ██╗  ██╗███████╗██╗   ██╗     █████╗ ███╗   ███╗██╗   ██╗
    ██╔═══██╗██║ ██╔╝██╔════╝██╗ ██╔╝     ██╔══██╗████╗ ████║╚██╗ ██╔╝
    ██║   ██║█████╔╝ █████╗  ╚████╔╝█████╗███████║██╔████╔██║ ╚████╔╝ 
    ██║   ██║██╔═██╗ ██╔══╝   ╚██╔╝ ╚════╝██╔══██║██║╚██╔╝██║  ╚██╔╝  
    ╚██████╔╝██║  ██╗███████╗  ██║        ██║  ██║██║ ╚═╝ ██║   ██║   
     ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═╝        ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   
                                                                       
                    AI/ML Engineer | Rapid Prototyper | Code Alchemist
\`\`\`

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&duration=2500&pause=1000&color=00FF00&center=true&vCenter=true&width=900&lines=Welcome+to+OKEY-AMY+OS;AI%2FML+Engineer+%7C+Rapid+Prototyper;Code+Alchemist+%7C+Exploring+Rust+Learning+Daily;Full+Stack+Frameworks+with+Python+at+Core;Formulas+%3E+Spelling+%7C+I+love+doing+hard+things)](https://git.io/typing-svg)

</div>

---

## 📊 SYSTEM STATUS

\`\`\`bash
$ systemctl status okey-amy.service
● okey-amy.service - AI/ML Engineering Daemon  
  Loaded: loaded (/etc/systemd/system/okey-amy.service; enabled)
  Active: active (running) since ${new Date().toISOString().split('T')[0]} 10:18:53 WAT; ongoing
  Process: 1337 ExecStart=/usr/bin/python3 -m okey_amy.core
Main PID: 1337 (python3)
   Tasks: 8 (limit: infinity)
  Memory: 4.2G
   CGroup: /system.slice/okey-amy.service

● Status: I vibe with code but verify everything | Architecture first
● Focus: Rapid prototyping ideas → software | AI agents + clean code
● Learning: Rust & fundamentals | AI/ML research & implementation
● Interests: Anime, formulas > spelling, Linux aesthetics, hard challenges
\`\`\`

<div align="center">

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${CONFIG.username}&show_icons=true&theme=dark&hide_border=true&bg_color=000000&title_color=00ff00&text_color=c9d1d9&icon_color=00ff00&count_private=true&include_all_commits=true&ring_color=00ff00)

![GitHub Streak](https://streak-stats.demolab.com/?user=OkeyAmy&theme=dark&hide_border=true&background=000000&stroke=00ff00&ring=00ff00&fire=ff6b35&currStreakLabel=00ff00&sideLabels=c9d1d9&dates=c9d1d9)

</div>

---

## 📦 TECH STACK | PACKAGE MANAGER

<div align="center">

![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=${CONFIG.username}&layout=donut&theme=dark&hide_border=true&bg_color=000000&title_color=00ff00&text_color=c9d1d9&langs_count=8&size_weight=0.5&count_weight=0.5)

</div>

${generateTechStackSection(languages)}

---

## 🌐 REPOSITORY INDEX | FEATURED PROJECTS

${generateRepositorySection(repos)}

---

## 🔥 LIVE ACTIVITY

<div align="center">

![Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=${CONFIG.username}&theme=github-dark&hide_border=true&bg_color=000000&color=00ff00&line=ff6b35&point=c9d1d9&area=true&area_color=00ff00)

</div>

---

## Metrics

<div align="center">

![Profile Views](https://komarev.com/ghpvc/?username=${CONFIG.username}&style=flat-square&color=brightgreen&label=visitors)
![Followers](https://img.shields.io/github/followers/${CONFIG.username}?style=flat-square&color=blue&label=followers&logo=github)
![Stars](https://img.shields.io/github/stars/${CONFIG.username}?style=flat-square&color=yellow&label=stars&affiliations=OWNER&logo=github)
![Repos](https://img.shields.io/badge/repos-${totalCount}-green?style=flat-square)

</div>

---

## Connect

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-${CONFIG.username}-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/${CONFIG.username})
[![Email](https://img.shields.io/badge/Email-amaobiokeoma%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white&labelColor=0d1117)](mailto:amaobiokeoma@gmail.com)
[![Twitter](https://img.shields.io/badge/Twitter-okey__amy-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white&labelColor=0d1117)](https://twitter.com/okey_amy)

**Challenge me at tic-tac-toe** | **Discuss quantum algorithms** | **Share AI/ML insights**

</div>`;

  try {
    await fs.writeFile(CONFIG.readmePath, readmeContent);
    console.log('✅ README.md updated successfully!');
    console.log(`📄 Generated ${readmeContent.length} characters`);
    console.log(`📊 Featured ${repos.length} repositories (${totalCount} total)`);
  } catch (error) {
    console.error('❌ Error writing README.md:', error.message);
    throw error;
  }
}

// Export for testing
module.exports = { generateReadme, computeLanguageStats, generateTechStackSection, generateRepositorySection, CONFIG };

// Run if called directly
if (require.main === module) {
  generateReadme().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}