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
  ComponentFormData
} from '../types'

// ============ State Shape ============
interface CPQState {
  // Core data
  components: Component[]
  assemblies: Assembly[]
  projects: Project[]
  supplierQuotes: SupplierQuote[]
  pricingRules: PricingRule[]

  // Current project BOM being edited
  currentProjectBOM: BOMLine[]
  currentProject: Project | null

  // UI state
  uiState: UIState
  modalState: ModalState

  // Loading states
  loading: {
    components: boolean
    assemblies: boolean
    projects: boolean
    quotes: boolean
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

  // Supplier Quotes
  | { type: 'SET_SUPPLIER_QUOTES'; payload: SupplierQuote[] }
  | { type: 'ADD_SUPPLIER_QUOTE'; payload: SupplierQuote }
  | { type: 'UPDATE_SUPPLIER_QUOTE'; payload: { id: string; updates: Partial<SupplierQuote> } }
  | { type: 'DELETE_SUPPLIER_QUOTE'; payload: string }

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
const demoComponents: Component[] = [
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
  }
]

// ============ Reducer ============
const initialState: CPQState = {
  components: demoComponents,
  assemblies: [],
  projects: [],
  supplierQuotes: [],
  pricingRules: [],
  currentProjectBOM: [],
  currentProject: null,
  uiState: {
    activeView: 'dashboard',
    sidebarCollapsed: false,
    theme: 'system',
    loading: false,
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
  addAssembly: (assembly: Omit<Assembly, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateAssembly: (id: string, updates: Partial<Assembly>) => Promise<void>
  deleteAssembly: (id: string) => Promise<void>

  // Project actions
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void

  // BOM actions
  addBOMItem: (item: Omit<BOMLine, 'id'>) => void
  updateBOMItem: (id: string, updates: Partial<BOMLine>) => void
  deleteBOMItem: (id: string) => void

  // Quote actions
  addSupplierQuote: (quote: Omit<SupplierQuote, 'id'>) => Promise<void>

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
  const [state, dispatch] = useReducer(cpqReducer, initialState)

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
      setLoading('components', true)
      // TODO: Implement actual API call
      const now = new Date().toISOString()
      const newComponent: Component = {
        ...component,
        id: `comp_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      dispatch({ type: 'ADD_COMPONENT', payload: newComponent })
    } catch (error) {
      setError(`Failed to add component: ${error}`)
    } finally {
      setLoading('components', false)
    }
  }, [setLoading, setError])

  const updateComponent = useCallback(async (id: string, updates: Partial<Component>) => {
    try {
      setLoading('components', true)
      // TODO: Implement actual API call
      dispatch({ type: 'UPDATE_COMPONENT', payload: { id, updates } })
    } catch (error) {
      setError(`Failed to update component: ${error}`)
    } finally {
      setLoading('components', false)
    }
  }, [setLoading, setError])

  const deleteComponent = useCallback(async (id: string) => {
    try {
      setLoading('components', true)
      // TODO: Implement actual API call
      dispatch({ type: 'DELETE_COMPONENT', payload: id })
    } catch (error) {
      setError(`Failed to delete component: ${error}`)
    } finally {
      setLoading('components', false)
    }
  }, [setLoading, setError])

  // ============ Assembly Actions ============
  const addAssembly = useCallback(async (assembly: Omit<Assembly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading('assemblies', true)
      // TODO: Implement actual API call
      const now = new Date().toISOString()
      const newAssembly: Assembly = {
        ...assembly,
        id: `assembly_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      dispatch({ type: 'ADD_ASSEMBLY', payload: newAssembly })
    } catch (error) {
      setError(`Failed to add assembly: ${error}`)
    } finally {
      setLoading('assemblies', false)
    }
  }, [setLoading, setError])

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

  // Placeholder implementations for missing functions
  const updateAssembly = useCallback(async (id: string, updates: Partial<Assembly>) => {
    // TODO: Implement
    console.log('updateAssembly not implemented yet')
  }, [])

  const deleteAssembly = useCallback(async (id: string) => {
    // TODO: Implement
    console.log('deleteAssembly not implemented yet')
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    // TODO: Implement
    console.log('updateProject not implemented yet')
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    // TODO: Implement
    console.log('deleteProject not implemented yet')
  }, [])

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
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    addSupplierQuote,
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
