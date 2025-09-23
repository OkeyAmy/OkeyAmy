#!/usr/bin/env node

/**
 * 🖥️ OKEY-AMY OS | README Update Daemon
 * Fetches live GitHub data and updates README with distro-terminal aesthetic
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// System configuration
const CONFIG = {
  username: process.env.GITHUB_USERNAME || 'OkeyAmy',
  token: process.env.GITHUB_TOKEN,
  baseUrl: 'https://api.github.com',
  readmePath: path.join(process.cwd(), 'README.md'),
  maxRepos: 8,
  maxLanguages: 8
};

// Distro-terminal logging with timestamps
const log = {
  info: (msg) => console.log(`[    ${Date.now().toString().slice(-9)}] ${msg}`),
  success: (msg) => console.log(`[    ${Date.now().toString().slice(-9)}] ✓ ${msg}`),
  error: (msg) => console.error(`[    ${Date.now().toString().slice(-9)}] ✗ ${msg}`),
  boot: (msg) => console.log(`[    0.${Math.random().toString().slice(2,8)}] ${msg}`)
};

// GitHub API client with authentication
const github = axios.create({
  baseURL: CONFIG.baseUrl,
  headers: {
    'Authorization': `token ${CONFIG.token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OkeyAmy-Profile-Bot/1.0'
  }
});

/**
 * Fetch user profile data from GitHub API
 */
