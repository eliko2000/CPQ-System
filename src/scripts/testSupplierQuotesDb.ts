/**
 * Test Script for Supplier Quotes Database Tables
 *
 * Run this to verify:
 * 1. Tables are accessible from the app
 * 2. CRUD operations work
 * 3. Relationships are correct
 *
 * Usage: Import and call testSupplierQuotesDb() from a component
 */

import { supabase } from '../supabaseClient';

export async function testSupplierQuotesDb() {
  console.log('🧪 Starting Supplier Quotes Database Tests...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{
      name: string;
      status: 'PASS' | 'FAIL';
      message: string;
    }>,
  };

  // ============================================
  // Test 1: Check supplier_quotes table exists
  // ============================================
  try {
    const { data: _data, error } = await supabase
      .from('supplier_quotes')
      .select('count')
      .limit(1);

    if (error) throw error;

    results.tests.push({
      name: 'supplier_quotes table access',
      status: 'PASS',
      message: 'Table exists and is accessible',
    });
    results.passed++;
  } catch (error) {
    results.tests.push({
      name: 'supplier_quotes table access',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    results.failed++;
  }

  // ============================================
  // Test 2: Check component_quote_history table exists
  // ============================================
  try {
    const { data: _data, error } = await supabase
      .from('component_quote_history')
      .select('count')
      .limit(1);

    if (error) throw error;

    results.tests.push({
      name: 'component_quote_history table access',
      status: 'PASS',
      message: 'Table exists and is accessible',
    });
    results.passed++;
  } catch (error) {
    results.tests.push({
      name: 'component_quote_history table access',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    results.failed++;
  }

  // ============================================
  // Test 3: Check components table has new columns
  // ============================================
  try {
    const { data: _data, error } = await supabase
      .from('components')
      .select('current_quote_id, currency, original_cost')
      .limit(1);

    if (error) throw error;

    results.tests.push({
      name: 'components table new columns',
      status: 'PASS',
      message: 'New columns (current_quote_id, currency, original_cost) exist',
    });
    results.passed++;
  } catch (error) {
    results.tests.push({
      name: 'components table new columns',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    results.failed++;
  }

  // ============================================
  // Test 4: Create test supplier quote
  // ============================================
  let testQuoteId: string | null = null;
  try {
    const { data, error } = await supabase
      .from('supplier_quotes')
      .insert([
        {
          quote_number: 'TEST-001',
          supplier_name: 'Test Supplier',
          file_name: 'test_quote.xlsx',
          file_url: '/test/quote.xlsx',
          file_type: 'excel',
          status: 'completed',
          total_components: 0,
          confidence_score: 0.95,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    testQuoteId = data.id;

    results.tests.push({
      name: 'Create supplier quote',
      status: 'PASS',
      message: `Successfully created test quote with ID: ${testQuoteId}`,
    });
    results.passed++;
  } catch (error) {
    results.tests.push({
      name: 'Create supplier quote',
      status: 'FAIL',
      message: `Error: ${error}`,
    });
    results.failed++;
  }

  // ============================================
  // Test 5: Read supplier quote
  // ============================================
  if (testQuoteId) {
    try {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .select('*')
        .eq('id', testQuoteId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Quote not found');

      results.tests.push({
        name: 'Read supplier quote',
        status: 'PASS',
        message: `Successfully read quote: ${data.quote_number}`,
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Read supplier quote',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  // ============================================
  // Test 6: Update supplier quote
  // ============================================
  if (testQuoteId) {
    try {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .update({ notes: 'Test note updated' })
        .eq('id', testQuoteId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Update failed');

      results.tests.push({
        name: 'Update supplier quote',
        status: 'PASS',
        message: 'Successfully updated quote notes',
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Update supplier quote',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  // ============================================
  // Test 7: Create component quote history entry
  // ============================================
  let testHistoryId: string | null = null;
  if (testQuoteId) {
    try {
      // First, get a component to link to
      const { data: components } = await supabase
        .from('components')
        .select('id')
        .limit(1)
        .single();

      if (components) {
        const { data, error } = await supabase
          .from('component_quote_history')
          .insert([
            {
              component_id: components.id,
              quote_id: testQuoteId,
              unit_price_usd: 100.0,
              currency: 'USD',
              is_current_price: false,
              confidence_score: 0.95,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned');

        testHistoryId = data.id;

        results.tests.push({
          name: 'Create component quote history',
          status: 'PASS',
          message: 'Successfully created history entry',
        });
        results.passed++;
      } else {
        results.tests.push({
          name: 'Create component quote history',
          status: 'FAIL',
          message:
            'No components found to link to (skip this test if library is empty)',
        });
        results.failed++;
      }
    } catch (error) {
      results.tests.push({
        name: 'Create component quote history',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  // ============================================
  // Test 8: Foreign key relationship
  // ============================================
  if (testHistoryId) {
    try {
      const { data, error } = await supabase
        .from('component_quote_history')
        .select(
          `
          *,
          quote:supplier_quotes(*),
          component:components(*)
        `
        )
        .eq('id', testHistoryId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Relationship query failed');

      results.tests.push({
        name: 'Foreign key relationships',
        status: 'PASS',
        message: 'Successfully joined tables via foreign keys',
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Foreign key relationships',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  // ============================================
  // Cleanup: Delete test data
  // ============================================
  if (testHistoryId) {
    try {
      await supabase
        .from('component_quote_history')
        .delete()
        .eq('id', testHistoryId);

      results.tests.push({
        name: 'Cleanup: Delete test history',
        status: 'PASS',
        message: 'Test history deleted',
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Cleanup: Delete test history',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  if (testQuoteId) {
    try {
      await supabase.from('supplier_quotes').delete().eq('id', testQuoteId);

      results.tests.push({
        name: 'Cleanup: Delete test quote',
        status: 'PASS',
        message: 'Test quote deleted',
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name: 'Cleanup: Delete test quote',
        status: 'FAIL',
        message: `Error: ${error}`,
      });
      results.failed++;
    }
  }

  // ============================================
  // Print Results
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${test.name}`);
    console.log(`   ${test.message}\n`);
  });

  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(0)}%`
  );
  console.log('='.repeat(60) + '\n');

  if (results.failed === 0) {
    console.log('🎉 All tests passed! Database migration is successful!\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
  }

  return results;
}
