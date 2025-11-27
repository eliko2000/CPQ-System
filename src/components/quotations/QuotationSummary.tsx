import { QuotationProject } from '../../types';

interface QuotationSummaryProps {
  quotation: QuotationProject;
  calculations: any;
  selectedItemsCount: number;
}

export function QuotationSummary({
  quotation,
  calculations,
  selectedItemsCount,
}: QuotationSummaryProps) {
  if (!calculations) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        סיכום חישובים
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">עלויות</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">חומרה:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalHardwareILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">תוכנה:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalSoftwareILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">עבודה:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalLaborILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="mr-4 space-y-0.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>→ הנדסה:</span>
                <span className="font-mono">
                  ₪
                  {calculations.totalEngineeringILS.toLocaleString('he-IL', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>→ הרצה:</span>
                <span className="font-mono">
                  ₪
                  {calculations.totalCommissioningILS.toLocaleString('he-IL', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>→ התקנה:</span>
                <span className="font-mono">
                  ₪
                  {calculations.totalInstallationILS.toLocaleString('he-IL', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span className="text-sm">סה"כ עלות:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalCostILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">מכירות</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">סה"כ מחיר נטו:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalCostILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">רווח:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalProfitILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">תוספת סיכון:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.riskAdditionILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-sm">סה"כ לפני מע"מ:</span>
              <span className="font-mono text-sm">
                ₪
                {calculations.totalQuoteILS.toLocaleString('he-IL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">סטטיסטיקה</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">מספר מערכות:</span>
              <span className="font-mono text-sm">
                {quotation.systems.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">מספר פריטים:</span>
              <span className="font-mono text-sm">
                {quotation.items.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">פריטים שנבחרו:</span>
              <span className="font-mono text-sm">{selectedItemsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">אחוז רווח:</span>
              <span className="font-mono text-sm">
                {calculations.profitMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