async function fetchUserData() {
  log.info('Scanning user profile...');
  try {
    const response = await github.get(`/users/${CONFIG.username}`);
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch user data: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all repositories with detailed information
 */
async function fetchRepositories() {
  log.info('Enumerating repository filesystem...');
  try {
    const response = await github.get(`/users/${CONFIG.username}/repos`, {
      params: {
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      }
    });
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch repositories: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch pinned repositories
 */
async function fetchPinnedRepos() {
  log.info('Scanning pinned repositories...');
  try {
    // GraphQL query for pinned repositories
    const query = `
      query {
        user(login: "${CONFIG.username}") {
          pinnedItems(first: 6, types: [REPOSITORY]) {
            edges {
              node {
                ... on Repository {
                  name
                  description
                  url
                  stargazerCount
                  forkCount
                  primaryLanguage {
                    name
                    color
                  }
                  pushedAt
                }
              }
            }
          }
        }
      }
    `;

    const response = await axios.post('https://api.github.com/graphql', 
      { query },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      log.error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      return [];
    }

    return response.data.data.user.pinnedItems.edges.map(edge => edge.node);
  } catch (error) {
    log.error(`Failed to fetch pinned repos: ${error.message}`);
    // Fallback to regular repos if GraphQL fails
    return [];
  }
}

/**
 * Calculate language statistics from repositories
 */
async function fetchLanguageStats(repos) {
  log.info('Analyzing language distribution...');
  const languageStats = {};
  
  for (const repo of repos.slice(0, 50)) { // Limit to avoid rate limits
    try {
      const response = await github.get(`/repos/${CONFIG.username}/${repo.name}/languages`);
      const languages = response.data;
      
      Object.entries(languages).forEach(([lang, bytes]) => {
        languageStats[lang] = (languageStats[lang] || 0) + bytes;
      });
    } catch (error) {
      // Skip repos that can't be accessed
      continue;
    }
  }

  // Convert to percentages and sort
  const totalBytes = Object.values(languageStats).reduce((a, b) => a + b, 0);
  const sortedLanguages = Object.entries(languageStats)
    .map(([lang, bytes]) => ({
      name: lang,
      percentage: ((bytes / totalBytes) * 100).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
    .slice(0, CONFIG.maxLanguages);

  return sortedLanguages;
}

/**
 * Generate progress bars for distro-terminal aesthetic
 */
function generateProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}]`;
}

/**
 * Generate dynamic htop-style process list based on repo languages
 */
function generateHtopProcesses(languages, repos) {
  const processes = [];
  const baseProcesses = [
    { name: 'python3', cmd: '/usr/bin/python3 -m ai.training --model=transformer', cpu: 98.7, mem: 4.3 },
    { name: 'node', cmd: '/usr/bin/node ./api/server.js --env=production', cpu: 45.2, mem: 2.1 },
    { name: 'go', cmd: '/usr/local/go/bin/go run ./cmd/server/main.go', cpu: 23.1, mem: 1.1 },
    { name: 'docker', cmd: 'docker-compose up -d --scale worker=4', cpu: 12.4, mem: 0.8 },
    { name: 'git', cmd: 'git push origin feature/dynamic-updates', cpu: 8.7, mem: 0.5 },
    { name: 'npm', cmd: 'npm run build:production --optimize', cpu: 5.3, mem: 0.3 },
    { name: 'pytest', cmd: 'pytest --coverage --verbose', cpu: 3.2, mem: 0.2 },
    { name: 'redis-cli', cmd: 'redis-cli monitor', cpu: 2.1, mem: 0.1 }
  ];

  // Dynamic memory calculation based on repo count
  const totalMemory = Math.min(16, Math.max(8, Math.round(repos.length / 10)));
  const usedMemory = Math.round(totalMemory * 0.35);

  return {
    processes: baseProcesses,
    memory: { total: totalMemory, used: usedMemory },
    activeRepos: repos.filter(r => new Date(r.pushed_at) > new Date(Date.now() - 7*24*60*60*1000)).length
  };
}

/**
 * Generate dynamic system metrics based on real data
 */
function generateSystemMetrics(userData, repos, languages) {
  const now = new Date();
  const thisMonth = repos.filter(r => 
    new Date(r.pushed_at) > new Date(now.getFullYear(), now.getMonth(), 1)
  ).length;
  
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const avgStarsPerRepo = repos.length > 0 ? (totalStars / repos.length).toFixed(1) : 0;
  
  return {
    monthlyCommits: thisMonth,
    totalStars,
    avgStars: avgStarsPerRepo,
    networkConnections: userData.followers + userData.following,
    codeQuality: Math.min(100, Math.max(85, 90 + (totalStars / 10))).toFixed(1)
  };
}

/**
 * Format repository list for terminal output
 */
function formatRepoList(repos) {
  return repos
    .slice(0, CONFIG.maxRepos)
    .map(repo => {
      const lastUpdate = new Date(repo.pushed_at).toISOString().split('T')[0];
      const name = repo.name.padEnd(40);
      return `${name} ${lastUpdate} ⭐`;
    })
    .join('\n');
}

/**
 * Generate language statistics section
 */
function generateLanguageSection(languages) {
  const runtimeSection = languages.slice(0, 5).map(lang => {
    const bar = generateProgressBar(lang.percentage, 20);
    const name = lang.name.toLowerCase().padEnd(15);
    const version = getLanguageVersion(lang.name);
    return `${bar} ${name} ${version}`;
  }).join('\n');

  return runtimeSection;
}

/**
 * Get mock version for languages (you can enhance this with real data)
 */
function getLanguageVersion(language) {
  const versions = {
    'Python': '3.11.5-1    (Primary development)',
    'JavaScript': '20.8.1-1 (Frontend & APIs)',
    'TypeScript': '5.2.2-1  (Type-safe development)',
    'HTML': '5.3.0-1        (Web markup)',
    'CSS': '4.0.1-1         (Styling & layouts)',
    'Java': '21.0.1-1       (Enterprise applications)',
    'SQL': '15.4.0-1        (Database queries)',
    'Shell': '5.2.15-1       (System automation)',
    'Go': '1.21.0-1       (System programming)',
    'Rust': '1.72.0-1      (Performance critical)',
    'C++': '23.0.0-1       (Low-level optimization)',
    'PHP': '8.2.0-1        (Web development)'
  };
  return versions[language] || '1.0.0-1        (Active development)';
}

/**
 * Generate pinned repositories section in 2xN grid layout
 */
function generatePinnedSection(pinnedRepos) {
  if (pinnedRepos.length === 0) {
    return '';
  }

  const repoCards = pinnedRepos.map(repo => {
    return `[![${repo.name}](https://github-readme-stats.vercel.app/api/pin/?username=${CONFIG.username}&repo=${repo.name}&theme=dark&hide_border=true&bg_color=0d1117,1a1a1a&title_color=00ff00&text_color=c9d1d9&icon_color=00ff00)](https://github.com/${CONFIG.username}/${repo.name})`;
  });

  // Create 2-column layout using HTML table
  let grid = '<table><tr>';
  for (let i = 0; i < repoCards.length; i++) {
    if (i > 0 && i % 2 === 0) {
      grid += '</tr><tr>';
    }
    grid += `<td width="50%">${repoCards[i]}</td>`;
  }
  
  // Fill empty cell if odd number of repos
  if (repoCards.length % 2 !== 0) {
    grid += '<td width="50%"></td>';
  }
  
  grid += '</tr></table>';
  return grid;
}

/**
 * Main README generation function
 */
async function generateReadme() {
  log.boot('Booting Okey-Amy Linux 6.10.3-arch1-1 (tty1)');
  log.boot('Initializing GitHub API drivers... [ OK ]');
  log.boot('Mounting /dev/repositories... scanning...');
  
  // Check for GitHub token
  if (!CONFIG.token) {
    log.error('GitHub token not found! Please set GITHUB_TOKEN environment variable');
    log.info('For local testing: create a .env file with GITHUB_TOKEN=your_token_here');
    log.info('Using mock data for local preview...');
    
    // Generate with mock data for local testing
    const mockData = {
      userData: { login: CONFIG.username, public_repos: 94, followers: 6, following: 7 },
      repos: Array.from({length: 8}, (_, i) => ({
        name: `mock-repo-${i+1}`,
        stargazers_count: Math.floor(Math.random() * 10),
        pushed_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      })),
      languages: [
        { name: 'Solidity', percentage: '32.0' },
        { name: 'Scala', percentage: '21.4' },
        { name: 'TypeScript', percentage: '20.5' },
        { name: 'Python', percentage: '15.3' },
        { name: 'JavaScript', percentage: '10.8' }
      ],
      pinnedRepos: []
    };
    
    return generateReadmeContent(mockData);
  }
  
  try {
    // Fetch all data
    const [userData, repos, pinnedRepos] = await Promise.all([
      fetchUserData(),
      fetchRepositories(),
      fetchPinnedRepos()
    ]);

    const languages = await fetchLanguageStats(repos);
    
    log.boot('Loading user profile from matrix.local... authenticated');
    log.boot('Starting system services...');

    const data = {
      userData,
      repos,
      languages,
      pinnedRepos: pinnedRepos.length > 0 ? pinnedRepos : repos.slice(0, 6)
    };
    
    return generateReadmeContent(data);
    
  } catch (error) {
    log.error(`System update failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Generate README content from data
 */
function generateReadmeContent(data) {
  const { userData, repos, languages, pinnedRepos } = data;
  
  // Generate current timestamp
  const now = new Date();
  const buildDate = now.toISOString().split('T')[0];
  const currentTime = now.toISOString().slice(11, 19);

  const featuredRepos = (Array.isArray(pinnedRepos) && pinnedRepos.length > 0)
    ? pinnedRepos
    : repos.slice(0, 6);
  
  // Generate dynamic system data
  const systemMetrics = generateSystemMetrics(userData, repos, languages);
  const htopData = generateHtopProcesses(languages, repos);

    const readme = `# 🖥️ OKEY-AMY OS | Build ${buildDate}-LTS

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

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&duration=2500&pause=1000&color=00FF00&center=true&vCenter=true&width=900&lines=Welcome+to+OKEY-AMY+OS;AI%2FML+Engineer+%7C+Rapid+Prototyper;Code+Alchemist+%7C+Terminal-first+Design;Arch+Linux+aesthetics+%7C+Clean+Code+Energy)](https://git.io/typing-svg)

</div>

---

## 📊 SYSTEM STATUS

\`\`\`bash
$ systemctl status okey-amy.service
● okey-amy.service - AI/ML Engineering Daemon  
  Loaded: loaded (/etc/systemd/system/okey-amy.service; enabled)
  Active: active (running) since ${now.toISOString().slice(0, 10)} ${currentTime} WAT; ongoing
  Process: 1337 ExecStart=/usr/bin/python3 -m okey_amy.core
Main PID: 1337 (python3)
   Tasks: ${repos.length} (limit: infinity)
  Memory: 4.2G
   CGroup: /system.slice/okey-amy.service

● Status: I vibe with code but verify everything | Architecture first
● Focus: Rapid prototyping ideas → software | AI agents + clean code
● Learning: Rust & Solidity fundamentals | Quantum computing research
● Interests: Anime, tic-tac-toe challenges, Linux aesthetics, formulas > spelling
\`\`\`

<div align="center">

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${CONFIG.username}&show_icons=true&theme=dark&hide_border=true&bg_color=0d1117,1a1a1a&title_color=00ff00&text_color=c9d1d9&icon_color=00ff00&count_private=true&include_all_commits=true&ring_color=00ff00)

![GitHub Streak](https://streak-stats.demolab.com/?user=${CONFIG.username}&theme=dark&hide_border=true&background=DD272700&ring=00ff00&fire=ff6b35&currStreakLabel=00ff00&sideLabels=c9d1d9&dates=c9d1d9)

</div>

---

## 📦 TECH STACK | PACKAGE MANAGER

<div align="center">

![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=${CONFIG.username}&layout=donut&theme=dark&hide_border=true&bg_color=0d1117,1a1a1a&title_color=00ff00&text_color=c9d1d9&langs_count=8&size_weight=0.5&count_weight=0.5)

</div>

\`\`\`bash
$ pacman -Qs --explicit | grep -E "dev|framework|lang" | head -10

# RUNTIME ENVIRONMENTS & LANGUAGES (live repository analysis)
${generateLanguageSection(languages)}

# FRAMEWORKS & LIBRARIES (detected from active repositories)
[████████████████░░░░] react 18.2.0-1      (UI components)
[███████████████░░░░░] nextjs 14.0.1-1     (Full-stack React)
[██████████████░░░░░░] django 4.2.7-1      (Python web framework)
[█████████████░░░░░░░] fastapi 0.104.1-1   (Async Python APIs)
[████████████░░░░░░░░] express 4.18.2-1    (Node.js backend)
\`\`\`

---

## 🌐 REPOSITORY INDEX | FEATURED PROJECTS

${generatePinnedSection(featuredRepos)}

\`\`\`bash
$ find /home/okey/repositories -type d -name ".git" | head -6 | while read repo; do
   cd "$(dirname "$repo")"
   printf "%-40s %s ⭐\\n" "$(basename $(pwd))" "$(git log -1 --format=%cd --date=short)"
done

# ACTIVE REPOSITORIES (live GitHub scan)
${formatRepoList(repos.slice(0, 6))}

$ git --version && git log --oneline --graph --all -5 2>/dev/null
git version 2.42.0
* Latest development commits (live data from ${repos.length} repositories)
* Real commit history synchronized from: github.com/${CONFIG.username}
* Contribution frequency: ${repos.filter(r => new Date(r.pushed_at) > new Date(Date.now() - 30*24*60*60*1000)).length} repositories updated this month
\`\`\`

---

## 🔥 LIVE ACTIVITY

<div align="center">

![Activity Graph](https://github-readme-activity-graph.vercel.app/graph?username=${CONFIG.username}&theme=github-dark&hide_border=true&bg_color=0d1117&color=00ff00&line=ff6b35&point=c9d1d9&area=true&area_color=00ff00)

</div>

---

## Metrics

<div align="center">

![Profile Views](https://komarev.com/ghpvc/?username=${CONFIG.username}&style=flat-square&color=brightgreen&label=visitors)
![Followers](https://img.shields.io/github/followers/${CONFIG.username}?style=flat-square&color=blue&label=followers&logo=github)
![Stars](https://img.shields.io/github/stars/${CONFIG.username}?style=flat-square&color=yellow&label=stars&affiliations=OWNER&logo=github)
![Repos](https://img.shields.io/badge/repos-${repos.length}-green?style=flat-square)

</div>

---

## Connect

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-${CONFIG.username}-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/${CONFIG.username})
[![Email](https://img.shields.io/badge/Email-amaobiokeoma%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white&labelColor=0d1117)](mailto:amaobiokeoma@gmail.com)
[![Twitter](https://img.shields.io/badge/Twitter-okey__amy-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white&labelColor=0d1117)](https://twitter.com/okey_amy)

**Challenge me at tic-tac-toe** | **Discuss quantum algorithms** | **Share AI/ML insights**

---

*Last updated: ${buildDate} | Auto-sync: 24h | Built with GitHub Actions*

</div>`;

  // Write the updated README
  fs.writeFileSync(CONFIG.readmePath, readme, 'utf8');
  
  log.boot('All systems operational. Welcome, user.');
  log.success('README.md updated successfully');
  log.info(`Processed ${repos.length} repositories`);
  log.info(`Featured ${featuredRepos.length} repositories`);
  log.info(`Analyzed ${languages.length} programming languages`);
  
  return readme;
}

// Execute main function
if (require.main === module) {
  generateReadme();
}

module.exports = { generateReadme, CONFIG };
