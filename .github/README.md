# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated CI/CD, testing, and deployment of BoxQ.

## 🚀 Workflows

### 1. **CI** (`ci.yml`)
**Triggers:** Push to main/develop, Pull Requests
**Purpose:** Continuous Integration testing

- **Test Matrix:** Node.js 18.x, 20.x, 21.x
- **Linting:** ESLint code quality checks
- **Unit Tests:** Full test suite with coverage
- **Integration Tests:** Real AWS SQS testing (with secrets)
- **Security Audit:** NPM audit and Snyk scanning
- **Build:** Documentation generation

### 2. **Release** (`release.yml`)
**Triggers:** Git tags (v*), Manual dispatch
**Purpose:** Automated NPM publishing

- **Testing:** Full test suite before release
- **Documentation:** Auto-generate docs
- **NPM Publish:** Automated package publishing
- **GitHub Release:** Create release with changelog
- **Coverage:** Upload to Codecov

### 3. **Examples** (`examples.yml`)
**Triggers:** Weekly schedule, Manual dispatch
**Purpose:** Validate example code

- **Syntax Check:** Validate all example files
- **Dependency Check:** Ensure examples use correct dependencies
- **Runtime Test:** Test examples with real AWS (timeout protected)

### 4. **Dependencies** (`dependencies.yml`)
**Triggers:** Weekly schedule, Manual dispatch
**Purpose:** Keep dependencies updated

- **Outdated Check:** Find outdated packages
- **Auto Update:** Update dependencies safely
- **Security Fix:** Apply security patches
- **PR Creation:** Auto-create update PRs

### 5. **Quality** (`quality.yml`)
**Triggers:** Push to main/develop, Pull Requests
**Purpose:** Code quality assurance

- **ESLint:** Code style and quality checks
- **Documentation:** Generate and validate docs
- **Coverage:** Enforce 80% coverage threshold
- **Formatting:** Check code formatting

### 6. **Performance** (`performance.yml`)
**Triggers:** Weekly schedule, Manual dispatch
**Purpose:** Performance monitoring

- **Performance Tests:** Run microservices and long polling tests
- **Benchmarks:** Measure initialization and creation times
- **Load Testing:** Validate under various conditions

## 🔐 Required Secrets

To enable all workflows, add these secrets to your GitHub repository:

### AWS Integration
```
AWS_ACCESS_KEY_ID          # AWS access key for SQS testing
AWS_SECRET_ACCESS_KEY      # AWS secret key for SQS testing
AWS_REGION                 # AWS region (optional, defaults to us-east-1)
SQS_QUEUE_URL             # SQS queue URL for testing
SQS_MESSAGE_GROUP_ID      # Message group ID for FIFO queues
```

### NPM Publishing
```
NPM_TOKEN                 # NPM authentication token
```

### Security Scanning
```
SNYK_TOKEN                # Snyk security scanning token (optional)
```

## 📊 Badges

Add these badges to your README.md:

```markdown
[![Build Status](https://github.com/mahajanankur/boxq/workflows/CI/badge.svg)](https://github.com/mahajanankur/boxq/actions)
[![Coverage Status](https://coveralls.io/repos/github/mahajanankur/boxq/badge.svg?branch=main)](https://coveralls.io/github/mahajanankur/boxq?branch=main)
[![NPM Version](https://img.shields.io/npm/v/boxq.svg)](https://www.npmjs.com/package/boxq)
[![License](https://img.shields.io/npm/l/boxq.svg)](https://github.com/mahajanankur/boxq/blob/main/LICENSE)
[![Node Version](https://img.shields.io/node/v/boxq.svg)](https://nodejs.org/)
```

## 🛠️ Local Development

To run the same checks locally:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests (requires AWS credentials)
npm run test:integration

# Generate documentation
npm run docs
```

## 📈 Monitoring

- **Build Status:** Check the Actions tab in GitHub
- **Coverage:** View on Codecov.io
- **Security:** Monitor Snyk dashboard
- **Performance:** Review weekly performance reports

## 🔧 Troubleshooting

### Common Issues

1. **Integration Tests Failing**
   - Ensure AWS credentials are set correctly
   - Verify SQS queue exists and is accessible
   - Check AWS region configuration

2. **Coverage Below Threshold**
   - Add more test cases
   - Check for untested code paths
   - Review coverage report for gaps

3. **Dependency Update Failures**
   - Review breaking changes in updated packages
   - Update code to handle API changes
   - Test thoroughly before merging

4. **Performance Degradation**
   - Review recent changes
   - Check for memory leaks
   - Optimize slow operations

## 🚀 Deployment

The release workflow automatically:
1. Runs all tests
2. Generates documentation
3. Publishes to NPM
4. Creates GitHub release
5. Uploads coverage data

To trigger a release:
```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or use GitHub UI workflow dispatch
```

## 📝 Contributing

When contributing to BoxQ:
1. Ensure all CI checks pass
2. Add tests for new features
3. Update documentation
4. Follow code style guidelines
5. Check performance impact
