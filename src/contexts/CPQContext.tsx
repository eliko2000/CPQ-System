import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import {
  Component,
  Assembly,
  Project,
  SupplierQuote,
  BOMLine,
  PricingRule,
  UIState,
  ModalState,
  QuotationProject
} from '../types'
import { useComponents } from '../hooks/useComponents'
import { useQuotations } from '../hooks/useQuotations'
import { useAssemblies } from '../hooks/useAssemblies'
import { convertDbQuotationToQuotationProject } from '../lib/utils'

// ============ State Shape ============
interface CPQState {
  // Core data
  components: Component[]
  assemblies: Assembly[]
  projects: Project[]
  supplierQuotes: SupplierQuote[]
  pricingRules: PricingRule[]

  // Quotation data
  quotations: QuotationProject[]
  currentQuotation: QuotationProject | null

  // Current project BOM being edited
  currentProjectBOM: BOMLine[]
  currentProject: Project | null

  // Viewing project detail
  viewingProjectId: string | null

  // UI state
  uiState: UIState
  modalState: ModalState

  // Loading states
  loading: {
    components: boolean
    assemblies: boolean
    projects: boolean
    quotes: boolean
    quotations: boolean
  }

  // Errors
  errors: string[]
}

// ============ Actions ============
type CPQAction =
  // Data loading
  | { type: 'SET_LOADING'; payload: { key: keyof CPQState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }

  // Components
  | { type: 'SET_COMPONENTS'; payload: Component[] }
  | { type: 'ADD_COMPONENT'; payload: Component }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; updates: Partial<Component> } }
  | { type: 'DELETE_COMPONENT'; payload: string }

  // Assemblies
  | { type: 'SET_ASSEMBLIES'; payload: Assembly[] }
  | { type: 'ADD_ASSEMBLY'; payload: Assembly }
  | { type: 'UPDATE_ASSEMBLY'; payload: { id: string; updates: Partial<Assembly> } }
  | { type: 'DELETE_ASSEMBLY'; payload: string }

  // Projects
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_VIEWING_PROJECT_ID'; payload: string | null }

  // Supplier Quotes
  | { type: 'SET_SUPPLIER_QUOTES'; payload: SupplierQuote[] }
  | { type: 'ADD_SUPPLIER_QUOTE'; payload: SupplierQuote }
  | { type: 'UPDATE_SUPPLIER_QUOTE'; payload: { id: string; updates: Partial<SupplierQuote> } }
  | { type: 'DELETE_SUPPLIER_QUOTE'; payload: string }

  // Quotations
  | { type: 'SET_QUOTATIONS'; payload: QuotationProject[] }
  | { type: 'ADD_QUOTATION'; payload: QuotationProject }
  | { type: 'UPDATE_QUOTATION'; payload: { id: string; updates: Partial<QuotationProject> } }
  | { type: 'DELETE_QUOTATION'; payload: string }
  | { type: 'SET_CURRENT_QUOTATION'; payload: QuotationProject | null }

  // BOM Management
  | { type: 'SET_CURRENT_BOM'; payload: BOMLine[] }
  | { type: 'ADD_BOM_ITEM'; payload: { item: BOMLine; parentId?: string } }
  | { type: 'UPDATE_BOM_ITEM'; payload: { id: string; updates: Partial<BOMLine> } }
  | { type: 'DELETE_BOM_ITEM'; payload: string }
  | { type: 'REORDER_BOM_ITEMS'; payload: { fromIndex: number; toIndex: number } }

  // Pricing Rules
  | { type: 'SET_PRICING_RULES'; payload: PricingRule[] }
  | { type: 'ADD_PRICING_RULE'; payload: PricingRule }
  | { type: 'UPDATE_PRICING_RULE'; payload: { id: string; updates: Partial<PricingRule> } }
  | { type: 'DELETE_PRICING_RULE'; payload: string }

  // UI State
  | { type: 'SET_ACTIVE_VIEW'; payload: UIState['activeView'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_MODAL'; payload: ModalState }
  | { type: 'CLOSE_MODAL' }

// ============ Demo Data ============
// Preserved for future reference - uncomment if needed
/* const demoQuotations: QuotationProject[] = [
  {
    id: 'quote_demo_1',
    name: 'הצעת מחיר - מערכת בקרה תעשייתית',
    customerName: 'תעשיות מתקדמות בע"מ',
    status: 'draft',
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
        systems: [
          {
            id: 'system_1',
            name: 'מערכת בקרה ראשית',
            description: 'מערכת בקרה מרכזית עם PLC ופאנל אופרטור',
            order: 1,
            quantity: 1,
            createdAt: '2024-01-15T10:00:00Z'
          },
          {
            id: 'system_2',
            name: 'מערכת כוח',
            description: 'ספקי כוח וממירים למערכת',
            order: 2,
            quantity: 1,
            createdAt: '2024-01-15T10:00:00Z'
          },
          {
            id: 'system_3',
            name: 'מערכת בטיחות',
            description: 'חיישנים ומגננים לבטיחות המערכת',
            order: 3,
            quantity: 1,
            createdAt: '2024-01-15T10:00:00Z'
          }
        ],
    parameters: {
      usdToIlsRate: 3.7,
      eurToIlsRate: 4.0,
      markupPercent: 0.75,
      dayWorkCost: 1200,
      profitPercent: 20,
      riskPercent: 5,
      deliveryTime: '4-6 שבועות',
      includeVAT: true,
      vatRate: 18
    },
    items: [
      {
        id: 'item_1',
        systemId: 'system_1',
        systemOrder: 1,
        itemOrder: 1,
        displayNumber: '1.1',
        componentName: 'בקר PLC S7-1200',
        componentCategory: 'בקרים (PLCs)',
        itemType: 'hardware',
        quantity: 1,
        unitPriceUSD: 1610,
        unitPriceILS: 5957,
        totalPriceUSD: 1610,
        totalPriceILS: 5957,
        itemMarkupPercent: 25,
        customerPriceILS: 7446,
        notes: 'כולל תקשורת PROFINET',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_2',
        systemId: 'system_1',
        systemOrder: 1,
        itemOrder: 2,
        displayNumber: '1.2',
        componentName: 'מסוף HMI טאצ\' 7 אינץ\'',
        componentCategory: 'בקרים',
        itemType: 'hardware',
        quantity: 1,
        unitPriceUSD: 890,
        unitPriceILS: 3293,
        totalPriceUSD: 890,
        totalPriceILS: 3293,
        itemMarkupPercent: 25,
        customerPriceILS: 4116,
        notes: 'תצוגה צבעונית עם מגע',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_3',
        systemId: 'system_2',
        systemOrder: 2,
        itemOrder: 1,
        displayNumber: '2.1',
        componentName: 'חיישן טמפרטורה PT100',
        componentCategory: 'חיישנים',
        itemType: 'hardware',
        quantity: 4,
        unitPriceUSD: 125,
        unitPriceILS: 463,
        totalPriceUSD: 500,
        totalPriceILS: 1852,
        itemMarkupPercent: 25,
        customerPriceILS: 2315,
        notes: 'טווח מדידה: -50°C עד 500°C',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_4',
        systemId: 'system_2',
        systemOrder: 2,
        itemOrder: 2,
        displayNumber: '2.2',
        componentName: 'חיישן לחץ דיפרנציאלי',
        componentCategory: 'חיישנים',
        itemType: 'hardware',
        quantity: 2,
        unitPriceUSD: 89,
        unitPriceILS: 329,
        totalPriceUSD: 178,
        totalPriceILS: 658,
        itemMarkupPercent: 25,
        customerPriceILS: 823,
        notes: 'טווח: 0-10 בר, פלט: 4-20mA',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_5',
        systemId: 'system_3',
        systemOrder: 3,
        itemOrder: 1,
        displayNumber: '3.1',
        componentName: 'ספק כוח 24VDC 10A',
        componentCategory: 'ספקי כוח',
        itemType: 'hardware',
        quantity: 2,
        unitPriceUSD: 189,
        unitPriceILS: 699,
        totalPriceUSD: 378,
        totalPriceILS: 1398,
        itemMarkupPercent: 25,
        customerPriceILS: 1748,
        notes: 'מתג הפרעות, הספק: 240W',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_6',
        systemId: 'system_3',
        systemOrder: 3,
        itemOrder: 2,
        displayNumber: '3.2',
        componentName: 'מפסק חשמלי מוגן',
        componentCategory: 'בטיחות',
        itemType: 'hardware',
        quantity: 3,
        unitPriceUSD: 78,
        unitPriceILS: 289,
        totalPriceUSD: 234,
        totalPriceILS: 867,
        itemMarkupPercent: 25,
        customerPriceILS: 1084,
        notes: 'דירוג: 14A, הגנה תרמית ומגנטית',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      },
      {
        id: 'item_7',
        systemId: 'system_1',
        systemOrder: 1,
        itemOrder: 3,
        displayNumber: '1.3',
        componentName: 'עבודת התקנה - בקר ו-HMI',
        componentCategory: 'עבודה',
        itemType: 'labor',
        laborSubtype: 'installation',
        quantity: 2,
        unitPriceUSD: 324,
        unitPriceILS: 1200,
        totalPriceUSD: 648,
        totalPriceILS: 2400,
        itemMarkupPercent: 25,
        customerPriceILS: 3000,
        notes: 'התקנה וחיווט בסיסי של בקר ופאנל',
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z'
      }
    ],
        calculations: {
          totalHardwareUSD: 0,
          totalHardwareILS: 0,
          totalSoftwareUSD: 0,
          totalSoftwareILS: 0,
          totalLaborUSD: 0,
          totalLaborILS: 0,
          totalEngineeringILS: 0,
          totalCommissioningILS: 0,
          totalInstallationILS: 0,
          totalProgrammingILS: 0,
          subtotalUSD: 0,
          subtotalILS: 0,
          totalCustomerPriceILS: 0,
          riskAdditionILS: 0,
          totalQuoteILS: 0,
          totalVATILS: 0,
          finalTotalILS: 0,
          totalCostILS: 0,
          totalProfitILS: 0,
          profitMarginPercent: 0
        }
  }
] */

/* const demoComponents: Component[] = [
  {
    id: 'comp_1',
    name: 'שסתום סולנואידי 2 דרכי',
    description: 'שסתום סולנואידי תעשייתי עם 2 דרכי זרימה',
    category: 'שסתומים',
    productType: 'שסתומים',
    manufacturer: 'Siemens',
    manufacturerPN: '6ES7214-1AG40-0XB0',
    supplier: 'אלקטרוניקה ישראלית',
    unitCostNIS: 1250.00,
    unitCostUSD: 350.00,
    currency: 'NIS',
    originalCost: 1200.00,
    quoteDate: '2024-01-15',
    quoteFileUrl: '',
    notes: 'מוצר במלאי, זמן אספקה מיידי',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'comp_2',
    name: 'חיישן טמפרטורה PT100',
    description: 'חיישן טמפרטורה עמיד RTD עם דיוק ±0.1°C',
    category: 'חיישנים',
    productType: 'חיישנים',
    manufacturer: 'Omega',
    manufacturerPN: 'PT100-A-1M',
    supplier: 'סנסור טכנולוגיות',
    unitCostNIS: 450.00,
    unitCostUSD: 125.00,
    currency: 'NIS',
    originalCost: 420.00,
    quoteDate: '2024-01-20',
    quoteFileUrl: '',
    notes: 'טווח מדידה: -50°C עד 500°C',
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 'comp_3',
    name: 'מנוע חשמלי 3 פאזה',
    description: 'מנוע חשמלי תעשייתי 3 פאזה, 1.5 קו"ט',
    category: 'מנועים',
    productType: 'מנועים',
    manufacturer: 'ABB',
    manufacturerPN: 'M3BP-160M4A',
    supplier: 'מוטור אלקטריק',
    unitCostNIS: 3200.00,
    unitCostUSD: 890.00,
    currency: 'NIS',
    originalCost: 3100.00,
    quoteDate: '2024-01-10',
    quoteFileUrl: '',
    notes: 'מהירות: 1500 סל"ד, יעילות: 88%',
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-10T09:15:00Z'
  },
  {
    id: 'comp_4',
    name: 'בקר PLC S7-1200',
    description: 'בקר לוגי תכנותי עם תקשורת PROFINET',
    category: 'בקרים (PLCs)',
    productType: 'בקרים',
    manufacturer: 'Siemens',
    manufacturerPN: '6ES7214-1AG40-0XB0',
    supplier: 'אוטומציה ישראל',
    unitCostNIS: 5800.00,
    unitCostUSD: 1610.00,
    currency: 'NIS',
    originalCost: 5600.00,
    quoteDate: '2024-01-25',
    quoteFileUrl: '',
    notes: 'זיכרון: 100KB, כניסות/יציאות: 14/10',
    createdAt: '2024-01-25T11:45:00Z',
    updatedAt: '2024-01-25T11:45:00Z'
  },
  {
    id: 'comp_5',
    name: 'ספק כוח 24VDC 10A',
    description: 'ספק כוח מתג הפרעות ליישומי בקרה',
    category: 'ספקי כוח',
    productType: 'ספקי כוח',
    manufacturer: 'Phoenix Contact',
    manufacturerPN: '2941112',
    supplier: 'פאוור סופליי',
    unitCostNIS: 680.00,
    unitCostUSD: 189.00,
    currency: 'NIS',
    originalCost: 650.00,
    quoteDate: '2024-01-18',
    quoteFileUrl: '',
    notes: 'יציאה: 24V DC, הספק: 240W',
    createdAt: '2024-01-18T16:20:00Z',
    updatedAt: '2024-01-18T16:20:00Z'
  },
  {
    id: 'comp_6',
    name: 'מפסק חשמלי מוגן',
    description: 'מפסק חשמלי תעשייתי עם הגנת עומס יתר',
    category: 'בטיחות',
    productType: 'בטיחות',
    manufacturer: 'Schneider Electric',
    manufacturerPN: 'GV2ME14',
    supplier: 'חשמל תעשייתי',
    unitCostNIS: 280.00,
    unitCostUSD: 78.00,
    currency: 'NIS',
    originalCost: 265.00,
    quoteDate: '2024-02-01',
    quoteFileUrl: '',
    notes: 'דירוג: 14A, הגנה תרמית ומגנטית',
    createdAt: '2024-02-01T09:30:00Z',
    updatedAt: '2024-02-01T09:30:00Z'
  },
  {
    id: 'comp_7',
    name: 'כבל תקשורת PROFINET',
    description: 'כבל תקשורת תעשייתי עם מגן',
    category: 'כבלים ומחברים',
    productType: 'כבלים ומחברים',
    manufacturer: 'Hirschmann',
    manufacturerPN: '1944030001',
    supplier: 'תקשורת תעשייתית',
    unitCostNIS: 45.00,
    unitCostUSD: 12.50,
    currency: 'NIS',
    originalCost: 42.00,
    quoteDate: '2024-02-05',
    quoteFileUrl: '',
    notes: 'אורך: 2 מטר, CAT6A, IP67',
    createdAt: '2024-02-05T13:15:00Z',
    updatedAt: '2024-02-05T13:15:00Z'
  },
  {
    id: 'comp_8',
    name: 'אקטואטור ליניארי חשמלי',
    description: 'אקטואטור ליניארי עם מנוע סטפר',
    category: 'אקטואטורים',
    productType: 'אקטואטורים',
    manufacturer: 'Parker',
    manufacturerPN: 'ETB08-050',
    supplier: 'מוטור טכנולוגיות',
    unitCostNIS: 2100.00,
    unitCostUSD: 585.00,
    currency: 'NIS',
    originalCost: 2050.00,
    quoteDate: '2024-02-10',
    quoteFileUrl: '',
    notes: 'טווח תנועה: 50 מ"מ, כוח: 500N',
    createdAt: '2024-02-10T11:20:00Z',
    updatedAt: '2024-02-10T11:20:00Z'
  },
  {
    id: 'comp_9',
    name: 'ממיר תדירות VFD',
    description: 'ממיר תדירות לשליטה במהירות מנועים',
    category: 'בקרים',
    productType: 'בקרים',
    manufacturer: 'Danfoss',
    manufacturerPN: 'FC-051',
    supplier: 'דנפוס ישראל',
    unitCostNIS: 1850.00,
    unitCostUSD: 515.00,
    currency: 'NIS',
    originalCost: 1780.00,
    quoteDate: '2024-02-12',
    quoteFileUrl: '',
    notes: 'הספק: 0.75 קו"ט, 380-480V',
    createdAt: '2024-02-12T15:45:00Z',
    updatedAt: '2024-02-12T15:45:00Z'
  },
  {
    id: 'comp_10',
    name: 'חיישן לחץ דיפרנציאלי',
    description: 'חיישן לחץ דיפרנציאלי תעשייתי',
    category: 'חיישנים',
    productType: 'חיישנים',
    manufacturer: 'WIKA',
    manufacturerPN: 'A-10',
    supplier: 'מדידות תעשייתיות',
    unitCostNIS: 320.00,
    unitCostUSD: 89.00,
    currency: 'NIS',
    originalCost: 305.00,
    quoteDate: '2024-02-15',
    quoteFileUrl: '',
    notes: 'טווח: 0-10 בר, פלט: 4-20mA',
    createdAt: '2024-02-15T10:30:00Z',
    updatedAt: '2024-02-15T10:30:00Z'
  },
  {
    id: 'comp_11',
    name: 'ממסר חשמלי SSR',
    description: 'ממסר מצב מוצק למערכות בקרה',
    category: 'בקרים',
    productType: 'בקרים',
    manufacturer: 'Omron',
    manufacturerPN: 'G3NA-210B',
    supplier: 'אומרון ישראל',
    unitCostNIS: 180.00,
    unitCostUSD: 50.00,
    currency: 'NIS',
    originalCost: 170.00,
    quoteDate: '2024-02-18',
    quoteFileUrl: '',
    notes: 'זרם: 10A, מתח: 24-280V AC',
    createdAt: '2024-02-18T14:20:00Z',
    updatedAt: '2024-02-18T14:20:00Z'
  },
  {
    id: 'comp_12',
    name: 'מסוף HMI טאצ\' 7 אינץ\'',
    description: 'מסוף אנושי עם מסך מגע צבעוני',
    category: 'בקרים',
    productType: 'בקרים',
    manufacturer: 'Siemens',
    manufacturerPN: '6AV2124-0GC01-0AX0',
    supplier: 'סימנס ישראל',
    unitCostNIS: 3200.00,
    unitCostUSD: 890.00,
    currency: 'NIS',
    originalCost: 3100.00,
    quoteDate: '2024-02-20',
    quoteFileUrl: '',
    notes: 'תצוגה: 800x480, תקשורת: PROFINET',
    createdAt: '2024-02-20T12:10:00Z',
    updatedAt: '2024-02-20T12:10:00Z'
  },
  {
    id: 'comp_13',
    name: 'מגבר אות אנלוגי',
    description: 'מגבר אות לחיישנים אנלוגיים',
    category: 'בקרים',
    productType: 'בקרים',
    manufacturer: 'Turck',
    manufacturerPN: 'NI8-U-EX',
    supplier: 'טורק ישראל',
    unitCostNIS: 420.00,
    unitCostUSD: 117.00,
    currency: 'NIS',
    originalCost: 400.00,
    quoteDate: '2024-02-22',
    quoteFileUrl: '',
    notes: 'כניסה: 0-10V, יציאה: 4-20mA',
    createdAt: '2024-02-22T16:30:00Z',
    updatedAt: '2024-02-22T16:30:00Z'
  },
  {
    id: 'comp_14',
    name: 'מנוע סטפר NEMA 23',
    description: 'מנוע סטפר תעשייתי באיכות גבוהה',
    category: 'מנועים',
    productType: 'מנועים',
    manufacturer: 'Oriental Motor',
    manufacturerPN: 'PK268-02A',
    supplier: 'מוטור אוריינטל',
    unitCostNIS: 580.00,
    unitCostUSD: 161.00,
    currency: 'NIS',
    originalCost: 560.00,
    quoteDate: '2024-02-25',
    quoteFileUrl: '',
    notes: 'זוגיות: 200, זרם: 2A/פאזה',
    createdAt: '2024-02-25T09:45:00Z',
    updatedAt: '2024-02-25T09:45:00Z'
  },
  {
    id: 'comp_15',
    name: 'ספק כוח רגולטורי',
    description: 'ספק כוח רגולטורי עם פלט יציב',
    category: 'ספקי כוח',
    productType: 'ספקי כוח',
    manufacturer: 'Mean Well',
    manufacturerPN: 'LRS-75-24',
    supplier: 'מין וול ישראל',
    unitCostNIS: 95.00,
    unitCostUSD: 26.50,
    currency: 'NIS',
    originalCost: 90.00,
    quoteDate: '2024-02-28',
    quoteFileUrl: '',
    notes: 'יציאה: 24V DC, 3.1A, 75W',
    createdAt: '2024-02-28T13:20:00Z',
    updatedAt: '2024-02-28T13:20:00Z'
  },
  {
    id: 'comp_16',
    name: 'מחבר חשמלי M12',
    description: 'מחבר חשמלי תעשייתי עם הגנה',
    category: 'כבלים ומחברים',
    productType: 'כבלים ומחברים',
    manufacturer: 'Lapp',
    manufacturerPN: '1570124',
    supplier: 'לאפ ישראל',
    unitCostNIS: 28.00,
    unitCostUSD: 7.80,
    currency: 'NIS',
    originalCost: 26.00,
    quoteDate: '2024-03-01',
    quoteFileUrl: '',
    notes: '4 פינים, IP67, זהב',
    createdAt: '2024-03-01T11:15:00Z',
    updatedAt: '2024-03-01T11:15:00Z'
  },
  {
    id: 'comp_17',
    name: 'חיישן קרבה אינדוקטיבי',
    description: 'חיישן קרבה לזיהוי מתכות',
    category: 'חיישנים',
    productType: 'חיישנים',
    manufacturer: 'Pepperl+Fuchs',
    manufacturerPN: 'NBB4-12GM50-E2',
    supplier: 'פפרל אנד פוקס',
    unitCostNIS: 150.00,
    unitCostUSD: 42.00,
    currency: 'NIS',
    originalCost: 145.00,
    quoteDate: '2024-03-03',
    quoteFileUrl: '',
    notes: 'טווח: 4 מ"מ, M12, PNP',
    createdAt: '2024-03-03T14:40:00Z',
    updatedAt: '2024-03-03T14:40:00Z'
  },
  {
    id: 'comp_18',
    name: 'ברז אוויר דיגיטלי',
    description: 'ברז אוויר עם שליטה דיגיטלית',
    category: 'אקטואטורים',
    productType: 'אקטואטורים',
    manufacturer: 'SMC',
    manufacturerPN: 'SY3000',
    supplier: 'SMC ישראל',
    unitCostNIS: 380.00,
    unitCostUSD: 106.00,
    currency: 'NIS',
    originalCost: 365.00,
    quoteDate: '2024-03-05',
    quoteFileUrl: '',
    notes: '5/2 דרכי, 24V DC, ידית ידנית',
    createdAt: '2024-03-05T10:25:00Z',
    updatedAt: '2024-03-05T10:25:00Z'
  },
  {
    id: 'comp_19',
    name: 'ממיר USB ל-RS485',
    description: 'ממיר תקשורת לחיבור ציוד תעשייתי',
    category: 'תקשורת',
    productType: 'תקשורת',
    manufacturer: 'Advantech',
    manufacturerPN: 'ADAM-4561',
    supplier: 'אדוונטק ישראל',
    unitCostNIS: 220.00,
    unitCostUSD: 61.00,
    currency: 'NIS',
    originalCost: 210.00,
    quoteDate: '2024-03-07',
    quoteFileUrl: '',
    notes: 'בידוד: 2000VDC, תקשורת: Modbus RTU',
    createdAt: '2024-03-07T15:50:00Z',
    updatedAt: '2024-03-07T15:50:00Z'
  },
  {
    id: 'comp_20',
    name: 'מנוע DC עם גיר הילוכים',
    description: 'מנוע DC עם גיר הילוכים משולב',
    category: 'מנועים',
    productType: 'מנועים',
    manufacturer: 'Maxon',
    manufacturerPN: 'GP 32 C',
    supplier: 'מקסון ישראל',
    unitCostNIS: 850.00,
    unitCostUSD: 236.00,
    currency: 'NIS',
    originalCost: 820.00,
    quoteDate: '2024-03-10',
    quoteFileUrl: '',
    notes: 'יחס הילוכים: 1:51, מתח: 24V',
    createdAt: '2024-03-10T12:35:00Z',
    updatedAt: '2024-03-10T12:35:00Z'
  },
  {
    id: 'comp_21',
    name: 'מתג גבול מכני',
    description: 'מתג גבול תעשייתי עמיד',
    category: 'בטיחות',
    productType: 'בטיחות',
    manufacturer: 'Honeywell',
    manufacturerPN: 'BZ-2RW71-A2',
    supplier: 'הוניוול ישראל',
    unitCostNIS: 65.00,
    unitCostUSD: 18.00,
    currency: 'NIS',
    originalCost: 62.00,
    quoteDate: '2024-03-12',
    quoteFileUrl: '',
    notes: 'מגע: SPDT, דירוג IP67',
    createdAt: '2024-03-12T09:20:00Z',
    updatedAt: '2024-03-12T09:20:00Z'
  },
  {
    id: 'comp_22',
    name: 'כרטיס כניסות אנלוגיות',
    description: 'כרטיס הרחבה לכניסות אנלוגיות',
    category: 'בקרים',
    productType: 'בקרים',
    manufacturer: 'Wago',
    manufacturerPN: '750-459',
    supplier: 'ואגו ישראל',
    unitCostNIS: 450.00,
    unitCostUSD: 125.00,
    currency: 'NIS',
    originalCost: 430.00,
    quoteDate: '2024-03-14',
    quoteFileUrl: '',
    notes: '8 כניסות, 0-10V, 16 ביט',
    createdAt: '2024-03-14T14:10:00Z',
    updatedAt: '2024-03-14T14:10:00Z'
  },
  {
    id: 'comp_23',
    name: 'צינור פנאומטי PU',
    description: 'צינור פנאומטי גמיש עמיד',
    category: 'כבלים ומחברים',
    productType: 'כבלים ומחברים',
    manufacturer: 'Festo',
    manufacturerPN: 'PU-4',
    supplier: 'פסטו ישראל',
    unitCostNIS: 12.00,
    unitCostUSD: 3.35,
    currency: 'NIS',
    originalCost: 11.00,
    quoteDate: '2024-03-16',
    quoteFileUrl: '',
    notes: 'קוטר: 4 מ"מ, אורך: מטר',
    createdAt: '2024-03-16T11:45:00Z',
    updatedAt: '2024-03-16T11:45:00Z'
  },
  {
    id: 'comp_24',
    name: 'חיישן זרימה אולטראסוני',
    description: 'חיישן זרימה לנוזלים לא מוליכים',
    category: 'חיישנים',
    productType: 'חיישנים',
    manufacturer: 'Krohne',
    manufacturerPN: 'OPTIFLUX 2000',
    supplier: 'קרונה ישראל',
    unitCostNIS: 2800.00,
    unitCostUSD: 778.00,
    currency: 'NIS',
    originalCost: 2700.00,
    quoteDate: '2024-03-18',
    quoteFileUrl: '',
    notes: 'קוטר: DN50, דיוק: ±0.5%',
    createdAt: '2024-03-18T16:25:00Z',
    updatedAt: '2024-03-18T16:25:00Z'
  },
  {
    id: 'comp_25',
    name: 'מנעול אלקטרומכני',
    description: 'מנעול אלקטרומכני לשערים',
    category: 'בטיחות',
    productType: 'בטיחות',
    manufacturer: 'ABB',
    manufacturerPN: 'GSR140',
    supplier: 'ABB ישראל',
    unitCostNIS: 420.00,
    unitCostUSD: 117.00,
    currency: 'NIS',
    originalCost: 400.00,
    quoteDate: '2024-03-20',
    quoteFileUrl: '',
    notes: 'מתח: 24V DC, 2 נתיבים',
    createdAt: '2024-03-20T13:15:00Z',
    updatedAt: '2024-03-20T13:15:00Z'
  },
  {
    id: 'comp_26',
    name: 'מודול תקשורת Ethernet',
    description: 'מודול תקשורת לרשת Ethernet',
    category: 'תקשורת',
    productType: 'תקשורת',
    manufacturer: 'Cisco',
    manufacturerPN: 'IE-2000-4T',
    supplier: 'סיסקו ישראל',
    unitCostNIS: 1200.00,
    unitCostUSD: 334.00,
    currency: 'NIS',
    originalCost: 1150.00,
    quoteDate: '2024-03-22',
    quoteFileUrl: '',
    notes: '4 פורטים, Industrial Ethernet, IP30',
    createdAt: '2024-03-22T10:40:00Z',
    updatedAt: '2024-03-22T10:40:00Z'
  },
  {
    id: 'comp_27',
    name: 'מאוורר תעשייתי 120 מ"מ',
    description: 'מאוורר קירור תעשייתי איכותי',
    category: 'מכני',
    productType: 'מכני',
    manufacturer: 'Papst',
    manufacturerPN: '4412F/2HHP',
    supplier: 'פפסט ישראל',
    unitCostNIS: 85.00,
    unitCostUSD: 23.60,
    currency: 'NIS',
    originalCost: 80.00,
    quoteDate: '2024-03-24',
    quoteFileUrl: '',
    notes: 'מתח: 230V AC, זרימת אוויר: 85 CFM',
    createdAt: '2024-03-24T15:30:00Z',
    updatedAt: '2024-03-24T15:30:00Z'
  },
  {
    id: 'comp_28',
    name: 'מתג רגל מצוף',
    description: 'מתג רגל מצוף למערכות בקרה',
    category: 'בטיחות',
    productType: 'בטיחות',
    manufacturer: 'Schmersal',
    manufacturerPN: 'AZM300',
    supplier: 'שמרזל ישראל',
    unitCostNIS: 650.00,
    unitCostUSD: 181.00,
    currency: 'NIS',
    originalCost: 620.00,
    quoteDate: '2024-03-26',
    quoteFileUrl: '',
    notes: 'קטגוריה: 4, נעילה מכנית',
    createdAt: '2024-03-26T12:05:00Z',
    updatedAt: '2024-03-26T12:05:00Z'
  },
  {
    id: 'comp_29',
    name: 'כרטיס זיכרון SD תעשייתי',
    description: 'כרטיס זיכרון לאחסון נתונים',
    category: 'תקשורת',
    productType: 'תקשורת',
    manufacturer: 'Swissbit',
    manufacturerPN: 'S-280',
    supplier: 'סוויסביט ישראל',
    unitCostNIS: 180.00,
    unitCostUSD: 50.00,
    currency: 'NIS',
    originalCost: 170.00,
    quoteDate: '2024-03-28',
    quoteFileUrl: '',
    notes: 'נפח: 8GB, טמפרטורה: -40°C עד 85°C',
    createdAt: '2024-03-28T14:50:00Z',
    updatedAt: '2024-03-28T14:50:00Z'
  },
  {
    id: 'comp_30',
    name: 'מפצל אות חשמלי',
    description: 'מפצל אות למערכות בקרה',
    category: 'כבלים ומחברים',
    productType: 'כבלים ומחברים',
    manufacturer: 'Phoenix Contact',
    manufacturerPN: '2857197',
    supplier: 'פיניקס קונטקט',
    unitCostNIS: 35.00,
    unitCostUSD: 9.75,
    currency: 'NIS',
    originalCost: 33.00,
    quoteDate: '2024-03-30',
    quoteFileUrl: '',
    notes: '4 יציאות, 0-10V, DIN רכב',
    createdAt: '2024-03-30T11:20:00Z',
    updatedAt: '2024-03-30T11:20:00Z'
  }
] */

// ============ Reducer ============
const initialState: CPQState = {
  components: [], // Will be loaded from Supabase
  assemblies: [],
  projects: [],
  supplierQuotes: [],
  pricingRules: [],
  quotations: [], // Will be loaded from Supabase
  currentQuotation: null,
  currentProjectBOM: [],
  currentProject: null,
  viewingProjectId: null,
  uiState: {
    activeView: 'dashboard',
    sidebarCollapsed: false,
    theme: 'system',
    loading: {
      components: false,
      quotes: false,
      projects: false,
    },
    errors: [],
  },
  modalState: {
    type: null,
    data: null,
  },
  loading: {
    components: false,
    assemblies: false,
    projects: false,
    quotes: false,
    quotations: false,
  },
  errors: [],
}

function cpqReducer(state: CPQState, action: CPQAction): CPQState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      }

    case 'SET_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
      }

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      }

    case 'SET_COMPONENTS':
      return {
        ...state,
        components: action.payload,
      }

    case 'ADD_COMPONENT':
      return {
        ...state,
        components: [...state.components, action.payload],
      }

    case 'UPDATE_COMPONENT':
      return {
        ...state,
        components: state.components.map(comp =>
          comp.id === action.payload.id
            ? { ...comp, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : comp
        ),
      }

    case 'DELETE_COMPONENT':
      return {
        ...state,
        components: state.components.filter(comp => comp.id !== action.payload),
      }

    case 'SET_ASSEMBLIES':
      return {
        ...state,
        assemblies: action.payload,
      }

    case 'ADD_ASSEMBLY':
      return {
        ...state,
        assemblies: [...state.assemblies, action.payload],
      }

    case 'UPDATE_ASSEMBLY':
      return {
        ...state,
        assemblies: state.assemblies.map(assembly =>
          assembly.id === action.payload.id
            ? { ...assembly, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : assembly
        ),
      }

    case 'DELETE_ASSEMBLY':
      return {
        ...state,
        assemblies: state.assemblies.filter(assembly => assembly.id !== action.payload),
      }

    case 'SET_PROJECTS':
      return {
        ...state,
        projects: action.payload,
      }

    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload],
      }

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id
            ? { ...project, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : project
        ),
      }

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      }

    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProject: action.payload,
        currentProjectBOM: action.payload ? [] : [],
      }

    case 'SET_VIEWING_PROJECT_ID':
      return {
        ...state,
        viewingProjectId: action.payload,
      }

    case 'SET_CURRENT_QUOTATION':
      return {
        ...state,
        currentQuotation: action.payload,
      }

    case 'SET_QUOTATIONS':
      return {
        ...state,
        quotations: action.payload,
      }

    case 'ADD_QUOTATION':
      return {
        ...state,
        quotations: [...state.quotations, action.payload],
      }

    case 'UPDATE_QUOTATION':
      return {
        ...state,
        quotations: state.quotations.map(quotation =>
          quotation.id === action.payload.id
            ? { ...quotation, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : quotation
        ),
      }

    case 'DELETE_QUOTATION':
      return {
        ...state,
        quotations: state.quotations.filter(quotation => quotation.id !== action.payload),
      }

    case 'SET_SUPPLIER_QUOTES':
      return {
        ...state,
        supplierQuotes: action.payload,
      }

    case 'ADD_SUPPLIER_QUOTE':
      return {
        ...state,
        supplierQuotes: [...state.supplierQuotes, action.payload],
      }

    case 'SET_CURRENT_BOM':
      return {
        ...state,
        currentProjectBOM: action.payload,
      }

    case 'ADD_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: [...state.currentProjectBOM, action.payload.item],
      }

    case 'UPDATE_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: state.currentProjectBOM.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      }

    case 'DELETE_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: state.currentProjectBOM.filter(item => item.id !== action.payload),
      }

    case 'SET_ACTIVE_VIEW':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          activeView: action.payload,
        },
      }

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          sidebarCollapsed: !state.uiState.sidebarCollapsed,
        },
      }

    case 'SET_MODAL':
      return {
        ...state,
        modalState: action.payload,
      }

    case 'CLOSE_MODAL':
      return {
        ...state,
        modalState: {
          type: null,
          data: null,
        },
      }

    default:
      return state
  }
}

