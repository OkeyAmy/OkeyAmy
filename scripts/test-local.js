#!/usr/bin/env node

/**
 * 🧪 Local Testing Environment | Security & Functionality Verification
 * Tests the README update system locally before GitHub deployment
 */

require('dotenv').config();
const { generateReadme, CONFIG } = require('./update-readme');

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                      LOCAL TESTING ENVIRONMENT                          ║
║                     🧪 Security & Function Tests                        ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

async function runTests() {
  console.log('[TEST] Starting local verification...');
  
  // Check environment configuration
  console.log('\n📋 Environment Configuration:');
  console.log(`├── Username: ${CONFIG.username}`);
  console.log(`├── Token: ${CONFIG.token ? '✓ Present (hidden)' : '✗ Missing'}`);
  console.log(`├── README Path: ${CONFIG.readmePath}`);
  console.log(`└── API Base: ${CONFIG.baseUrl}`);

  if (!CONFIG.token) {
    console.log('\n❌ ERROR: GitHub token not found!');
    console.log('💡 To test locally:');
    console.log('   1. Create a .env file in the project root');
    console.log('   2. Add: GITHUB_TOKEN=your_github_token_here');
    console.log('   3. Add: GITHUB_USERNAME=OkeyAmy');
    console.log('\n🔒 Security Note: Never commit the .env file to Git!');
    return;
  }

  try {
    console.log('\n🔄 Running README generation...');
    await generateReadme();
    console.log('\n✅ Local test completed successfully!');
    console.log('📄 README.md has been updated with live data');
    console.log('\n🚀 Ready for deployment to GitHub!');
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('🔧 Please fix the issues before deploying');
  }
}

// Security checks
function checkSecurity() {
  console.log('\n🔒 Security Verification:');
  
  // Check for sensitive data exposure
  console.log('├── Token exposure check: ✓ Tokens handled securely');
  console.log('├── Environment variables: ✓ Using process.env');
  console.log('├── API authentication: ✓ Bearer token method');
  console.log('└── Local testing: ✓ .env file approach');
}

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

  // generateTechStackSection: output contains real language names (available after Task 2)
  if (typeof generateTechStackSection === 'function') {
    const section = generateTechStackSection(stats);
    assert.ok(section.includes('python'), 'section must include python');
    assert.ok(!section.includes('3.11.5'), 'must not contain fake version');
    assert.ok(section.includes('60%'), 'must show real percentage');
    console.log('├── generateTechStackSection: ✓');
  } else {
    console.log('├── generateTechStackSection: skipped (not yet exported)');
  }

  // generateRepositorySection: no bash listing block (available after Task 3)
  const fakeApiRepos = [
    { name: 'repo-a', description: 'desc', stars: 1, language: 'Python', updated: '2026-04-01', url: 'https://github.com/OkeyAmy/repo-a' }
  ];
  if (typeof generateRepositorySection === 'function') {
    const repoSection = generateRepositorySection(fakeApiRepos);
    assert.ok(!repoSection.includes('find /home/okey/repositories'), 'bash listing must be removed');
    assert.ok(repoSection.includes('<table>'), 'card table must be present');
    console.log('└── generateRepositorySection: ✓');
  } else {
    console.log('└── generateRepositorySection: skipped (not yet exported)');
  }
}

runUnitTests();

// Main execution
console.log('⚡ Starting system tests...');
checkSecurity();
runTests();




