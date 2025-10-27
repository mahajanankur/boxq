#!/usr/bin/env node

/**
 * Test GitHub Actions workflows locally
 * This script simulates the CI/CD pipeline locally
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing GitHub Actions Workflows Locally\n');

const workflows = [
  {
    name: 'Linting',
    command: 'npm run lint',
    description: 'Check code quality with ESLint'
  },
  {
    name: 'Unit Tests',
    command: 'npm test',
    description: 'Run unit test suite'
  },
  {
    name: 'Test Coverage',
    command: 'npm run test:coverage',
    description: 'Run tests with coverage reporting'
  },
  {
    name: 'Documentation',
    command: 'npm run docs',
    description: 'Generate documentation'
  },
  {
    name: 'Security Audit',
    command: 'npm audit --audit-level moderate',
    description: 'Check for security vulnerabilities'
  }
];

async function runWorkflow(workflow) {
  console.log(`\n📋 ${workflow.name}`);
  console.log(`   ${workflow.description}`);
  console.log(`   Command: ${workflow.command}`);
  
  try {
    const startTime = Date.now();
    execSync(workflow.command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    const duration = Date.now() - startTime;
    console.log(`   ✅ ${workflow.name} completed in ${duration}ms`);
    return true;
  } catch (error) {
    console.log(`   ❌ ${workflow.name} failed: ${error.message}`);
    return false;
  }
}

async function checkFiles() {
  console.log('\n📁 Checking Required Files');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'src/index.js',
    '.github/workflows/ci.yml',
    '.github/workflows/release.yml',
    '.github/workflows/examples.yml',
    '.github/workflows/dependencies.yml',
    '.github/workflows/quality.yml',
    '.github/workflows/performance.yml'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - Missing`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

async function checkSecrets() {
  console.log('\n🔐 Checking Environment Variables');
  
  const requiredSecrets = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SQS_QUEUE_URL',
    'SQS_MESSAGE_GROUP_ID'
  ];
  
  let allSecretsPresent = true;
  
  for (const secret of requiredSecrets) {
    if (process.env[secret]) {
      console.log(`   ✅ ${secret} - Set`);
    } else {
      console.log(`   ⚠️  ${secret} - Not set (required for integration tests)`);
      allSecretsPresent = false;
    }
  }
  
  return allSecretsPresent;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('🧪 BoxQ GitHub Actions Workflow Testing');
  console.log('=' .repeat(60));
  
  // Check files
  const filesOk = await checkFiles();
  
  // Check secrets
  const secretsOk = await checkSecrets();
  
  if (!filesOk) {
    console.log('\n❌ Missing required files. Please ensure all files are present.');
    process.exit(1);
  }
  
  // Run workflows
  let allPassed = true;
  
  for (const workflow of workflows) {
    const passed = await runWorkflow(workflow);
    if (!passed) {
      allPassed = false;
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  
  if (allPassed) {
    console.log('✅ All workflows passed!');
    console.log('🚀 Ready for GitHub Actions deployment');
  } else {
    console.log('❌ Some workflows failed');
    console.log('🔧 Please fix the issues before deploying');
  }
  
  if (!secretsOk) {
    console.log('\n⚠️  Note: Some environment variables are missing');
    console.log('   Integration tests will be skipped in GitHub Actions');
    console.log('   Set the required secrets in your GitHub repository');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('   1. Push changes to GitHub');
  console.log('   2. Set up repository secrets');
  console.log('   3. Enable GitHub Actions');
  console.log('   4. Create your first release!');
  
  process.exit(allPassed ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

// Run the test
main().catch(console.error);