// ============ Context ============
interface CPQContextType extends CPQState {
  // Actions
  setLoading: (key: keyof CPQState['loading'], value: boolean) => void
  setError: (error: string) => void
  clearErrors: () => void

  // Component actions
  addComponent: (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateComponent: (id: string, updates: Partial<Component>) => Promise<void>
  deleteComponent: (id: string) => Promise<void>

  // Assembly actions
  addAssembly: (
    name: string,
    components: Array<{ componentId: string; quantity: number }>,
    description?: string,
    notes?: string
  ) => Promise<void>
  updateAssembly: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      notes?: string;
      components?: Array<{ componentId: string; quantity: number }>;
    }
  ) => Promise<void>
  deleteAssembly: (id: string) => Promise<void>
  checkComponentUsage: (componentId: string) => Promise<{
    isUsed: boolean;
    assemblies: Array<{ id: string; name: string }>;
  }>

  // Project actions
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  setViewingProjectId: (projectId: string | null) => void

  // BOM actions
  addBOMItem: (item: Omit<BOMLine, 'id'>) => void
  updateBOMItem: (id: string, updates: Partial<BOMLine>) => void
  deleteBOMItem: (id: string) => void

  // Quote actions
  addSupplierQuote: (quote: Omit<SupplierQuote, 'id'>) => Promise<void>

  // Quotation actions
  setCurrentQuotation: (quotation: QuotationProject | null) => void
  addQuotation: (quotation: QuotationProject) => void
  updateQuotation: (id: string, updates: Partial<QuotationProject>) => void

  // UI actions
  setActiveView: (view: UIState['activeView']) => void
  toggleSidebar: () => void
  setModal: (modal: ModalState) => void
  closeModal: () => void

  // Business logic
  calculateBOMTotals: (bom: BOMLine[]) => { totalCost: number; totalPrice: number; margin: number }
}

