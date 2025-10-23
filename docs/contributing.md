# Contributing to BoxQ

Thank you for your interest in contributing to BoxQ! 🚀

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)
- [Testing](#testing)
- [Release Process](#release-process)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to creating a positive environment include:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior include:**

- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** 2.0.0 or higher
- **AWS Account** (for testing)

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/mahajanankur/boxq.git
   cd boxq
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up development environment**
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Edit environment variables
   nano .env
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

---

## Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- **Bug Reports** - Report bugs and issues
- **Feature Requests** - Suggest new features
- **Code Contributions** - Submit code improvements
- **Documentation** - Improve documentation
- **Examples** - Add usage examples
- **Tests** - Add or improve tests
- **Performance** - Optimize performance
- **Security** - Report security issues

### Contribution Process

1. **Check existing issues** - Look for existing issues or discussions
2. **Create an issue** - If no existing issue, create one to discuss
3. **Fork the repository** - Create your own fork
4. **Create a branch** - Create a feature branch
5. **Make changes** - Implement your changes
6. **Add tests** - Ensure your changes are tested
7. **Update documentation** - Update relevant documentation
8. **Submit a pull request** - Submit your changes for review

---

## Development Setup

### Environment Setup

```bash
# Install dependencies
npm install

# Install development dependencies
npm install --save-dev

# Set up pre-commit hooks
npm run prepare
```

### Development Scripts

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Build project
npm run build

# Generate documentation
npm run docs

# Run development server
npm run dev
```

### Code Style

We use ESLint for code style enforcement. Please ensure your code follows the established style:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

### Testing

All contributions must include tests. We aim for 100% test coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/core/CircuitBreaker.test.js

# Run tests in watch mode
npm run test:watch
```

---

## Pull Request Process

### Before Submitting

1. **Check existing issues** - Ensure no duplicate issues exist
2. **Create an issue** - Discuss your changes in an issue first
3. **Fork and branch** - Create a feature branch from main
4. **Make changes** - Implement your changes
5. **Add tests** - Ensure all changes are tested
6. **Update documentation** - Update relevant documentation
7. **Run tests** - Ensure all tests pass
8. **Check coverage** - Ensure test coverage is maintained

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved

## Checklist
- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or clearly documented)

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks** - CI/CD pipeline runs automatically
2. **Code review** - Maintainers review the code
3. **Testing** - Ensure all tests pass
4. **Documentation** - Verify documentation is updated
5. **Approval** - Maintainers approve the changes
6. **Merge** - Changes are merged into main branch

---

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. **Clear description** - What happened vs. what you expected
2. **Steps to reproduce** - Detailed steps to reproduce the issue
3. **Environment details** - Node.js version, OS, etc.
4. **Error messages** - Full error messages and stack traces
5. **Code examples** - Minimal code examples that reproduce the issue

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- Node.js version: [e.g. 16.14.0]
- npm version: [e.g. 8.3.1]
- OS: [e.g. macOS 12.0, Windows 10, Ubuntu 20.04]
- BoxQ version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.

## Code Example
```javascript
// Minimal code example that reproduces the issue
const { BoxQ } = require('boxq');
// ... your code here
```
```

### Feature Requests

When requesting features, please include:

1. **Clear description** - What feature you'd like to see
2. **Use case** - Why this feature would be useful
3. **Proposed solution** - How you think it should work
4. **Alternatives** - Other solutions you've considered
5. **Additional context** - Any other relevant information

### Feature Request Template

```markdown
## Feature Description
A clear and concise description of the feature you'd like to see.

## Use Case
Describe the use case for this feature. Why would it be useful?

## Proposed Solution
Describe how you think this feature should work.

## Alternatives
Describe any alternative solutions or workarounds you've considered.

## Additional Context
Add any other context or screenshots about the feature request here.
```

---

## Documentation

### Documentation Guidelines

- **Clear and concise** - Write clear, concise documentation
- **Examples** - Include code examples where appropriate
- **Up-to-date** - Keep documentation current with code changes
- **Consistent** - Follow the established documentation style
- **Comprehensive** - Cover all aspects of the feature

### Documentation Types

1. **API Documentation** - JSDoc comments for all public APIs
2. **README Updates** - Update README for new features
3. **Example Code** - Add examples for new features
4. **Best Practices** - Document best practices and patterns
5. **Migration Guides** - Document breaking changes

### Writing Documentation

```javascript
/**
 * Creates a message publisher for a specific queue
 * @param {string} queueUrl - Queue URL
 * @param {Object} [options] - Publisher options
 * @param {string} [options.messageGroupId] - Default message group ID
 * @param {boolean} [options.enableDeduplication=true] - Enable content-based deduplication
 * @param {string} [options.deduplicationStrategy='content'] - Deduplication strategy
 * @returns {MessagePublisher} Message publisher instance
 * @example
 * const publisher = sqs.createPublisher('my-queue.fifo', {
 *   messageGroupId: 'group-1',
 *   enableDeduplication: true
 * });
 */
createPublisher = (queueUrl, options = {}) => {
  // Implementation
};
```

---

## Testing

### Test Requirements

- **100% Coverage** - All code must be tested
- **Unit Tests** - Test individual functions and methods
- **Integration Tests** - Test component interactions
- **End-to-End Tests** - Test complete workflows
- **Performance Tests** - Test performance characteristics

### Test Structure

```
tests/
├── core/                    # Core component tests
│   ├── CircuitBreaker.test.js
│   ├── RetryManager.test.js
│   ├── SQSClient.test.js
│   └── HealthMonitor.test.js
├── publishers/              # Publisher tests
│   ├── MessagePublisher.test.js
│   └── BatchPublisher.test.js
├── consumers/               # Consumer tests
│   ├── MessageConsumer.test.js
│   └── ProcessingEngine.test.js
├── integration/             # Integration tests
│   ├── end-to-end.test.js
│   └── performance.test.js
└── setup.js                # Test setup
```

### Writing Tests

```javascript
describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      timeout: 1000
    });
  });

  describe('canExecute', () => {
    it('should allow execution when circuit is closed', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should not allow execution when circuit is open', () => {
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure();
      }
      expect(circuitBreaker.canExecute()).toBe(false);
    });
  });
});
```

---

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Steps

1. **Update version** - Update version in package.json
2. **Update changelog** - Update CHANGELOG.md
3. **Create release branch** - Create release branch
4. **Run tests** - Ensure all tests pass
5. **Build project** - Build the project
6. **Create release** - Create GitHub release
7. **Publish to npm** - Publish to npm registry
8. **Update documentation** - Update documentation

### Release Checklist

- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] GitHub release created
- [ ] npm package published
- [ ] Documentation deployed

---

## Community Guidelines

### Communication

- **Be respectful** - Treat everyone with respect
- **Be constructive** - Provide constructive feedback
- **Be patient** - Be patient with newcomers
- **Be helpful** - Help others when you can

### Getting Help

- **GitHub Issues** - For bug reports and feature requests
- **Discord Community** - For general discussion and help
- **Stack Overflow** - For technical questions
- **Email Support** - For enterprise support

### Recognition

Contributors are recognized in:

- **README** - Listed in contributors section
- **Release Notes** - Mentioned in release notes
- **GitHub** - Listed in contributors
- **Documentation** - Credited in documentation

---

## Security

### Security Issues

If you discover a security issue, please:

1. **Do not** create a public issue
2. **Email** security@boxq.com
3. **Include** detailed information about the issue
4. **Wait** for response before public disclosure

### Security Guidelines

- **Never** commit secrets or credentials
- **Always** validate input data
- **Use** secure coding practices
- **Follow** security best practices
- **Report** security issues responsibly

---

## License

By contributing to BoxQ, you agree that your contributions will be licensed under the MIT License.

---

## Thank You

Thank you for contributing to BoxQ! Your contributions help make this project better for everyone.

### Contributors

- [@mahajanankur](https://github.com/mahajanankur) - Core maintainer
- [@contributor1](https://github.com/contributor1) - Documentation
- [@contributor2](https://github.com/contributor2) - Testing
- [@contributor3](https://github.com/contributor3) - Performance

### Special Thanks

- **AWS SQS Team** - For the excellent SQS service
- **BBC** - For the original sqs-consumer inspiration
- **Open Source Community** - For feedback and contributions
- **Enterprise Users** - For production testing and feedback

---

**Ready to contribute?** Start by checking out our [Getting Started Guide](getting-started.md) or browse our [open issues](https://github.com/mahajanankur/boxq/issues)!
