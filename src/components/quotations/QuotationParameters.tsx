import { memo, useCallback } from 'react';
import type { QuotationParameters } from '../../types';

interface QuotationParametersProps {
  parameters: QuotationParameters;
  onChange: (parameters: QuotationParameters) => void;
  disabled?: boolean;
}

export const QuotationParameters = memo(function QuotationParameters({
  parameters,
  onChange,
  disabled = false,
}: QuotationParametersProps) {
  const handleChange = useCallback(
    (field: keyof QuotationParameters, value: any) => {
      onChange({
        ...parameters,
        [field]: value,
      });
    },
    [parameters, onChange]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        פרמטרים כלליים
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Exchange Rates */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
            שערי חליפין
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שער דולר לשקל
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={parameters.usdToIlsRate}
              onChange={e =>
                handleChange('usdToIlsRate', parseFloat(e.target.value) || 0)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שער יורו לשקל
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={parameters.eurToIlsRate}
              onChange={e =>
                handleChange('eurToIlsRate', parseFloat(e.target.value) || 0)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
            תמחור
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מקדם רווח
            </label>
            <input
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={parameters.markupPercent ?? 0.75}
              onChange={e => {
                const coefficient = parseFloat(e.target.value) || 0.75;
                // Round to 2 decimal places
                const rounded = Math.round(coefficient * 100) / 100;
                handleChange('markupPercent', rounded);
              }}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ערך בין 0.01 ל-1.0 (מחלקים מחיר נטו במקדם)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              עלות עבודה ליום (₪)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={parameters.dayWorkCost}
              onChange={e =>
                handleChange('dayWorkCost', parseFloat(e.target.value) || 0)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
            סיכון סיכונים
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אחוז סיכון (%)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              value={parameters.riskPercent || 10}
              onChange={e =>
                handleChange('riskPercent', parseInt(e.target.value) || 0)
              }
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ערך בין 0 ל-20 אחוז (ברירת מחדל 10%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