const CPQContext = createContext<CPQContextType | undefined>(undefined)

// ============ Provider ============
export function CPQProvider({ children }: { children: React.ReactNode }) {
  // Use the new hooks for data management
  const componentsHook = useComponents()
  const quotationsHook = useQuotations()
  const assembliesHook = useAssemblies()

  const [state, dispatch] = useReducer(cpqReducer, initialState)

  // Sync hooks data with reducer state
  useEffect(() => {
    // Map DbComponent to Component
    const mappedComponents = componentsHook.components.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description || '',
      category: comp.category || 'Other',
      componentType: comp.component_type || 'hardware',
      laborSubtype: comp.labor_subtype,
      productType: comp.category || 'Other',
      manufacturer: comp.manufacturer || '',
      manufacturerPN: comp.manufacturer_part_number || '',
      supplier: comp.supplier || '',
      unitCostNIS: comp.unit_cost_ils || 0,
      unitCostUSD: comp.unit_cost_usd || 0,
      unitCostEUR: comp.unit_cost_eur || 0,
      currency: comp.currency || 'NIS',
      originalCost: comp.original_cost || comp.unit_cost_ils || 0,
      quoteDate: comp.created_at?.split('T')[0] || '',
      quoteFileUrl: '',
      notes: comp.notes,
      createdAt: comp.created_at,
      updatedAt: comp.updated_at
    }))
    dispatch({ type: 'SET_COMPONENTS', payload: mappedComponents })
  }, [componentsHook.components])

  useEffect(() => {
    // Convert DbQuotation[] to QuotationProject[] using shared utility
    const mappedQuotations = quotationsHook.quotations.map(convertDbQuotationToQuotationProject)
    dispatch({ type: 'SET_QUOTATIONS', payload: mappedQuotations })
  }, [quotationsHook.quotations])

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'components', value: componentsHook.loading } })
  }, [componentsHook.loading])

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'quotations', value: quotationsHook.loading } })
  }, [quotationsHook.loading])

  useEffect(() => {
    if (componentsHook.error) {
      dispatch({ type: 'SET_ERROR', payload: componentsHook.error })
    }
  }, [componentsHook.error])

  useEffect(() => {
    if (quotationsHook.error) {
      dispatch({ type: 'SET_ERROR', payload: quotationsHook.error })
    }
  }, [quotationsHook.error])

  // Sync assemblies hook data
  useEffect(() => {
    dispatch({ type: 'SET_ASSEMBLIES', payload: assembliesHook.assemblies })
  }, [assembliesHook.assemblies])

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'assemblies', value: assembliesHook.loading } })
  }, [assembliesHook.loading])

  useEffect(() => {
    if (assembliesHook.error) {
      dispatch({ type: 'SET_ERROR', payload: assembliesHook.error })
    }
  }, [assembliesHook.error])

  // ============ Basic Actions ============
  const setLoading = useCallback((key: keyof CPQState['loading'], value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } })
  }, [])

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' })
  }, [])

  // ============ Component Actions ============
  const addComponent = useCallback(async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await componentsHook.addComponent(component)
      // Data will be updated automatically by the hook
    } catch (error) {
      setError(`Failed to add component: ${error}`)
    }
  }, [componentsHook, setError])

  const updateComponent = useCallback(async (id: string, updates: Partial<Component>) => {
    try {
      console.log('🌐 CPQContext.updateComponent called:', { id, updates })
      await componentsHook.updateComponent(id, updates)
      console.log('🌐 CPQContext.updateComponent completed')
      // Data will be updated automatically by the hook
    } catch (error) {
      console.error('❌ CPQContext.updateComponent failed:', error)
      setError(`Failed to update component: ${error}`)
    }
  }, [componentsHook, setError])

  const deleteComponent = useCallback(async (id: string) => {
    try {
      // Check if component is used in assemblies
      const usage = await assembliesHook.checkComponentUsage(id);

      if (usage.isUsed) {
        const assemblyNames = usage.assemblies.map(a => a.name).join(', ');
        const message = `רכיב זה נמצא בשימוש ב-${usage.assemblies.length} הרכבות: ${assemblyNames}. האם להמשיך? ההרכבות יסומנו כלא שלמות.`;

        // This will trigger a warning - the UI should handle this
        // For now, we'll throw an error that needs to be caught by the UI
        throw new Error(`ASSEMBLY_USAGE:${message}`);
      }

      await componentsHook.deleteComponent(id);
      // Data will be updated automatically by the hook
    } catch (error) {
      // Re-throw assembly usage errors for UI to handle
      if (error instanceof Error && error.message.startsWith('ASSEMBLY_USAGE:')) {
        throw error;
      }
      setError(`Failed to delete component: ${error}`);
      throw error;
    }
  }, [componentsHook, assembliesHook, setError])

  // ============ Assembly Actions ============
  const addAssembly = useCallback(
    async (
      name: string,
      components: Array<{ componentId: string; quantity: number }>,
      description?: string,
      notes?: string
    ) => {
      try {
        await assembliesHook.addAssembly(name, components, description, notes);
        // Data will be updated automatically by the hook
      } catch (error) {
        setError(`Failed to add assembly: ${error}`);
        throw error;
      }
    },
    [assembliesHook, setError]
  );

  const updateAssembly = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        description?: string;
        notes?: string;
        components?: Array<{ componentId: string; quantity: number }>;
      }
    ) => {
      try {
        await assembliesHook.updateAssembly(id, updates);
        // Data will be updated automatically by the hook
      } catch (error) {
        setError(`Failed to update assembly: ${error}`);
        throw error;
      }
    },
    [assembliesHook, setError]
  );

  const deleteAssembly = useCallback(
    async (id: string) => {
      try {
        await assembliesHook.deleteAssembly(id);
        // Data will be updated automatically by the hook
      } catch (error) {
        setError(`Failed to delete assembly: ${error}`);
        throw error;
      }
    },
    [assembliesHook, setError]
  );

  const checkComponentUsage = useCallback(
    async (componentId: string) => {
      return await assembliesHook.checkComponentUsage(componentId);
    },
    [assembliesHook]
  );

  // ============ Project Actions ============
  const createProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading('projects', true)
      // TODO: Implement actual API call
      const now = new Date().toISOString()
      const newProject: Project = {
        ...project,
        id: `project_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      dispatch({ type: 'ADD_PROJECT', payload: newProject })
    } catch (error) {
      setError(`Failed to create project: ${error}`)
    } finally {
      setLoading('projects', false)
    }
  }, [setLoading, setError])

  const setCurrentProject = useCallback((project: Project | null) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project })
  }, [])

  const setViewingProjectId = useCallback((projectId: string | null) => {
    dispatch({ type: 'SET_VIEWING_PROJECT_ID', payload: projectId })
  }, [])

  // ============ BOM Actions ============
  const addBOMItem = useCallback((item: Omit<BOMLine, 'id'>) => {
    const bomItem: BOMLine = {
      ...item,
      id: `bom_${Date.now()}`,
    }
    dispatch({ type: 'ADD_BOM_ITEM', payload: { item: bomItem } })
  }, [])

  const updateBOMItem = useCallback((id: string, updates: Partial<BOMLine>) => {
    dispatch({ type: 'UPDATE_BOM_ITEM', payload: { id, updates } })
  }, [])

  const deleteBOMItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BOM_ITEM', payload: id })
  }, [])

  // ============ Quote Actions ============
  const addSupplierQuote = useCallback(async (quote: Omit<SupplierQuote, 'id'>) => {
    try {
      setLoading('quotes', true)
      // TODO: Implement actual API call
      const newQuote: SupplierQuote = {
        ...quote,
        id: `quote_${Date.now()}`,
      }
      dispatch({ type: 'ADD_SUPPLIER_QUOTE', payload: newQuote })
    } catch (error) {
      setError(`Failed to add supplier quote: ${error}`)
    } finally {
      setLoading('quotes', false)
    }
  }, [setLoading, setError])

  // ============ UI Actions ============
  const setActiveView = useCallback((view: UIState['activeView']) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view })
    // Clear project detail view when navigating away from projects
    if (view !== 'projects') {
      dispatch({ type: 'SET_VIEWING_PROJECT_ID', payload: null })
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const setModal = useCallback((modal: ModalState) => {
    dispatch({ type: 'SET_MODAL', payload: modal })
  }, [])

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' })
  }, [])

  // ============ Business Logic ============
  const calculateBOMTotals = useCallback((bom: BOMLine[]) => {
    const totalCost = bom.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0)
    const totalPrice = bom.reduce((sum, item) => sum + item.totalPrice, 0)
    const margin = totalPrice - totalCost

    return { totalCost, totalPrice, margin }
  }, [])

  // Project update/delete implementations
  const updateProject = useCallback(async (_id: string, _updates: Partial<Project>) => {
    // TODO: Implement
    console.log('updateProject not implemented yet')
  }, [])

  const deleteProject = useCallback(async (_id: string) => {
    // TODO: Implement
    console.log('deleteProject not implemented yet')
  }, [])

  // ============ Quotation Actions ============
  const setCurrentQuotation = useCallback((quotation: QuotationProject | null) => {
    dispatch({ type: 'SET_CURRENT_QUOTATION', payload: quotation })
  }, [])

  const addQuotation = useCallback((quotation: QuotationProject) => {
    dispatch({ type: 'ADD_QUOTATION', payload: quotation })
  }, [])

  const updateQuotation = useCallback(async (id: string, updates: Partial<QuotationProject>) => {
    // Update local state immediately for responsive UI
    dispatch({ type: 'UPDATE_QUOTATION', payload: { id, updates } })

    // Convert QuotationProject fields to DbQuotation fields for Supabase
    const dbUpdates: any = {}
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName
    if (updates.name !== undefined) dbUpdates.quotation_number = updates.name
    if (updates.parameters !== undefined) {
      if (updates.parameters.usdToIlsRate !== undefined) dbUpdates.exchange_rate = updates.parameters.usdToIlsRate
      if (updates.parameters.eurToIlsRate !== undefined) dbUpdates.eur_to_ils_rate = updates.parameters.eurToIlsRate
      if (updates.parameters.markupPercent !== undefined) dbUpdates.margin_percentage = updates.parameters.markupPercent
      if (updates.parameters.riskPercent !== undefined) dbUpdates.risk_percentage = updates.parameters.riskPercent
    }

    // Save to Supabase if there are database fields to update
    if (Object.keys(dbUpdates).length > 0) {
      try {
        await quotationsHook.updateQuotation(id, dbUpdates)
      } catch (error) {
        console.error('Failed to save quotation updates to database:', error)
        // Optionally revert local state or show error to user
      }
    }
  }, [quotationsHook])

  const value: CPQContextType = {
    ...state,
    setLoading,
    setError,
    clearErrors,
    addComponent,
    updateComponent,
    deleteComponent,
    addAssembly,
    updateAssembly,
    deleteAssembly,
    checkComponentUsage,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setViewingProjectId,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    addSupplierQuote,
    setCurrentQuotation,
    addQuotation,
    updateQuotation,
    setActiveView,
    toggleSidebar,
    setModal,
    closeModal,
    calculateBOMTotals,
  }

  return <CPQContext.Provider value={value}>{children}</CPQContext.Provider>
}

// ============ Hook ============
export function useCPQ() {
  const context = useContext(CPQContext)
  if (context === undefined) {
    throw new Error('useCPQ must be used within a CPQProvider')
  }
  return context
}
