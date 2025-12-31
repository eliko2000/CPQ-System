# Smart CPQ System

Configure, Price, Quote application for robotics integration companies.

## Quick Reference

### Commands

```bash
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build
npx tsc --noEmit     # Type check
```

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI + AG Grid
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Testing**: Vitest + Playwright

### Project Structure

```
src/
├── components/      # React components
│   ├── library/     # Component library UI
│   ├── quotations/  # Quotation builder UI
│   └── shared/      # Reusable components
├── services/        # Business logic, parsers
├── hooks/           # React hooks
├── contexts/        # React contexts
├── utils/           # Utility functions
├── types/           # TypeScript types
└── lib/             # Helpers (utils.ts)
```

### Key Services

- `cpqService.ts` - Database operations (all DB access goes through here)
- `documentParser.ts` - Unified file parser router
- `excelParser.ts` - Excel/CSV parsing
- `claudeAI.ts` - AI Vision integration
- `currencyConversion.ts` - Multi-currency utilities

## Critical Rules

### TypeScript (see @.claude/rules/typescript.md)

- Use `undefined` for optional fields, never `null`
- Prefix unused variables with `__`
- Always use optional chaining `?.` for possibly undefined values

### Workflow (see @.claude/rules/workflow.md)

- **ASK** before creating branches for features/bugfixes
- **ALWAYS** write regression tests after confirming bugfixes

### Currency (see @.claude/rules/currency.md)

- Original currency NEVER changes after component creation
- Exchange rate changes recalculate conversions, not originals
- Always preserve `originalCurrency` and `originalCost` fields

### Database (see @.claude/rules/database.md)

- All DB operations through `cpqService.ts`
- Optimistic UI update first, then sync to Supabase
- Never query Supabase directly from components

## Business Logic

### Pricing Integrity

- Every price traceable to source document
- Historical prices never deleted
- Customer price = cost + markup (calculated, not stored)

### Quotation Calculation

```
hardwareTotal + laborTotal = subtotal
subtotal × (1 + markup%) = customerPrice
customerPrice × (1 + risk%) = withRisk
withRisk × (1 + VAT%) = finalTotal
```

## Detailed Documentation

Full documentation in `.claude/rules/`:

- `typescript.md` - TypeScript best practices
- `workflow.md` - Development workflow, branching, testing
- `currency.md` - Multi-currency system details
- `parsers.md` - File import and parser system
- `database.md` - Schema and business logic
- `testing.md` - Testing standards and coverage
- `global-rules.md` - Agent coordination, security, reporting

Additional docs in `docs/`:

- `TYPESCRIPT_BEST_PRACTICES.md` - Comprehensive TS guide
