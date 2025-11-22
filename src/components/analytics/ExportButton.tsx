import { useState } from 'react';
import { Button } from '../ui/button';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import type {
  RevenueMetrics,
  MarginMetrics,
  ComponentAnalytics,
  LaborMetrics,
  CustomerMetrics
} from '../../utils/analyticsCalculations';

interface ExportButtonProps {
  revenue: RevenueMetrics;
  margin: MarginMetrics;
  component: ComponentAnalytics;
  labor: LaborMetrics;
  customer: CustomerMetrics;
  dateRange: { start: Date; end: Date };
}

export function ExportButton({ revenue, margin, component, labor, customer, dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();

      // === Sheet 1: Overview ===
      const overviewSheet = workbook.addWorksheet('סקירה כללית');

      overviewSheet.columns = [
        { header: 'מדד', key: 'metric', width: 35 },
        { header: 'ערך', key: 'value', width: 20 }
      ];

      // Make headers bold
      overviewSheet.getRow(1).font = { bold: true };

      overviewSheet.addRows([
        { metric: 'סה"כ הכנסות (₪)', value: revenue.totalRevenue },
        { metric: 'ערך צינור (₪)', value: revenue.pipelineValue },
        { metric: 'ממוצע הצעה (₪)', value: revenue.averageValue },
        { metric: 'ממוצע הצעה שזכתה (₪)', value: revenue.averageWonValue },
        { metric: 'הצעות שזכו', value: revenue.wonCount },
        { metric: 'הצעות שאבדו', value: revenue.lostCount },
        { metric: 'הצעות טיוטה', value: revenue.draftCount },
        { metric: 'הצעות שנשלחו', value: revenue.sentCount },
        { metric: 'מרווח ממוצע (%)', value: margin.averageMargin },
        { metric: 'מרווח מינימלי (%)', value: margin.minMargin.value },
        { metric: 'מרווח מקסימלי (%)', value: margin.maxMargin.value },
        { metric: 'סה"כ ימי עבודה', value: labor.totalLaborDays },
        { metric: 'סה"כ עלות עבודה (₪)', value: labor.totalLaborCostILS },
        { metric: 'אחוז עבודה ממוצע לכל הצעה (%)', value: labor.avgLaborPercentPerQuotation },
        { metric: 'הצעות דומיננטיות חומרה', value: labor.materialHeavyCount },
        { metric: 'הצעות דומיננטיות עבודה', value: labor.laborHeavyCount },
        { metric: 'סה"כ לקוחות', value: customer.totalCustomerCount },
        { metric: 'אחוז לקוחות חוזרים (%)', value: customer.repeatCustomerPercent },
        { metric: 'ממוצע פרויקטים ללקוח', value: customer.avgProjectsPerCustomer }
      ]);

      // Format numeric columns
      for (let i = 2; i <= 19; i++) {
        const cell = overviewSheet.getCell(`B${i}`);
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }

      // === Sheet 2: Revenue ===
      const revenueSheet = workbook.addWorksheet('הכנסות');

      // Revenue by month
      revenueSheet.columns = [
        { header: 'חודש', key: 'month', width: 15 },
        { header: 'הכנסה (₪)', key: 'revenue', width: 20 }
      ];

      revenueSheet.getRow(1).font = { bold: true };

      if (revenue.revenueByMonth.length > 0) {
        revenueSheet.addRows(revenue.revenueByMonth);
        revenueSheet.getColumn('revenue').numFmt = '#,##0.00';
      } else {
        revenueSheet.addRow({ month: 'אין נתונים', revenue: 0 });
      }

      // === Sheet 3: Margin Distribution ===
      const marginSheet = workbook.addWorksheet('מרווחים');

      marginSheet.columns = [
        { header: 'טווח מרווח', key: 'range', width: 20 },
        { header: 'מספר הצעות', key: 'count', width: 15 }
      ];

      marginSheet.getRow(1).font = { bold: true };

      if (margin.marginDistribution.length > 0) {
        marginSheet.addRows(margin.marginDistribution);
      }

      // Add margin by status section
      marginSheet.addRow([]);
      const statusHeaderRow = marginSheet.addRow({ range: 'מרווח לפי סטטוס:', count: '' });
      statusHeaderRow.font = { bold: true };

      if (margin.marginByStatus.length > 0) {
        margin.marginByStatus.forEach(status => {
          marginSheet.addRow({
            range: `${status.status} (${status.count} הצעות)`,
            count: status.avgMargin
          });
        });

        // Format percentage column for status section
        const startRow = marginSheet.rowCount - margin.marginByStatus.length + 1;
        for (let i = startRow; i <= marginSheet.rowCount; i++) {
          const cell = marginSheet.getCell(`B${i}`);
          if (typeof cell.value === 'number') {
            cell.numFmt = '0.0"%"';
          }
        }
      }

      // Add margin by type section
      marginSheet.addRow([]);
      const typeHeaderRow = marginSheet.addRow({ range: 'מרווח לפי סוג:', count: '' });
      typeHeaderRow.font = { bold: true };
      marginSheet.addRow({ range: 'חומרה (%)', count: margin.marginByType.hw });
      marginSheet.addRow({ range: 'תוכנה (%)', count: margin.marginByType.sw });
      marginSheet.addRow({ range: 'עבודה (%)', count: margin.marginByType.labor });

      // Format last 3 rows as percentages
      for (let i = marginSheet.rowCount - 2; i <= marginSheet.rowCount; i++) {
        const cell = marginSheet.getCell(`B${i}`);
        if (typeof cell.value === 'number') {
          cell.numFmt = '0.0"%"';
        }
      }

      // === Sheet 4: Components ===
      const componentSheet = workbook.addWorksheet('רכיבים');

      componentSheet.columns = [
        { header: 'שם רכיב', key: 'componentName', width: 45 },
        { header: 'כמות', key: 'totalQuantity', width: 15 },
        { header: 'סה"כ הוצאה (₪)', key: 'totalSpendILS', width: 20 },
        { header: 'מספר הצעות', key: 'quotationCount', width: 15 },
        { header: 'מחיר ממוצע (₪)', key: 'avgPriceILS', width: 20 }
      ];

      componentSheet.getRow(1).font = { bold: true };

      if (component.topComponents.length > 0) {
        componentSheet.addRows(component.topComponents);
        componentSheet.getColumn('totalSpendILS').numFmt = '#,##0.00';
        componentSheet.getColumn('avgPriceILS').numFmt = '#,##0.00';
      } else {
        componentSheet.addRow({
          componentName: 'אין נתונים',
          totalQuantity: 0,
          totalSpendILS: 0,
          quotationCount: 0,
          avgPriceILS: 0
        });
      }

      // Add usage by category section
      componentSheet.addRow([]);
      const categoryHeaderRow = componentSheet.addRow({
        componentName: 'שימוש לפי קטגוריה:',
        totalQuantity: '',
        totalSpendILS: '',
        quotationCount: '',
        avgPriceILS: ''
      });
      categoryHeaderRow.font = { bold: true };

      if (component.usageByCategory.length > 0) {
        component.usageByCategory.forEach(cat => {
          componentSheet.addRow({
            componentName: cat.category,
            totalQuantity: cat.count,
            totalSpendILS: cat.totalSpendILS,
            quotationCount: '',
            avgPriceILS: cat.percentOfTotal
          });
        });

        // Format currency for category section
        const categoryStartRow = componentSheet.rowCount - component.usageByCategory.length + 1;
        for (let i = categoryStartRow; i <= componentSheet.rowCount; i++) {
          componentSheet.getCell(`C${i}`).numFmt = '#,##0.00';
          componentSheet.getCell(`E${i}`).numFmt = '0.0"%"';
        }
      }

      // Add type ratio section
      componentSheet.addRow([]);
      const typeRatioHeaderRow = componentSheet.addRow({
        componentName: 'יחס סוגי רכיבים:',
        totalQuantity: '',
        totalSpendILS: '',
        quotationCount: '',
        avgPriceILS: ''
      });
      typeRatioHeaderRow.font = { bold: true };
      componentSheet.addRow({ componentName: 'חומרה (%)', totalQuantity: component.typeRatio.hardware });
      componentSheet.addRow({ componentName: 'תוכנה (%)', totalQuantity: component.typeRatio.software });
      componentSheet.addRow({ componentName: 'עבודה (%)', totalQuantity: component.typeRatio.labor });

      // Format last 3 rows
      for (let i = componentSheet.rowCount - 2; i <= componentSheet.rowCount; i++) {
        componentSheet.getCell(`B${i}`).numFmt = '0.0"%"';
      }

      // === Sheet 5: Labor ===
      const laborSheet = workbook.addWorksheet('עבודה');

      laborSheet.columns = [
        { header: 'סוג עבודה', key: 'type', width: 20 },
        { header: 'ימים', key: 'days', width: 15 },
        { header: 'עלות (₪)', key: 'cost', width: 20 },
        { header: 'אחוז', key: 'percent', width: 15 }
      ];

      laborSheet.getRow(1).font = { bold: true };

      laborSheet.addRows([
        {
          type: 'הנדסה',
          days: labor.laborBySubtype.engineering.days,
          cost: labor.laborBySubtype.engineering.costILS,
          percent: labor.laborBySubtype.engineering.percent / 100
        },
        {
          type: 'הרצה',
          days: labor.laborBySubtype.commissioning.days,
          cost: labor.laborBySubtype.commissioning.costILS,
          percent: labor.laborBySubtype.commissioning.percent / 100
        },
        {
          type: 'התקנה',
          days: labor.laborBySubtype.installation.days,
          cost: labor.laborBySubtype.installation.costILS,
          percent: labor.laborBySubtype.installation.percent / 100
        }
      ]);

      laborSheet.getColumn('days').numFmt = '0.0';
      laborSheet.getColumn('cost').numFmt = '#,##0.00';
      laborSheet.getColumn('percent').numFmt = '0.0%';

      // Add labor trend section
      if (labor.laborTrend.length > 0) {
        laborSheet.addRow([]);
        const trendHeaderRow = laborSheet.addRow({
          type: 'מגמת עלויות עבודה לפי חודש:',
          days: '',
          cost: '',
          percent: ''
        });
        trendHeaderRow.font = { bold: true };

        labor.laborTrend.forEach(trend => {
          laborSheet.addRow({
            type: trend.month,
            days: '',
            cost: trend.laborCostILS,
            percent: ''
          });
        });

        // Format currency for trend section
        const trendStartRow = laborSheet.rowCount - labor.laborTrend.length + 1;
        for (let i = trendStartRow; i <= laborSheet.rowCount; i++) {
          laborSheet.getCell(`C${i}`).numFmt = '#,##0.00';
        }
      }

      // === Sheet 6: Customers ===
      const customerSheet = workbook.addWorksheet('לקוחות');

      customerSheet.columns = [
        { header: 'שם לקוח', key: 'customerName', width: 40 },
        { header: 'סה"כ ערך (₪)', key: 'totalValue', width: 20 },
        { header: 'מספר הצעות', key: 'quotationCount', width: 15 },
        { header: 'הצעות שזכו', key: 'wonCount', width: 15 },
        { header: 'אחוז זכייה (%)', key: 'winRate', width: 15 },
        { header: 'ממוצע גודל פרויקט (₪)', key: 'avgProjectSize', width: 25 }
      ];

      customerSheet.getRow(1).font = { bold: true };

      if (customer.topCustomers.length > 0) {
        customerSheet.addRows(customer.topCustomers.map(c => ({
          customerName: c.customerName,
          totalValue: c.totalValueILS,
          quotationCount: c.quotationCount,
          wonCount: c.wonCount,
          winRate: c.winRate / 100,
          avgProjectSize: c.avgProjectSizeILS
        })));

        customerSheet.getColumn('totalValue').numFmt = '#,##0.00';
        customerSheet.getColumn('winRate').numFmt = '0.0%';
        customerSheet.getColumn('avgProjectSize').numFmt = '#,##0.00';
      } else {
        customerSheet.addRow({
          customerName: 'אין נתונים',
          totalValue: 0,
          quotationCount: 0,
          wonCount: 0,
          winRate: 0,
          avgProjectSize: 0
        });
      }

      // === Sheet 7: Most Valuable Components ===
      const valuableSheet = workbook.addWorksheet('רכיבים בעלי ערך גבוה');

      valuableSheet.columns = [
        { header: 'שם רכיב', key: 'componentName', width: 45 },
        { header: 'סה"כ ערך ללקוח (₪)', key: 'totalValue', width: 25 },
        { header: 'מספר הצעות', key: 'quotationCount', width: 15 }
      ];

      valuableSheet.getRow(1).font = { bold: true };

      if (component.mostValuableComponents.length > 0) {
        valuableSheet.addRows(component.mostValuableComponents.map(c => ({
          componentName: c.componentName,
          totalValue: c.totalValueILS,
          quotationCount: c.quotationCount
        })));

        valuableSheet.getColumn('totalValue').numFmt = '#,##0.00';
      } else {
        valuableSheet.addRow({
          componentName: 'אין נתונים',
          totalValue: 0,
          quotationCount: 0
        });
      }

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Format filename with date range
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      const filename = `analytics_${formatDate(dateRange.start)}_to_${formatDate(dateRange.end)}.xlsx`;
      link.download = filename;

      // Trigger download
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('שגיאה בייצוא הנתונים. אנא נסה שנית.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
    >
      {isExporting ? (
        <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          מייצא...
        </>
      ) : (
        <>
          <Download className="ml-2 h-4 w-4" />
          ייצוא לאקסל
        </>
      )}
    </Button>
  );
}
