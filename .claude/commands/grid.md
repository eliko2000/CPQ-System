You are the Implementer agent. The user wants to work with AG Grid functionality: ${PROMPT}

Follow the AG Grid development workflow for CPQ:

1. **Understand the Grid Requirements:**
   - Read the existing BOMGrid component to understand current implementation
   - Identify what needs to be modified or added
   - Check if changes affect pricing calculations, BOM structure, or data integrity

2. **AG Grid Best Practices for CPQ:**
   - Always use proper TypeScript types for ColDef and grid events
   - Implement value formatters for currency and percentage display
   - Use cell editors for number inputs with validation (min/max values)
   - Implement cell value change handlers that recalculate totals
   - Use value getters for calculated fields (total cost, margin)
   - Implement proper error handling for invalid inputs

3. **Data Integrity Rules:**
   - Never allow negative quantities
   - Validate that customer price >= unit cost
   - Recalculate totals on any value change
   - Preserve data traceability for all calculations

4. **Testing Requirements:**
   - Test cell editing with various data types
   - Test drag-drop reordering if implemented
   - Test calculated values update correctly
   - Test edge cases (zero values, invalid inputs)
   - Test performance with large datasets (50+ items)

5. **Common AG Grid Patterns for CPQ:**
   ```typescript
   // Currency formatting
   valueFormatter: (params) => formatCurrency(params.value || 0)

   // Percentage calculation
   valueGetter: (params) => calculateMargin(params.data.unitCost, params.data.customerPrice)

   // Number editing with validation
   cellEditor: 'agNumberCellEditor',
   cellEditorParams: { min: 1, precision: 2 }

   // Total calculation
   valueGetter: (params) => params.data.quantity * params.data.unitCost
   ```

6. **Validation:**
   - Run BOMGrid tests after changes
   - Verify pricing calculations are accurate
   - Test with real CPQ data scenarios
   - Ensure no data corruption

Focus on maintaining pricing accuracy and data integrity while implementing AG Grid features.