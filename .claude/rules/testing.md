# Testing Standards

## Coverage Targets

| Category            | Target  |
| ------------------- | ------- |
| Pricing utilities   | 90%     |
| BOM utilities       | 90%     |
| AG Grid components  | 80%     |
| Services            | 85%     |
| Contexts            | 80%     |
| Components          | 70%     |

## Running Tests

```bash
npm test              # Run all tests
npm run test:ui       # Run with UI
npm run test:coverage # Run with coverage
```

## File Naming Convention

Tests: `src/path/__tests__/file.test.ts`

## E2E Testing Policy (Playwright)

**MANDATORY E2E tests for:**
- Quote processing workflow
- BOM editing and pricing calculations
- Project creation and quote generation
- PDF generation functionality

**OPTIONAL E2E tests for:**
- Component library management
- Search and analytics features
- UI improvements

**SKIP E2E tests for:**
- Backend-only utility functions
- Type/interface changes
- Documentation updates
- Pure pricing calculations (unit tests preferred)

## AG Grid Testing Requirements

- Mock AG Grid modules in test setup
- Test cell editing and value changes
- Test calculated fields (total cost, margin)
- Test currency formatting and display
- Test validation and error handling
- Use custom utilities from `@/src/test/ag-grid-utils.ts`

## Test Environment

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

## Frameworks

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Mocking**: Mock Supabase, contexts, and AG Grid
