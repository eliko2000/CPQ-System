/**
 * Database Test Panel - Temporary Component
 *
 * Add this to Dashboard or any page to test the database migration
 * Remove after verification
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { testSupplierQuotesDb } from '../../scripts/testSupplierQuotesDb';
import { CheckCircle, XCircle, Play, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export function DatabaseTestPanel() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    setResults(null);

    try {
      const testResults = await testSupplierQuotesDb();
      setResults(testResults);
    } catch (error) {
      logger.error('Test execution failed:', error);
      setResults({
        passed: 0,
        failed: 1,
        tests: [{
          name: 'Test Execution',
          status: 'FAIL',
          message: `Failed to run tests: ${error}`
        }]
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🧪 Database Migration Test Panel</span>
          <Button
            onClick={runTests}
            disabled={testing}
            size="sm"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 ml-2" />
                Run Tests
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!results && !testing && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Click "Run Tests" to verify the database migration</p>
            <p className="text-sm mt-2">This will test:</p>
            <ul className="text-sm mt-2 text-right list-disc list-inside">
              <li>supplier_quotes table access</li>
              <li>component_quote_history table access</li>
              <li>New columns in components table</li>
              <li>CRUD operations</li>
              <li>Foreign key relationships</li>
            </ul>
          </div>
        )}

        {testing && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-muted-foreground">Running database tests...</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <div className="text-sm text-muted-foreground">Test Results</div>
                <div className="text-2xl font-bold">
                  {results.passed} / {results.passed + results.failed} Passed
                </div>
              </div>
              <div className="text-4xl">
                {results.failed === 0 ? '🎉' : '⚠️'}
              </div>
            </div>

            {/* Individual Tests */}
            <div className="space-y-2">
              {results.tests.map((test: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    test.status === 'PASS'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {test.status === 'PASS' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {test.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Message */}
            <div className={`p-4 rounded-lg text-center font-medium ${
              results.failed === 0
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {results.failed === 0
                ? '✅ All tests passed! Migration successful!'
                : '⚠️ Some tests failed. Check console for details.'}
            </div>

            {/* Open Console Reminder */}
            <div className="text-sm text-center text-muted-foreground">
              💡 Check browser console for detailed logs
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
