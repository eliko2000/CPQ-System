/**
 * Quotation Statistics Panel
 *
 * Production-ready component that displays comprehensive quotation statistics:
 * - HW:Engineering:Commissioning ratio
 * - Component type breakdown with visual indicators
 * - Robot detection and metrics
 * - Quotation type classification
 * - Profit analysis by type
 * - Validation warnings for unusual ratios
 */

import { AlertTriangle, Bot } from 'lucide-react';
import type { QuotationStatistics } from '../../types';
import {
  getQuotationSummaryText,
  getDominantCategory,
  getQuotationType,
  validateStatistics
} from '../../utils/quotationStatistics';

interface QuotationStatisticsPanelProps {
  statistics: QuotationStatistics;
  className?: string;
}

export function QuotationStatisticsPanel({ statistics, className = '' }: QuotationStatisticsPanelProps) {
  const dominantCategory = getDominantCategory(statistics);
  const quotationType = getQuotationType(statistics);

  // Get badge color based on quotation type
  const getQuotationTypeBadge = () => {
    switch (quotationType) {
      case 'material-heavy':
        return { text: 'עתירת חומרים', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'labor-heavy':
        return { text: 'עתירת עבודה', color: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'balanced':
        return { text: 'מאוזנת', color: 'bg-green-100 text-green-800 border-green-300' };
    }
  };

  const quotationBadge = getQuotationTypeBadge();

  // Render percentage bar
  const PercentageBar = ({ percent, color }: { percent: number; color: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500 ease-out`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );

  // Warning indicators for unusual ratios
  const warnings: string[] = [];
  if (statistics.laborPercent > 70) warnings.push('אחוז עבודה גבוה מאוד (>70%)');
  if (statistics.hardwarePercent > 85) warnings.push('אחוז חומרה גבוה מאוד (>85%)');
  if (statistics.softwarePercent > 40) warnings.push('אחוז תוכנה גבוה מאוד (>40%)');
  if (statistics.profitByType.hardware.margin < 15) warnings.push('מרווח חומרה נמוך (<15%)');
  if (statistics.profitByType.labor.margin < 10) warnings.push('מרווח עבודה נמוך (<10%)');

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">סטטיסטיקת הצעת מחיר</h3>

        {/* Quotation Type Badge */}
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${quotationBadge.color}`}>
          {quotationBadge.text}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Validation Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-2">התראות</h4>
                <ul className="space-y-1 text-sm text-amber-800">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* HW:Engineering:Commissioning Ratio - Prominent Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">יחס חומרה : הנדסה : הרצה</p>
            <p className="text-3xl font-bold text-blue-900 font-mono tracking-wider">
              {statistics.hwEngineeringCommissioningRatio}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {dominantCategory.nameHe} דומיננטית ({dominantCategory.percent}%)
            </p>
          </div>
        </div>

        {/* Component Type Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hardware */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">חומרה</span>
              <span className="text-lg font-bold text-blue-600">{statistics.hardwarePercent}%</span>
            </div>
            <PercentageBar percent={statistics.hardwarePercent} color="bg-blue-500" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{statistics.componentCounts.hardware} פריטים</span>
              <span>מרווח: {statistics.profitByType.hardware.margin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Software */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">תוכנה</span>
              <span className="text-lg font-bold text-green-600">{statistics.softwarePercent}%</span>
            </div>
            <PercentageBar percent={statistics.softwarePercent} color="bg-green-500" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{statistics.componentCounts.software} פריטים</span>
              <span>מרווח: {statistics.profitByType.software.margin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Labor */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">עבודה</span>
              <span className="text-lg font-bold text-orange-600">{statistics.laborPercent}%</span>
            </div>
            <PercentageBar percent={statistics.laborPercent} color="bg-orange-500" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{statistics.componentCounts.labor} פריטים</span>
              <span>מרווח: {statistics.profitByType.labor.margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Labor Subtypes Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">פירוט עבודה</h4>
          <div className="grid grid-cols-3 gap-3">
            {/* Engineering */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.engineeringPercent}%</div>
              <div className="text-xs text-gray-600 mt-1">הנדסה</div>
            </div>

            {/* Commissioning */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.commissioningPercent}%</div>
              <div className="text-xs text-gray-600 mt-1">הרצה</div>
            </div>

            {/* Installation (if present) */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">
                {(statistics.laborPercent - statistics.engineeringPercent - statistics.commissioningPercent).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">התקנה</div>
            </div>
          </div>
        </div>

        {/* Material vs Labor Split */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">חומרים (חומרה + תוכנה)</p>
            <p className="text-3xl font-bold text-blue-700">{statistics.materialPercent}%</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
            <p className="text-sm text-gray-600 mb-1">עבודה</p>
            <p className="text-3xl font-bold text-orange-700">{statistics.laborOnlyPercent}%</p>
          </div>
        </div>

        {/* Robot Components (if applicable) */}
        {statistics.robotComponents && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-red-600" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">רכיבי רובוטיקה</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-xs text-gray-600">סכום: </span>
                    <span className="font-mono font-bold text-red-700">
                      ₪{statistics.robotComponents.totalCostILS.toLocaleString('he-IL')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">אחוז: </span>
                    <span className="font-bold text-red-700">
                      {statistics.robotComponents.percentOfTotal}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">פריטים: </span>
                    <span className="font-bold text-red-700">
                      {statistics.robotComponents.count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profit Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">סיכום רווחיות</h4>
          <div className="grid grid-cols-3 gap-4">
            {/* Hardware Profit */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">רווח חומרה</div>
              <div className="text-xl font-bold text-blue-600">
                ₪{statistics.profitByType.hardware.profit.toLocaleString('he-IL')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {statistics.profitByType.hardware.margin.toFixed(1)}% מרווח
              </div>
            </div>

            {/* Software Profit */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">רווח תוכנה</div>
              <div className="text-xl font-bold text-green-600">
                ₪{statistics.profitByType.software.profit.toLocaleString('he-IL')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {statistics.profitByType.software.margin.toFixed(1)}% מרווח
              </div>
            </div>

            {/* Labor Profit */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">רווח עבודה</div>
              <div className="text-xl font-bold text-orange-600">
                ₪{statistics.profitByType.labor.profit.toLocaleString('he-IL')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {statistics.profitByType.labor.margin.toFixed(1)}% מרווח
              </div>
            </div>
          </div>
        </div>

        {/* Summary Text */}
        <div className="text-center text-sm text-gray-600 border-t pt-4">
          <p>{getQuotationSummaryText(statistics)}</p>
        </div>
      </div>
    </div>
  );
}
