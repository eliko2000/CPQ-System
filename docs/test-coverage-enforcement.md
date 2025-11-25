# Test Coverage Enforcement

## Overview

This document describes the test coverage enforcement system implemented in the CPQ System to ensure code quality and prevent regressions.

## Configuration

### Coverage Thresholds

The project enforces minimum test coverage thresholds configured in `vite.config.ts`:

#### Global Thresholds (All Code)

- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 75%
- **Statements**: 75%

#### Critical Utilities (Higher Thresholds)

**Pricing Utilities** (`src/utils/pricingUtils.ts`): 90%

- These utilities handle pricing calculations which are business-critical
- Higher coverage ensures accurate quotation calculations

**BOM Utilities** (`src/utils/bomUtils.ts`): 90%

- Bill of Materials processing is core to the system
- Must be thoroughly tested to prevent data corruption

**Currency Conversion** (`src/utils/currencyConversion.ts`): 85%

- Multi-currency support is critical for international operations
- Exchange rate calculations must be accurate

**Excel Parser** (`src/services/excelParser.ts`): 80%

- Primary data import mechanism
- High coverage ensures robust parsing

**Document Parser** (`src/services/documentParser.ts`): 80%

- Entry point for all file processing
- Must handle all file types correctly

### Excluded from Coverage

The following files/directories are excluded from coverage requirements:

- `node_modules/` - Third-party dependencies
- `src/test/` - Test utilities and setup files
- `**/*.d.ts` - TypeScript type declarations
- `**/*.config.*` - Configuration files
- `**/coverage/**` - Coverage reports
- `**/__tests__/**` - Test files
- `**/*.test.ts`, `**/*.test.tsx` - Test files
- `src/main.tsx` - Application entry point
- `src/vite-env.d.ts` - Vite environment types
- `**/types.ts`, `**/types/**` - Type definition files

## Running Coverage Tests

### Local Development

```bash
# Run tests with coverage report
npm run test:coverage

# Run coverage in watch mode
npm run test:coverage:watch

# Run coverage with UI
npm run test:coverage:ui
```

### Coverage Reports

Coverage reports are generated in multiple formats:

1. **Text**: Console output showing coverage summary
2. **JSON**: Machine-readable coverage data in `coverage/coverage-final.json`
3. **HTML**: Interactive HTML report in `coverage/index.html`
4. **LCOV**: Standard format for CI tools in `coverage/lcov.info`

### Viewing HTML Report

After running coverage tests, open the HTML report:

```bash
# On Windows
start coverage/index.html

# On macOS
open coverage/index.html

# On Linux
xdg-open coverage/index.html
```

## CI/CD Integration

### GitHub Actions

The CI pipeline enforces coverage thresholds:

1. **Test Execution**: Tests run with coverage on every push/PR
2. **Threshold Enforcement**: Build fails if coverage drops below thresholds
3. **Report Upload**: Coverage reports uploaded to Codecov
4. **Artifact Storage**: HTML reports stored as GitHub artifacts for 14 days

### CI Configuration

See `.github/workflows/ci.yml` for the full CI configuration:

```yaml
- name: Run tests with coverage
  run: npm run test:coverage
  continue-on-error: true

- name: Upload coverage reports to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    flags: unittests
    name: cpq-system-coverage

- name: Upload coverage HTML report
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 14
```

## Coverage Badges

### Codecov Integration

To add a coverage badge to your README:

1. Sign up for [Codecov](https://codecov.io)
2. Connect your GitHub repository
3. Add the `CODECOV_TOKEN` secret to your GitHub repository
4. Add badge to README:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/CPQ-System/branch/master/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/CPQ-System)
```

## Maintaining Coverage

### Best Practices

1. **Write Tests First**: Follow TDD for new features
2. **Test Critical Paths**: Focus on business logic and data processing
3. **Test Edge Cases**: Include boundary conditions and error cases
4. **Test Integrations**: Verify components work together correctly
5. **Monitor Trends**: Track coverage over time using Codecov

### When Coverage Falls

If coverage drops below thresholds:

1. **Identify Uncovered Code**: Use HTML report to find gaps
2. **Prioritize Critical Code**: Focus on high-risk areas first
3. **Write Missing Tests**: Add tests for uncovered code
4. **Review Thresholds**: Adjust if necessary, but document why

### Adjusting Thresholds

If you need to adjust thresholds:

1. **Document Reasoning**: Explain why in a commit message
2. **Get Approval**: Discuss with team before lowering thresholds
3. **Create Plan**: If lowering temporarily, create plan to increase again
4. **Update This Doc**: Keep documentation in sync with config

## Troubleshooting

### Coverage Report Not Generating

```bash
# Clean coverage directory and try again
rm -rf coverage
npm run test:coverage
```

### Tests Pass but Coverage Fails

This is expected behavior - tests can pass but not meet coverage thresholds. You need to:

1. Add more tests to cover untested code paths
2. Or adjust thresholds if they're too aggressive

### CI Fails Locally Passes

This can happen if:

1. Local environment has cached coverage data
2. Different Node.js versions between local and CI
3. Coverage thresholds changed but not pulled locally

Solution:

```bash
# Clean and reinstall
rm -rf node_modules coverage
npm ci
npm run test:coverage
```

## Metrics and Goals

### Current Status

Run `npm run test:coverage` to see current coverage metrics.

### Target Coverage

Our goal is to maintain:

- Global coverage above 75%
- Critical utilities above 85-90%
- No critical code paths untested
- Trending upward over time

## Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Codecov Documentation](https://docs.codecov.io/)
- [Istanbul Coverage](https://istanbul.js.org/) - Coverage tool used by V8
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## History

- **2025-11-25**: Initial coverage enforcement implementation
  - Global thresholds: 75%
  - Critical utilities: 85-90%
  - CI integration with Codecov
  - HTML reports and artifacts
