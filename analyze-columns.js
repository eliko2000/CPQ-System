// Script to analyze column order configuration

console.log("=== LIBRARY TABLE (EnhancedComponentGrid) ===\n");

console.log("1. columnDefs order (first to last):");
console.log("   quoteDate → unitCostUSD → unitCostNIS → supplier → manufacturer → name → manufacturerPN → actions");

console.log("\n2. config.columnOrder (default):");
console.log("   ['actions', 'manufacturerPN', 'name', 'manufacturer', 'supplier', 'unitCostNIS', 'unitCostUSD', 'quoteDate']");

console.log("\n3. visibleColumnDefs logic:");
console.log("   - Filter by config.visibleColumns");
console.log("   - Reorder by config.columnOrder");
console.log("   - .reverse() the result");

console.log("\n4. enableRtl:");
console.log("   true");

console.log("\n5. Has reverse() in visibleColumnDefs:");
console.log("   YES");

console.log("\n6. Has reverse() in onColumnMoved:");
console.log("   YES");

console.log("\n\n=== QUOTATIONS TABLE (QuotationDataGrid) ===\n");

console.log("1. columnDefs order (first to last):");
console.log("   updated_at → created_at → displayTotalPrice → status → version → project_name → customer_name → actions");

console.log("\n2. config.columnOrder (default):");
console.log("   ['actions', 'customer_name', 'project_name', 'version', 'status', 'displayTotalPrice', 'created_at', 'updated_at']");

console.log("\n3. visibleColumnDefs logic:");
console.log("   - Filter by config.visibleColumns");
console.log("   - Reorder by config.columnOrder");
console.log("   - .reverse() the result");

console.log("\n4. enableRtl:");
console.log("   true");

console.log("\n5. Has reverse() in visibleColumnDefs:");
console.log("   YES");

console.log("\n6. Has reverse() in onColumnMoved:");
console.log("   YES");

console.log("\n7. Has isInitialMount guard:");
console.log("   YES");

console.log("\n\n=== QUOTATION EDITOR TABLE ===\n");

console.log("1. columnDefs order (first to last):");
console.log("   customerPriceILS → totalPriceILS → totalPriceUSD → unitPriceILS → quantity → componentName → displayNumber → actions");

console.log("\n2. enableRtl:");
console.log("   true");

console.log("\n3. Has reverse() in visibleColumnDefs:");
console.log("   Check needed");

console.log("\n4. Has reverse() in onColumnMoved:");
console.log("   Check needed");

console.log("\n\n=== KEY DIFFERENCE ===");
console.log("Library: columnDefs is REVERSED (quoteDate first, actions last)");
console.log("Quotations: columnDefs is REVERSED (updated_at first, actions last)");
console.log("Both have .reverse() in visibleColumnDefs");
console.log("Both have .reverse() in onColumnMoved");
console.log("\nExpected result: BOTH should display correctly in RTL");
console.log("Actual result: Library displays correctly, Quotations displays REVERSED");
console.log("\nPossible cause: config.columnOrder stored in localStorage doesn't match");

