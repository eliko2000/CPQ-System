---
name: Feature - Supplier Quote Filters
about: Add filtering capability to Supplier Quotes page
title: '[Feature] Add filters component for Supplier Quotes'
labels: enhancement, ui
assignees: ''
---

## Description
Add a filters component to the Supplier Quotes page that displays when the user clicks the "סינון" (Filter) button.

## Location
- File: `src/components/supplier-quotes/SupplierQuotesPage.tsx`
- Line: ~207
- Component: `SupplierQuotesPage`

## Current Behavior
- Filter button exists and toggles `showFilters` state
- No UI renders when `showFilters` is true
- Only search by filename/supplier/quote number is available

## Desired Behavior
When user clicks filter button, show a filters panel with:
- **Date Range**: Filter by upload date or quote date
- **Status**: Filter by status (completed, processing, error)
- **File Type**: Filter by file type (excel, pdf, csv, image)
- **Supplier**: Filter by supplier name (dropdown or autocomplete)
- **Confidence Score**: Filter by extraction confidence (slider: 0-100%)

## Implementation Suggestions
1. Create new `SupplierQuoteFilters.tsx` component
2. Add filter state management to parent component
3. Apply filters to the existing `filteredQuotes` logic
4. Persist filter preferences to localStorage (optional)
5. Add "Clear Filters" button

## Acceptance Criteria
- [ ] Filters panel shows/hides when filter button clicked
- [ ] Each filter updates the quotes list in real-time
- [ ] Multiple filters can be applied simultaneously
- [ ] Filter button shows count of active filters (badge)
- [ ] Clear filters button resets all filters
- [ ] UI is responsive and matches app design system

## Priority
Medium - Nice to have for better UX

## Related Code
```typescript
// Line 45
const [showFilters, setShowFilters] = useState(false);

// Line 197-207
<Button
  variant="outline"
  onClick={() => setShowFilters(!showFilters)}
  className="gap-2"
>
  <Filter className="h-4 w-4" />
  סינון
</Button>

{/* GitHub Issue #TBD: Add filters component when showFilters is true */}
```
