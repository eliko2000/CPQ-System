import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { DbQuotation, QuotationProject, QuotationSystem, QuotationItem } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CPQ-specific formatting utilities
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function calculateMargin(cost: number, price: number): number {
  return cost > 0 ? ((price - cost) / cost) * 100 : 0
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Convert DbQuotation (from Supabase) to QuotationProject (app format)
 */
export function convertDbQuotationToQuotationProject(dbQuotation: DbQuotation): QuotationProject {
  // Convert systems if they exist
  const systems: QuotationSystem[] = (dbQuotation.quotation_systems || []).map((dbSystem, index) => ({
    id: dbSystem.id,
    name: dbSystem.system_name,
    description: dbSystem.system_description,
    order: dbSystem.sort_order || index + 1,
    quantity: dbSystem.quantity || 1,
    createdAt: dbSystem.created_at
  }))

  // Convert items if they exist
  const items: QuotationItem[] = []
  let globalItemOrder = 1

  ;(dbQuotation.quotation_systems || []).forEach((dbSystem, systemIndex) => {
    const systemOrder = dbSystem.sort_order || systemIndex + 1

    ;(dbSystem.quotation_items || []).forEach((dbItem, itemIndex) => {
      const itemOrder = dbItem.sort_order || itemIndex + 1

      items.push({
        id: dbItem.id,
        systemId: dbSystem.id,
        systemOrder,
        itemOrder,
        displayNumber: `${systemOrder}.${itemOrder}`,
        componentId: dbItem.component_id,
        componentName: dbItem.item_name,
        componentCategory: dbItem.component?.category || 'כללי',
        isLabor: dbItem.item_name.toLowerCase().includes('labor') || dbItem.item_name.toLowerCase().includes('עבודה'),
        quantity: dbItem.quantity || 1,
        unitPriceUSD: dbItem.unit_cost || 0,
        unitPriceILS: (dbItem.unit_cost || 0) * (dbQuotation.exchange_rate || 3.7),
        totalPriceUSD: (dbItem.unit_cost || 0) * (dbItem.quantity || 1),
        totalPriceILS: (dbItem.unit_cost || 0) * (dbItem.quantity || 1) * (dbQuotation.exchange_rate || 3.7),
        itemMarkupPercent: dbItem.margin_percentage || dbQuotation.margin_percentage || 25,
        customerPriceILS: (dbItem.total_price || 0),
        notes: dbItem.notes,
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at
      })

      globalItemOrder++
    })
  })

  // Create QuotationProject
  return {
    id: dbQuotation.id,
    name: dbQuotation.project_name || 'הצעת מחיר',
    customerName: dbQuotation.customer_name,
    description: dbQuotation.project_description,
    status: dbQuotation.status === 'accepted' ? 'won' : dbQuotation.status === 'rejected' ? 'lost' : dbQuotation.status === 'sent' ? 'sent' : 'draft',
    createdAt: dbQuotation.created_at,
    updatedAt: dbQuotation.updated_at,
    systems,
    parameters: {
      usdToIlsRate: dbQuotation.exchange_rate || 3.7,
      eurToIlsRate: 4.0,
      markupPercent: dbQuotation.margin_percentage || 25,
      dayWorkCost: 1200,
      profitPercent: 20,
      riskPercent: 10,
      includeVAT: true,
      vatRate: 18,
      paymentTerms: dbQuotation.terms,
      deliveryTime: undefined
    },
    items,
    calculations: {
      totalHardwareUSD: 0,
      totalHardwareILS: 0,
      totalLaborUSD: 0,
      totalLaborILS: 0,
      subtotalUSD: 0,
      subtotalILS: 0,
      totalCustomerPriceILS: dbQuotation.total_price || 0,
      riskAdditionILS: 0,
      totalQuoteILS: dbQuotation.total_price || 0,
      totalVATILS: 0,
      finalTotalILS: dbQuotation.total_price || 0,
      totalCostILS: dbQuotation.total_cost || 0,
      totalProfitILS: (dbQuotation.total_price || 0) - (dbQuotation.total_cost || 0),
      profitMarginPercent: dbQuotation.total_cost ? ((dbQuotation.total_price || 0) - dbQuotation.total_cost) / dbQuotation.total_cost * 100 : 0
    }
  }
}