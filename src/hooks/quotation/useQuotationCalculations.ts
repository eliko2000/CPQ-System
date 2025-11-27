import { useMemo } from 'react';
import { QuotationProject } from '../../types';
import { calculateQuotationTotals } from '../../utils/quotationCalculations';
import { calculateQuotationStatistics } from '../../utils/quotationStatistics';
import { logger } from '@/lib/logger';

export function useQuotationCalculations(
  currentQuotation: QuotationProject | null
) {
  // Calculate totals
  const calculations = useMemo(() => {
    if (!currentQuotation || !currentQuotation.parameters) return null;
    return calculateQuotationTotals(currentQuotation);
  }, [currentQuotation]);

  // Calculate statistics
  const statistics = useMemo(() => {
    logger.debug('🔍 STATISTICS CHECK:', {
      hasQuotation: !!currentQuotation,
      hasCalculations: !!calculations,
      itemsCount: currentQuotation?.items?.length || 0,
      systemsCount: currentQuotation?.systems?.length || 0,
      calculations: calculations,
    });

    if (!currentQuotation || !calculations) return null;

    // IMPORTANT: Ensure calculations are attached to the quotation object
    const quotationWithCalcs = {
      ...currentQuotation,
      calculations: calculations,
    };

    try {
      return calculateQuotationStatistics(quotationWithCalcs);
    } catch (error) {
      logger.error('Failed to calculate statistics:', error);
      return null;
    }
  }, [currentQuotation, calculations]);

  return {
    calculations,
    statistics,
  };
}
