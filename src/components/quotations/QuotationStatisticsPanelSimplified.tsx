/**
 * Simplified Quotation Statistics Panel
 *
 * Focused on essential metrics for robotics system integrators:
 * - Material vs Labor breakdown
 * - Key ratios and margins
 * - Robot-specific metrics
 */

import React from 'react';
import { AlertTriangle, Bot, TrendingUp } from 'lucide-react';
import type { QuotationStatistics } from '../../types';

interface QuotationStatisticsPanelSimplifiedProps {
  statistics: QuotationStatistics;
  className?: string;
}

export function QuotationStatisticsPanelSimplified({ statistics, className = '' }: QuotationStatisticsPanelSimplifiedProps) {
  // Get quotation type for context
  const quotationType = statistics.materialPercent > statistics.laborOnlyPercent + 20
    ? 'material-heavy'
    : statistics.laborOnlyPercent > statistics.materialPercent + 20
    ? 'labor-heavy'
    : 'balanced';

  // Warning for unusual ratios
  const warnings: string[] = [];
  if (statistics.laborPercent > 80) warnings.push('אחוז עבודה גבוה מאוד (>80%)');
  if (statistics.materialPercent < 15) warnings.push('אחוז חומרים נמוך מאוד (<15%)');
  if (statistics.profitByType.hardware.margin < 15) warnings.push('מרווח חומרה נמוך מהמומלץ (<15%)');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-2">שים לב</h4>
              <ul className="space-y-1 text-sm text-amber-800">
                {warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Primary Metric: Material vs Labor Split */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-center text-sm font-medium text-gray-700 mb-4">פיר מכירות חומרים : עבודה</h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Material (Hardware + Software) */}
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-700 mb-2">
              {statistics.materialPercent.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 mb-4">חומרים</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div>חומרה: {statistics.hardwarePercent.toFixed(0)}%</div>
              {statistics.softwarePercent > 0 && (
                <div>תוכנה: {statistics.softwarePercent.toFixed(0)}%</div>
              )}
            </div>
          </div>

          {/* Labor */}
          <div className="text-center border-r border-blue-200">
            <div className="text-5xl font-bold text-orange-700 mb-2">
              {statistics.laborOnlyPercent.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 mb-4">עבודה</div>
            <div className="space-y-1 text-xs text-gray-500">
              {statistics.engineeringPercent > 0 && (
                <div>הנדסה: {statistics.engineeringPercent.toFixed(0)}%</div>
              )}
              {statistics.commissioningPercent > 0 && (
                <div>הרצה: {statistics.commissioningPercent.toFixed(0)}%</div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-6">
          <div className="flex h-8 rounded-lg overflow-hidden shadow-sm">
            <div
              className="bg-blue-600 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${statistics.materialPercent}%` }}
            >
              {statistics.materialPercent > 15 && `${statistics.materialPercent.toFixed(0)}%`}
            </div>
            <div
              className="bg-orange-600 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${statistics.laborOnlyPercent}%` }}
            >
              {statistics.laborOnlyPercent > 15 && `${statistics.laborOnlyPercent.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>חומרים</span>
            <span>עבודה</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">סה"כ פריטים</div>
          <div className="text-3xl font-bold text-gray-900">{statistics.componentCounts.total}</div>
          <div className="mt-2 space-y-0.5 text-xs text-gray-500">
            <div>חומרה: {statistics.componentCounts.hardware}</div>
            {statistics.componentCounts.software > 0 && (
              <div>תוכנה: {statistics.componentCounts.software}</div>
            )}
            <div>עבודה: {statistics.componentCounts.labor}</div>
          </div>
        </div>

        {/* Overall Margin */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">מרווח ממוצע</div>
          <div className="text-3xl font-bold text-green-700">
            {(
              (statistics.profitByType.hardware.margin * statistics.hardwarePercent +
               statistics.profitByType.software.margin * statistics.softwarePercent +
               statistics.profitByType.labor.margin * statistics.laborPercent) / 100
            ).toFixed(1)}%
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            <span>משוקלל לפי היקף</span>
          </div>
        </div>

        {/* Project Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">סוג פרויקט</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {quotationType === 'material-heavy' && 'עתיר חומרים'}
            {quotationType === 'labor-heavy' && 'עתיר עבודה'}
            {quotationType === 'balanced' && 'מאוזן'}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {quotationType === 'material-heavy' && 'התקנה סטנדרטית'}
            {quotationType === 'labor-heavy' && 'אינטגרציה מורכבת'}
            {quotationType === 'balanced' && 'פרויקט טיפוסי'}
          </div>
        </div>
      </div>

      {/* Robot Components (if applicable) */}
      {statistics.robotComponents && statistics.robotComponents.count > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-5 border border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-10 w-10 text-red-600" />
              <div>
                <h4 className="font-semibold text-gray-900">מערכת רובוטית</h4>
                <p className="text-sm text-gray-600">
                  {statistics.robotComponents.count} רכיבי רובוטיקה
                </p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold text-red-700">
                {statistics.robotComponents.percentOfTotal.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">מהפרויקט</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium">עלות רובוטים:</span>{' '}
              <span className="font-mono font-bold text-red-700">
                ₪{statistics.robotComponents.totalCostILS.toLocaleString('he-IL')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Profit Breakdown */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">פירוט רווחיות</h4>
        <div className="grid grid-cols-3 gap-4">
          {/* Hardware Margin */}
          {statistics.hardwarePercent > 0 && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">מרווח חומרה</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.profitByType.hardware.margin.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Software Margin */}
          {statistics.softwarePercent > 0 && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">מרווח תוכנה</div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.profitByType.software.margin.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Labor Margin */}
          {statistics.laborPercent > 0 && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">מרווח עבודה</div>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.profitByType.labor.margin.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Industry Benchmark Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-xs text-blue-800">
          <strong>ייחוס לתעשייה:</strong> פרויקטי אינטגרציה רובוטיים טיפוסיים: 16-33% חומרים, 67-84% עבודה
        </p>
      </div>
    </div>
  );
}
