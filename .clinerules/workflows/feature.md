# Feature Implementation Command - CPQ System

**Purpose**: Implement new CPQ features following the hierarchical workflow with proper validation and quality assurance.

## Usage

Trigger this workflow when you want to implement a new feature in the CPQ system.

## Workflow Steps

### 1. Task Classification
Classify the feature implementation as:
- **Small**: Simple UI changes, single function additions
- **Medium**: Multi-file changes, new components, business logic updates
- **Large**: Complex features spanning multiple modules, database changes

### 2. Context Gathering
Based on classification, gather appropriate context:
- **Small**: Read target files only
- **Medium**: Read CLAUDE.md + target files + related tests
- **Large**: Read CLAUDE.md + all affected files + database schema

### 3. Planning Phase
Present a detailed plan with:
- Feature breakdown into implementation steps
- Estimated time and complexity
- Required specialists and their roles
- Validation requirements
- Risk assessment for pricing accuracy

### 4. Implementation Delegation
Delegate to appropriate workflows:
- **Implementer**: Core feature implementation
- **Tester**: Test suite creation and execution
- **Documenter**: Documentation updates
- **Security Auditor**: If handling sensitive data

### 5. Validation Requirements
Based on feature type, run appropriate validation:

**Always Required:**
- Unit tests execution
- TypeScript type checking
- Code quality validation

**Feature-Specific Validation:**
- **Pricing Changes**: Verify calculation accuracy with test data
- **Quote Processing**: Test with sample quote files
- **UI Features**: Optional E2E test with Playwright (ask user)
- **Database Changes**: Backend validation with available tools
- **Cost Data**: Security audit for data exposure

### 6. Quality Gates
**Do not proceed if:**
- Pricing calculations could be inaccurate
- Data integrity rules are violated
- Tests fail for critical paths
- Security vulnerabilities identified
- Documentation is incomplete

## CPQ-Specific Considerations

### Data Integrity Rules
1. Every price must be traceable to source document
2. Historical prices are never deleted
3. Assembly costs always reflect current component prices
4. Customer prices = cost + markup (never store directly)
5. Price expiration dates must be respected

### Business Logic Validation
- Markup calculations (percentage vs fixed)
- Price expiration handling
- Assembly cost roll-up accuracy
- Supplier cost vs customer pricing separation

### Critical Paths to Test
- Quote upload → OCR parsing → Validation → Database storage
- Project creation → BOM building → Pricing calculations → Quote generation
- Component library updates → Assembly cost recalculation

## Output Format

```
🚀 FEATURE IMPLEMENTATION

Feature: [Brief description]
Classification: [Small/Medium/Large]

Plan:
1. [Implementation step 1]
2. [Implementation step 2]
3. [Implementation step 3]

Estimated Time: [X hours/minutes]
Specialists Needed: [Implementer, Tester, Documenter, etc.]

Validation Requirements:
- [ ] Unit tests
- [ ] Type checking
- [ ] [Feature-specific validations]

Risks:
- [Pricing accuracy risks]
- [Data integrity risks]
- [Performance considerations]

User Approval Required: [Yes/No]

[Wait for user approval before proceeding]
```

## Example Implementation

```
User: "Add assembly cost roll-up calculations"

Classification: MEDIUM
Context: Read CLAUDE.md + AssemblyBuilder.tsx + pricing utils

Plan:
1. Create recursive cost calculation function in pricingUtils.ts
2. Add cost display to assembly cards
3. Update BOM totals to include assembly costs
4. Add tests for cost calculation accuracy

Estimated Time: 30 minutes
Specialists Needed: Implementer, Tester

Validation Requirements:
- [x] Unit tests for pricing calculations
- [x] Type checking
- [x] Manual verification of cost roll-up accuracy
- [ ] E2E test (optional - ask user)

Risks:
- Performance issues with deeply nested assemblies
- Circular reference detection needed
- Price history accuracy critical

User Approval Required: Yes

[Wait for user approval]
```

## Success Metrics

- Feature works as specified
- All tests pass
- Pricing calculations are accurate
- Data integrity maintained
- Documentation is complete
- No regressions in existing functionality

## When to Use This Command

- New CPQ features (OCR processing, BOM editing, pricing)
- Major UI components (quote generation, project management)
- Business logic changes (markup rules, validation)
- Database schema modifications
- Integration with external services

## Key Principle

Maintain data integrity and pricing accuracy above all else. Every feature must validate that financial calculations are correct and traceable.
