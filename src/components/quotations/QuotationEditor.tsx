import { useState, useCallback, useMemo, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, ICellRendererParams, ValueGetterParams, ICellEditorParams } from 'ag-grid-community'
import { useCPQ } from '../../contexts/CPQContext'
import { QuotationItem, QuotationSystem, Component, Assembly } from '../../types'
import { calculateAssemblyPricing, formatAssemblyPricing } from '../../utils/assemblyCalculations'
import { QuotationParameters } from './QuotationParameters'
import { calculateQuotationTotals, renumberItems } from '../../utils/quotationCalculations'
import { calculateQuotationStatistics } from '../../utils/quotationStatistics'
import { Button } from '../ui/button'
import { Trash2, Plus, Settings, ChevronDown, X, LogOut, Edit, FolderOpen } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useTableConfig } from '../../hooks/useTableConfig'
import { useQuotations } from '../../hooks/useQuotations'
import { CustomHeader } from '../grid/CustomHeader'
import { ComponentForm } from '../library/ComponentForm'
import { ProjectPicker } from './ProjectPicker'
import { QuotationStatisticsPanelSimplified } from './QuotationStatisticsPanelSimplified'
import { AssemblyDetailModal } from './AssemblyDetailModal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { detectOriginalCurrency, convertToAllCurrencies, type ExchangeRates } from '../../utils/currencyConversion'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Custom cell renderer for system headers (bold)
const SystemHeaderRenderer = (props: ICellRendererParams) => {
  if (props.data?.isSystemGroup) {
    return (
      <div className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
        {props.value}
      </div>
    )
  }
  return props.value
}

// Custom cell renderer for currency values
const CurrencyRenderer = (props: ICellRendererParams) => {
  const value = props.value
  if (value == null) return '-'
  
  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2
  }).format(value)
  
  return (
    <span className="font-mono text-sm">
      {formatted}
    </span>
  )
}

// Custom cell renderer for USD currency
const USDCurrencyRenderer = (props: ICellRendererParams) => {
  const value = props.value
  if (value == null) return '-'
  
  return (
    <span className="font-mono text-sm">
      ${value?.toFixed(2) || '0.00'}
    </span>
  )
}

// Simple text editor for system names
class SystemNameEditor {
  private eInput!: HTMLInputElement
  private params!: ICellEditorParams
  private value!: string
  private boundKeyDown!: (event: KeyboardEvent) => void
  private boundBlur!: () => void
  private boundInput!: () => void

  // gets called once before renderer is used
  init(params: ICellEditorParams): void {
    this.params = params
    this.value = params.value || ''
    
    // create cell editor
    this.eInput = document.createElement('input')
    this.eInput.type = 'text'
    this.eInput.value = this.value
    this.eInput.placeholder = 'שם מערכת...'
    this.eInput.className = 'w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
    
    // Create bound references once to avoid memory leaks
    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundBlur = this.onBlur.bind(this)
    this.boundInput = this.onInput.bind(this)
    
    // add event listeners using bound references
    this.eInput.addEventListener('keydown', this.boundKeyDown)
    this.eInput.addEventListener('blur', this.boundBlur)
    this.eInput.addEventListener('input', this.boundInput)
  }

  // gets called once when grid is ready to insert the element
  getGui(): HTMLElement {
    return this.eInput
  }

  // Called by AG Grid after editor is attached to DOM
  // This ensures focus happens after render is complete
  afterGuiAttached(): void {
    if (this.eInput) {
      this.eInput.focus()
      this.eInput.select()
    }
  }

  // focus and select the text
  focusIn(): void {
    if (this.eInput) {
      this.eInput.focus()
      this.eInput.select()
    }
  }

  // returns the new value after editing
  getValue(): string {
    return this.eInput.value
  }

  // when user presses Enter or Escape
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.params.api.stopEditing()
    } else if (event.key === 'Escape') {
      this.params.api.stopEditing(true)
    }
  }

  // when user clicks outside
  private onBlur(): void {
    this.params.api.stopEditing()
  }

  // update value on input
  private onInput(): void {
    this.value = this.eInput.value
  }

  // destroy the editor
  destroy(): void {
    // Remove using same references to properly clean up
    this.eInput.removeEventListener('keydown', this.boundKeyDown)
    this.eInput.removeEventListener('blur', this.boundBlur)
    this.eInput.removeEventListener('input', this.boundInput)
  }

  // returns false if we don't want a popup
  isPopup(): boolean {
    return false
  }

  // if refresh, update the value
  refresh(params: ICellEditorParams): boolean {
    this.value = params.value || ''
    this.eInput.value = this.value
    return true
  }
}


export function QuotationEditor() {
  const {
    currentQuotation,
    components,
    assemblies,
    setCurrentQuotation,
    updateQuotation,
    setModal,
    modalState,
    closeModal
  } = useCPQ()

  // Use quotations hook for Supabase persistence
  const quotationsHook = useQuotations()

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('quotation_editor', {
    columnOrder: ['actions', 'displayNumber', 'componentName', 'itemType', 'laborSubtype', 'quantity', 'unitPriceILS', 'totalPriceUSD', 'totalPriceILS', 'customerPriceILS'],
    columnWidths: {},
    visibleColumns: ['actions', 'displayNumber', 'componentName', 'itemType', 'laborSubtype', 'quantity', 'unitPriceILS', 'totalPriceUSD', 'totalPriceILS', 'customerPriceILS'],
    filterState: {}
  })

  console.log('🔍 QuotationEditor config loaded:', config)

  // Make components available globally for the LibrarySearchEditor
  useEffect(() => {
    (window as any).__cpq_components = components
  }, [components])

  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showComponentSelector, setShowComponentSelector] = useState(false)
  const [selectedSystemId, setSelectedSystemId] = useState<string>('')
  const [componentSearchText, setComponentSearchText] = useState('')
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [selectorTab, setSelectorTab] = useState<'components' | 'assemblies'>('components')
  const [showAssemblyDetail, setShowAssemblyDetail] = useState(false)
  const [selectedAssemblyForDetail, setSelectedAssemblyForDetail] = useState<Assembly | null>(null)

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false)
  })

  // Close component selector when clicking outside
  const componentSelectorRef = useClickOutside<HTMLDivElement>(() => {
    setShowComponentSelector(false)
  })

  // Filter components for popup
  const filteredComponents = useMemo(() => {
    if (!componentSearchText) return components
    return components.filter(comp =>
      comp.name.toLowerCase().includes(componentSearchText.toLowerCase()) ||
      comp.manufacturer?.toLowerCase().includes(componentSearchText.toLowerCase()) ||
      comp.category?.toLowerCase().includes(componentSearchText.toLowerCase())
    )
  }, [components, componentSearchText])

  // Filter assemblies for popup
  const filteredAssemblies = useMemo(() => {
    if (!componentSearchText) return assemblies
    return assemblies.filter(asm =>
      asm.name.toLowerCase().includes(componentSearchText.toLowerCase()) ||
      asm.description?.toLowerCase().includes(componentSearchText.toLowerCase())
    )
  }, [assemblies, componentSearchText])

  // Add a new system
  const addSystem = useCallback(async () => {
    if (!currentQuotation) return

    const systemOrder = currentQuotation.systems.length + 1

    // Persist system to Supabase FIRST to get real ID
    try {
      const dbSystem = await quotationsHook.addQuotationSystem({
        quotation_id: currentQuotation.id,
        system_name: `מערכת ${systemOrder}`,
        system_description: '',
        quantity: 1,
        sort_order: systemOrder,
        unit_cost: 0,
        total_cost: 0,
        unit_price: 0,
        total_price: 0
      })

      if (!dbSystem) {
        throw new Error('Failed to create system')
      }

      // Create local system with DB ID
      const newSystem: QuotationSystem = {
        id: dbSystem.id,
        name: dbSystem.system_name,
        description: dbSystem.system_description || '',
        order: dbSystem.sort_order,
        quantity: dbSystem.quantity,
        createdAt: dbSystem.created_at
      }

      const updatedQuotation = {
        ...currentQuotation,
        systems: [...currentQuotation.systems, newSystem]
      }

      setCurrentQuotation(updatedQuotation)
      updateQuotation(currentQuotation.id, { systems: updatedQuotation.systems })
    } catch (error) {
      console.error('Failed to save system:', error)
      alert('שגיאה בהוספת מערכת. נסה שוב.')
    }
  }, [currentQuotation, setCurrentQuotation, updateQuotation, quotationsHook])

  // Open component selector popup
  const openComponentSelector = useCallback((systemId: string) => {
    setSelectedSystemId(systemId)
    setComponentSearchText('')
    setShowComponentSelector(true)
  }, [])

  // Add selected component to system
  const addComponentToSystem = useCallback(async (component: Component) => {
    if (!currentQuotation || !selectedSystemId) return

    const system = currentQuotation.systems.find(s => s.id === selectedSystemId)
    if (!system) return

    const itemOrder = currentQuotation.items.filter(item => item.systemId === selectedSystemId).length + 1

    // CRITICAL: Use component's ORIGINAL currency and convert to other currencies
    // using the quotation's current exchange rates
    const quotationRates: ExchangeRates = {
      usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
      eurToIlsRate: currentQuotation.parameters.eurToIlsRate
    }

    // Convert from original currency to all currencies using quotation rates
    const convertedPrices = convertToAllCurrencies(
      component.originalCost,
      component.currency,
      quotationRates
    )

    // DEBUG: Log component prices being used
    console.log('💰 [CURRENCY-ADD] Adding component to quotation:', {
      componentName: component.name,
      componentFromLibrary: {
        unitCostILS: component.unitCostNIS,
        unitCostUSD: component.unitCostUSD,
        unitCostEUR: component.unitCostEUR,
        detectedCurrency: component.currency,
        detectedOriginalCost: component.originalCost
      },
      quotationRates,
      convertedPrices,
      willSaveToQuotation: {
        unitPriceILS: convertedPrices.unitCostNIS,
        unitPriceUSD: convertedPrices.unitCostUSD,
        unitPriceEUR: convertedPrices.unitCostEUR,
        originalCurrency: component.currency,
        originalCost: component.originalCost
      }
    })

    // Persist item to Supabase FIRST to get real ID
    try {
      const dbItem = await quotationsHook.addQuotationItem({
        quotation_system_id: selectedSystemId,
        component_id: component.id,
        item_name: component.name,
        manufacturer: component.manufacturer,
        manufacturer_part_number: component.manufacturerPN,
        item_type: component.componentType || 'hardware',
        labor_subtype: component.laborSubtype,
        quantity: 1,
        unit_cost: convertedPrices.unitCostNIS,
        total_cost: convertedPrices.unitCostNIS,
        unit_price: convertedPrices.unitCostNIS,
        total_price: convertedPrices.unitCostNIS,
        margin_percentage: currentQuotation.parameters.markupPercent || 0.75,
        sort_order: itemOrder,
        // CRITICAL: Save original currency and cost for proper exchange rate handling
        original_currency: component.currency,
        original_cost: component.originalCost
      })

      if (!dbItem) {
        throw new Error('Failed to create item')
      }

      // Create local item with DB ID and converted prices from original currency
      const newItem: QuotationItem = {
        id: dbItem.id,
        systemId: selectedSystemId,
        systemOrder: system.order,
        itemOrder: itemOrder,
        displayNumber: `${system.order}.${itemOrder}`,
        componentId: component.id,
        componentName: component.name,
        componentCategory: component.category,
        itemType: component.componentType || 'hardware',
        laborSubtype: component.laborSubtype, // Inherit from component library
        quantity: dbItem.quantity,
        unitPriceUSD: convertedPrices.unitCostUSD,
        unitPriceILS: convertedPrices.unitCostNIS,
        unitPriceEUR: convertedPrices.unitCostEUR,
        totalPriceUSD: convertedPrices.unitCostUSD * dbItem.quantity,
        totalPriceILS: convertedPrices.unitCostNIS * dbItem.quantity,
        // Store original currency to preserve it when exchange rates change
        originalCurrency: component.currency,
        originalCost: component.originalCost,
        itemMarkupPercent: dbItem.margin_percentage || 25,
        customerPriceILS: dbItem.total_price || 0,
        notes: dbItem.notes || '',
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at
      }

      // Renumber items after adding component
      const updatedItems = [...currentQuotation.items, newItem]
      const renumberedItems = renumberItems(updatedItems)

      const updatedQuotation = {
        ...currentQuotation,
        items: renumberedItems
      }

      setCurrentQuotation(updatedQuotation)
      updateQuotation(currentQuotation.id, { items: renumberedItems })
      setShowComponentSelector(false)
    } catch (error) {
      console.error('Failed to save item:', error)
      alert('שגיאה בהוספת פריט. נסה שוב.')
    }
  }, [currentQuotation, selectedSystemId, setCurrentQuotation, updateQuotation, quotationsHook])

  // Add assembly to system (as single line item)
  const addAssemblyToSystem = useCallback(async (assembly: Assembly) => {
    if (!currentQuotation || !selectedSystemId) return

    const system = currentQuotation.systems.find(s => s.id === selectedSystemId)
    if (!system) return

    const quotationRates: ExchangeRates = {
      usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
      eurToIlsRate: currentQuotation.parameters.eurToIlsRate
    }

    try {
      // Calculate total assembly price using assembly calculations
      const assemblyPricing = calculateAssemblyPricing(assembly, quotationRates)

      const itemOrder = currentQuotation.items.filter(item => item.systemId === selectedSystemId).length + 1

      // Create single item for the entire assembly
      const dbItem = await quotationsHook.addQuotationItem({
        quotation_system_id: selectedSystemId,
        assembly_id: assembly.id, // Link to assembly
        item_name: assembly.name,
        manufacturer: '', // Not applicable for assemblies
        manufacturer_part_number: '', // Not applicable for assemblies
        item_type: 'hardware', // Assemblies are treated as hardware
        labor_subtype: undefined,
        quantity: 1, // Default quantity for assembly
        unit_cost: assemblyPricing.totalCostNIS,
        total_cost: assemblyPricing.totalCostNIS,
        unit_price: assemblyPricing.totalCostNIS,
        total_price: assemblyPricing.totalCostNIS,
        margin_percentage: currentQuotation.parameters.markupPercent || 0.75,
        notes: assembly.description || 'הרכבה',
        sort_order: itemOrder
      })

      if (!dbItem) {
        throw new Error('Failed to create assembly item in database')
      }

      // Create local item
      const newItem: QuotationItem = {
        id: dbItem.id,
        systemId: selectedSystemId,
        systemOrder: system.order,
        itemOrder,
        displayNumber: `${system.order}.${itemOrder}`,
        assemblyId: assembly.id, // Link to assembly
        componentName: assembly.name,
        componentCategory: 'הרכבה', // Assembly category
        itemType: 'hardware',
        quantity: 1,
        unitPriceUSD: assemblyPricing.totalCostUSD,
        unitPriceILS: assemblyPricing.totalCostNIS,
        totalPriceUSD: assemblyPricing.totalCostUSD,
        totalPriceILS: assemblyPricing.totalCostNIS,
        itemMarkupPercent: currentQuotation.parameters.markupPercent || 0.75,
        customerPriceILS: assemblyPricing.totalCostNIS * (1 + (currentQuotation.parameters.markupPercent || 0.75)),
        notes: assembly.description || 'הרכבה',
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at
      }

      // Renumber items after adding assembly
      const updatedItems = [...currentQuotation.items, newItem]
      const renumberedItems = renumberItems(updatedItems)

      const updatedQuotation = {
        ...currentQuotation,
        items: renumberedItems
      }

      setCurrentQuotation(updatedQuotation)
      updateQuotation(currentQuotation.id, { items: renumberedItems })
      setShowComponentSelector(false)
    } catch (error) {
      console.error('Failed to add assembly:', error)
      alert('שגיאה בהוספת הרכבה. נסה שוב.')
    }
  }, [currentQuotation, selectedSystemId, setCurrentQuotation, updateQuotation, quotationsHook])

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    if (!currentQuotation) return

    // Delete from Supabase first
    try {
      await quotationsHook.deleteQuotationItem(itemId)
    } catch (error) {
      console.error('Failed to delete item:', error)
    }

    // Remove from local state
    const updatedItems = currentQuotation.items.filter(item => item.id !== itemId)

    // Renumber items
    const renumberedItems = renumberItems(updatedItems)

    const updatedQuotation = {
      ...currentQuotation,
      items: renumberedItems
    }

    setCurrentQuotation(updatedQuotation)
    updateQuotation(currentQuotation.id, { items: renumberedItems })
  }, [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation])

  // Update item
  const updateItem = useCallback(async (itemId: string, updates: Partial<QuotationItem>) => {
    if (!currentQuotation) return

    // Update in Supabase first
    try {
      await quotationsHook.updateQuotationItem(itemId, {
        quantity: updates.quantity,
        unit_cost: updates.unitPriceILS,
        total_cost: updates.totalPriceILS,
        unit_price: updates.unitPriceILS,
        total_price: updates.totalPriceILS,
        margin_percentage: updates.itemMarkupPercent,
        notes: updates.notes
      })
    } catch (error) {
      console.error('Failed to update item:', error)
    }

    // Update local state
    const updatedItems = currentQuotation.items.map(item =>
      item.id === itemId
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item
    )

    const updatedQuotation = {
      ...currentQuotation,
      items: updatedItems
    }

    setCurrentQuotation(updatedQuotation)
    updateQuotation(currentQuotation.id, { items: updatedItems })
  }, [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation])

  // Update parameters and recalculate item prices if exchange rates changed
  const updateParameters = useCallback((parameters: any) => {
    if (!currentQuotation) return

    // Check if exchange rates changed
    const ratesChanged =
      parameters.usdToIlsRate !== currentQuotation.parameters.usdToIlsRate ||
      parameters.eurToIlsRate !== currentQuotation.parameters.eurToIlsRate

    // If rates changed, recalculate all item prices
    let updatedItems = currentQuotation.items
    if (ratesChanged) {
      const newRates: ExchangeRates = {
        usdToIlsRate: parameters.usdToIlsRate,
        eurToIlsRate: parameters.eurToIlsRate
      }

      console.log('🔄 Exchange rates changed, recalculating item prices:', {
        oldRates: {
          usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
          eurToIlsRate: currentQuotation.parameters.eurToIlsRate
        },
        newRates
      })

      // Recalculate each item's prices with new exchange rates
      updatedItems = currentQuotation.items.map(item => {
        // CRITICAL: Detect the original currency for this item
        // This preserves the original price when exchange rates change
        const { currency: originalCurrency, amount: originalAmount } = detectOriginalCurrency(
          item.unitPriceILS,
          item.unitPriceUSD,
          item.unitPriceEUR,
          item.originalCurrency // Use stored original currency if available
        )

        console.log(`  📦 ${item.componentName}:`, {
          originalCurrency,
          originalAmount,
          storedOriginalCurrency: item.originalCurrency,
          storedOriginalCost: item.originalCost
        })

        // Use stored originalCost if available (most reliable)
        const finalAmount = item.originalCost || originalAmount

        // Convert from ORIGINAL currency with new rates
        // This ensures ILS-only items stay ILS, USD-only items stay USD, etc.
        const convertedPrices = convertToAllCurrencies(finalAmount, originalCurrency, newRates)

        return {
          ...item,
          unitPriceILS: convertedPrices.unitCostNIS,
          unitPriceUSD: convertedPrices.unitCostUSD,
          unitPriceEUR: convertedPrices.unitCostEUR,
          totalPriceILS: convertedPrices.unitCostNIS * item.quantity,
          totalPriceUSD: convertedPrices.unitCostUSD * item.quantity
        }
      })
    }

    const updatedQuotation = {
      ...currentQuotation,
      parameters,
      items: updatedItems
    }

    setCurrentQuotation(updatedQuotation)
    updateQuotation(currentQuotation.id, { parameters, items: updatedItems })
  }, [currentQuotation, setCurrentQuotation, updateQuotation])

  // Handle close - just navigate back to list
  const handleClose = useCallback(() => {
    setCurrentQuotation(null)
  }, [setCurrentQuotation])

  // Handle project selection
  const handleProjectSelect = useCallback(async (project: any) => {
    console.log('🔵 handleProjectSelect called with project:', project)
    console.log('🔵 Current quotation:', currentQuotation)

    if (!currentQuotation) {
      console.error('❌ No current quotation!')
      return
    }

    try {
      // Update quotation with selected project - save directly to Supabase
      const updates = {
        project_id: project.id,
        project_name: project.projectName,
        customer_name: project.companyName
      }
      console.log('🔵 Preparing database updates:', updates)

      // Update in database using the Supabase hook directly
      console.log('🔵 Calling quotationsHook.updateQuotation...')
      await quotationsHook.updateQuotation(currentQuotation.id, updates)
      console.log('✅ Database update completed successfully')

      // Update local state after successful database update
      console.log('🔵 Updating local CPQ context state...')
      updateQuotation(currentQuotation.id, {
        projectId: project.id,
        projectName: project.projectName,
        customerName: project.companyName
      })

      // Also update currentQuotation directly for immediate UI feedback
      setCurrentQuotation({
        ...currentQuotation,
        projectId: project.id,
        projectName: project.projectName,
        customerName: project.companyName
      })
      console.log('✅ Local state updated')

      // Show success message
      const { toast } = await import('sonner')
      toast.success('הפרויקט עודכן בהצלחה')
      console.log('✅ Success toast shown')
    } catch (error) {
      console.error('❌ Failed to update project:', error)
      const { toast } = await import('sonner')
      toast.error('שגיאה בעדכון פרויקט')
    }
  }, [currentQuotation, setCurrentQuotation, updateQuotation, quotationsHook])

  // Handle column menu click
  const handleColumnMenuClick = useCallback((columnId: string) => {
    console.log('Column menu clicked:', columnId)
  }, [])

  // Handle filter click
  const handleFilterClick = useCallback((columnId: string) => {
    console.log('Filter clicked:', columnId)
  }, [])

  // Get unique values for a specific field for filtering
  const getUniqueValues = useCallback((field: string): string[] => {
    if (!currentQuotation) return []
    const values = currentQuotation.items.map(item => String(item[field as keyof QuotationItem] || '')).filter(Boolean)
    return Array.from(new Set(values)).sort()
  }, [currentQuotation])

  // Prepare grid data with tree structure
  const gridData = useMemo(() => {
    if (!currentQuotation) return []

    const data: any[] = []
    const profitCoefficient = currentQuotation.parameters?.markupPercent ?? 0.75

    // Defensive: ensure systems and items arrays exist
    const systems = currentQuotation.systems || []
    const items = currentQuotation.items || []

    // Create tree structure with systems as parent nodes
    systems.forEach(system => {
      const systemItems = items.filter(item => item.systemId === system.id)

      // Calculate system totals with current profit coefficient
      const systemTotalCost = systemItems.reduce((sum, item) => sum + ((item.unitPriceILS || 0) * (item.quantity ||1)), 0)
      const systemCustomerPrice = systemTotalCost / profitCoefficient
      
      // Create system node
      const systemNode = {
        id: system.id,
        systemName: system.name,
        systemId: system.id,
        isSystemGroup: true,
        displayNumber: system.order.toString(),
        componentName: system.name,
        componentCategory: 'מערכת',
        quantity: system.quantity || 1,
        unitPriceUSD: 0,
        unitPriceILS: 0,
        totalPriceUSD: systemItems.reduce((sum, item) => sum + ((item.unitPriceUSD || 0) * (item.quantity || 1)), 0) * (system.quantity || 1),
        totalPriceILS: systemTotalCost * (system.quantity || 1),
        customerPriceILS: systemCustomerPrice * (system.quantity || 1),
        notes: system.description || ''
      }
      
      data.push(systemNode)
      
      // Add existing items with updated customer prices
      systemItems.forEach(item => {
        const unitPrice = item.unitPriceILS || 0
        const quantity = item.quantity || 1
        const customerPrice = (unitPrice * quantity) / profitCoefficient
        
        data.push({
          ...item,
          systemName: system.name,
          customerPriceILS: customerPrice
        })
      })
    })

    return data
  }, [currentQuotation])

  // Grid column definitions (RTL order)
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'מחיר ללקוח',
      field: 'customerPriceILS',
      width: 120,
      cellRenderer: CurrencyRenderer,
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (params: ValueGetterParams) => {
        if (params.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(s => s.id === params.data.systemId)
          const systemQuantity = system?.quantity ||1
          const systemItems = gridData.filter(item => 
            item.systemId === params.data.systemId && !item.isSystemGroup
          )
          // Calculate customer price with profit coefficient for system total
          const profitCoefficient = currentQuotation?.parameters?.markupPercent ?? 0.75
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0
            const quantity = item.quantity || 1
            const customerPrice = (unitPrice * quantity) / profitCoefficient
            return sum + customerPrice
          }, 0)
          return itemsTotal * systemQuantity
        }
        // Calculate customer price with profit coefficient for individual items
        const unitPrice = params.data.unitPriceILS || 0
        const quantity = params.data.quantity || 1
        const profitCoefficient = currentQuotation?.parameters?.markupPercent ?? 0.75
        const customerPrice = (unitPrice * quantity) / profitCoefficient
        return customerPrice
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'מחיר ללקוח',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        filterType: 'number'
      })
    },
    {
      headerName: 'מחיר נטו שקלים',
      field: 'totalPriceILS',
      width: 120,
      cellRenderer: CurrencyRenderer,
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (params: ValueGetterParams) => {
        if (params.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(s => s.id === params.data.systemId)
          const systemQuantity = system?.quantity || 1
          const systemItems = gridData.filter(item => 
            item.systemId === params.data.systemId && !item.isSystemGroup
          )
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS ||0
            const quantity = item.quantity || 1
            return sum + (unitPrice * quantity)
          }, 0)
          return itemsTotal * systemQuantity
        }
        const unitPrice = params.data.unitPriceILS || 0
        const quantity = params.data.quantity || 1
        return unitPrice * quantity
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'מחיר נטו שקלים',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        filterType: 'number'
      })
    },
    {
      headerName: 'מחיר נטו דולר',
      field: 'totalPriceUSD',
      width: 120,
      cellRenderer: USDCurrencyRenderer,
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (params: ValueGetterParams) => {
        if (params.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(s => s.id === params.data.systemId)
          const systemQuantity = system?.quantity || 1
          const systemItems = gridData.filter(item => 
            item.systemId === params.data.systemId && !item.isSystemGroup
          )
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceUSD || 0
            const quantity = item.quantity || 1
            return sum + (unitPrice * quantity)
          }, 0)
          return itemsTotal * systemQuantity
        }
        const unitPrice = params.data.unitPriceUSD || 0
        const quantity = params.data.quantity || 1
        return unitPrice * quantity
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'מחיר נטו דולר',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        filterType: 'number'
      })
    },
    {
      headerName: 'מחיר יחידה',
      field: 'unitPriceILS',
      width: 100,
      editable: false,
      cellRenderer: CurrencyRenderer,
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (params: ValueGetterParams) => {
        if (params.data.isSystemGroup) {
          const systemItems = gridData.filter(item =>
            item.systemId === params.data.systemId && !item.isSystemGroup
          )
          const totalCost = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0
            const quantity = item.quantity || 1
            return sum + (unitPrice * quantity)
          }, 0)
          return totalCost
        }
        return params.data.unitPriceILS || 0
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'מחיר יחידה',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        filterType: 'number'
      })
    },
    {
      headerName: 'כמות',
      field: 'quantity',
      width: 80,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        precision: 0
      },
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (params: ValueGetterParams) => {
        if (params.data.isSystemGroup) return params.data.quantity || 1
        return params.data.quantity || 1
      },
      valueFormatter: (params) => params.value?.toLocaleString('he-IL') || '0',
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'כמות',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        filterType: 'number'
      })
    },
    {
      headerName: 'שם פריט',
      field: 'componentName',
      width: 200,
      editable: (params: any) => params.data?.isSystemGroup, // ✅ Only systems editable
      cellEditor: SystemNameEditor, // ✅ Direct class assignment
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : '',
      cellStyle: { textAlign: 'right', direction: 'rtl' },
      cellRenderer: (params: ICellRendererParams) => {
        if (params.data?.isSystemGroup) {
          return (
            <span className="font-bold w-full block text-right" style={{ direction: 'rtl' }}>
              {params.value}
            </span>
          )
        }

        // Check if this is an assembly item
        const isAssembly = params.data?.assemblyId

        // For assembly items: click opens assembly detail modal
        if (isAssembly) {
          return (
            <div
              onClick={(e) => {
                e.stopPropagation()
                const assembly = assemblies.find(asm => asm.id === params.data.assemblyId)
                if (assembly) {
                  setSelectedAssemblyForDetail(assembly)
                  setShowAssemblyDetail(true)
                }
              }}
              className="cursor-pointer hover:text-green-600 w-full text-right flex items-center gap-2"
              style={{ direction: 'rtl' }}
              title="לחץ לצפייה בפרטי ההרכבה"
            >
              <span className="inline-flex items-center gap-1">
                📦 {params.value}
              </span>
            </div>
          )
        }

        // For component items: double-click opens component card
        return (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation()
              const component = components.find(comp => comp.name === params.data.componentName)
              if (component) {
                setModal({ type: 'edit-component', data: component })
              }
            }}
            className="cursor-pointer hover:text-blue-600 w-full text-right"
            style={{ direction: 'rtl' }}
            title="לחץ פעמיים לפתיחת כרטיס רכיב"
          >
            {params.value}
          </div>
        )
      },
      valueGetter: (params: ValueGetterParams<any>) => {
        if (params.data.isSystemGroup) return params.data?.componentName || ''
        return params.data.componentName || ''
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'שם פריט',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        uniqueValues: getUniqueValues('componentName')
      })
    },
    {
      headerName: 'סוג',
      field: 'itemType',
      width: 100,
      editable: (params: any) => !params.data?.isSystemGroup,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['hardware', 'software', 'labor']
      },
      valueFormatter: (params) => {
        if (params.data?.isSystemGroup) return '';
        const type = params.value;
        return type === 'hardware' ? 'חומרה' : type === 'software' ? 'תוכנה' : type === 'labor' ? 'עבודה' : '';
      },
      cellClass: params => params.data?.isSystemGroup ? '' : 'ag-cell-right',
      cellStyle: (params) => {
        if (params.data?.isSystemGroup) return {};
        const type = params.data?.itemType;
        return {
          backgroundColor: type === 'hardware' ? '#e3f2fd' : type === 'software' ? '#e8f5e9' : type === 'labor' ? '#fff3e0' : 'white',
          textAlign: 'right'
        };
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'סוג',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        uniqueValues: ['hardware', 'software', 'labor']
      })
    },
    {
      headerName: 'תת-סוג עבודה',
      field: 'laborSubtype',
      width: 120,
      editable: (params: any) => !params.data?.isSystemGroup && params.data?.itemType === 'labor',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['engineering', 'commissioning', 'installation']
      },
      valueFormatter: (params) => {
        if (params.data?.isSystemGroup || params.data?.itemType !== 'labor') return '';
        const subtype = params.value;
        return subtype === 'engineering' ? 'פיתוח והנדסה' :
               subtype === 'commissioning' ? 'הרצה' :
               subtype === 'installation' ? 'התקנה' : '';
      },
      cellClass: params => params.data?.isSystemGroup || params.data?.itemType !== 'labor' ? 'ag-cell-disabled' : 'ag-cell-right',
      cellStyle: (params) => {
        if (params.data?.isSystemGroup || params.data?.itemType !== 'labor') {
          return { backgroundColor: '#f5f5f5', color: '#aaa', textAlign: 'right' };
        }
        return { textAlign: 'right' };
      },
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'תת-סוג עבודה',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        uniqueValues: ['engineering', 'commissioning', 'installation', 'programming']
      })
    },
    {
      headerName: 'מס"ד',
      field: 'displayNumber',
      width: 80,
      cellRenderer: (props: ICellRendererParams) => {
        if (props.data?.isSystemGroup) {
          return (
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
              {props.value}
            </span>
          )
        }
        return (
          <span className="font-mono text-sm text-gray-600">
            {props.value}
          </span>
        )
      },
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      sortable: false,
      headerComponent: CustomHeader,
      headerComponentParams: (params: any) => ({
        displayName: 'מס"ד',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: params.api,
        columnApi: params.columnApi,
        column: params.column,
        uniqueValues: getUniqueValues('displayNumber')
      })
    },
    {
      headerName: 'פעולות',
      field: 'actions',
      width: 150, // Increased width to accommodate edit button
      sortable: false,
      filter: false,
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-center',
      cellRenderer: (params: ICellRendererParams) => {
        if (params.data?.isSystemGroup) {
          return (
            <div className="flex gap-1 items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Delete system and all its items
                  if (!currentQuotation) return

                  const systemId = params.data.systemId

                  // Delete from Supabase first
                  try {
                    // Delete all items in this system
                    const itemsToDelete = currentQuotation.items.filter(item => item.systemId === systemId)
                    for (const item of itemsToDelete) {
                      await quotationsHook.deleteQuotationItem(item.id)
                    }

                    // Delete the system itself
                    await quotationsHook.deleteQuotationSystem(systemId)

                    // Remove from local state
                    const updatedSystems = currentQuotation.systems
                      .filter(s => s.id !== systemId)
                      .map((s, index) => ({
                        ...s,
                        order: index + 1
                      }))

                    const updatedItems = currentQuotation.items
                      .filter(item => item.systemId !== systemId)

                    // Renumber all items with new system orders
                    const renumberedItems = renumberItems(updatedItems, updatedSystems)

                    const updatedQuotation = {
                      ...currentQuotation,
                      systems: updatedSystems,
                      items: renumberedItems
                    }

                    setCurrentQuotation(updatedQuotation)
                    updateQuotation(currentQuotation.id, { systems: updatedSystems, items: renumberedItems })
                  } catch (error) {
                    console.error('Failed to delete system:', error)
                    alert('שגיאה במחיקת מערכת. נסה שוב.')
                  }
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                title="מחק מערכת"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openComponentSelector(params.data.systemId)}
                className="h-8 w-8 p-0"
                title="הוסף פריט"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )
        }
        
        return (
          <div className="flex gap-1 items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Find the component in the library
                const component = components.find(comp => comp.name === params.data.componentName)
                if (component) {
                  // Open component form modal for editing/viewing
                  setModal({ type: 'edit-component', data: component })
                }
              }}
              className="h-8 w-8 p-0"
              title="ערוך פריט"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteItem(params.data.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              title="מחק"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )
      }
    }
  ], [gridData, getUniqueValues, openComponentSelector, deleteItem, components, setModal])

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // Default column order if not configured
    const defaultOrder = ['actions', 'displayNumber', 'componentName', 'quantity', 'unitPriceILS', 'totalPriceUSD', 'totalPriceILS', 'customerPriceILS']

    console.log('🔍 config.visibleColumns:', config.visibleColumns)
    console.log('🔍 config.columnOrder:', config.columnOrder)

    // Use saved order if exists and not empty, otherwise use default
    const effectiveOrder = (config.columnOrder && config.columnOrder.length > 0)
      ? config.columnOrder
      : defaultOrder

    // ALWAYS ensure 'actions' is in visibleColumns
    const ensuredVisibleColumns = config.visibleColumns && config.visibleColumns.length > 0
      ? (config.visibleColumns.includes('actions') ? config.visibleColumns : ['actions', ...config.visibleColumns])
      : defaultOrder

    console.log('🔍 ensuredVisibleColumns:', ensuredVisibleColumns)

    const visible = columnDefs.filter(col => ensuredVisibleColumns.includes(col.field!))

    // If filtering results in no columns, fall back to all columns
    if (visible.length === 0) {
      return columnDefs
    }

    const ordered = effectiveOrder
      .filter(fieldId => visible.some(col => col.field === fieldId))
      .map(fieldId => visible.find(col => col.field === fieldId)!)

    console.log('🔍 effectiveOrder was:', effectiveOrder)
    console.log('🔍 Final ordered columns:', ordered.map(c => c.field))

    // AG Grid with enableRtl={true} does NOT reverse the array - just the visual layout
    // So we use the column order as-is
    return ordered.length > 0 ? ordered : visible
  }, [columnDefs, config.visibleColumns, config.columnOrder])

  // Auto-group column definition
  const autoGroupColumnDef = useMemo(() => ({
    headerName: 'מערכת',
    field: 'systemName',
    cellRenderer: 'agGroupCellRenderer',
    cellRendererParams: {
      innerRenderer: SystemHeaderRenderer
    },
    minWidth: 200
  }), [])

  // Grid options
  const gridOptions = useMemo(() => ({
    animateRows: true,
    enableRangeSelection: true,
    enableFillHandle: true,
    suppressRowClickSelection: false,
    rowSelection: 'multiple' as const,
    groupSelectsChildren: true,
    groupSelectsFiltered: true,
    suppressAggFuncInHeader: true,
    treeData: true,
    getDataPath: (data: any) => {
      if (data.isSystemGroup) {
        return [data.id]
      }
      return [data.systemId, data.id]
    },
    defaultColDef: {
      resizable: true,
      sortable: false,
      filter: true
    }
  }), [])

  // Handle cell value changes
  const onCellValueChanged = useCallback((params: any) => {
    if (params.data.isSystemGroup) {
      // Handle system quantity changes
      if (params.colDef.field === 'quantity') {
        const newQuantity = params.newValue
        const updatedSystems = currentQuotation?.systems.map(s =>
          s.id === params.data.systemId
            ? { ...s, quantity: newQuantity }
            : s
        )
        if (updatedSystems) {
          setCurrentQuotation(currentQuotation ? { ...currentQuotation, systems: updatedSystems } : null)
          // Persist to database
          quotationsHook.updateQuotationSystem(params.data.systemId, { quantity: newQuantity })
        }
      }
      // Handle system name changes
      else if (params.colDef.field === 'componentName') {
        const newName = params.newValue
        const updatedSystems = currentQuotation?.systems.map(s =>
          s.id === params.data.systemId
            ? { ...s, name: newName }
            : s
        )
        if (updatedSystems) {
          setCurrentQuotation(currentQuotation ? { ...currentQuotation, systems: updatedSystems } : null)
          // Persist to database
          quotationsHook.updateQuotationSystem(params.data.systemId, { system_name: newName })
        }
      }
      return
    }
    
    updateItem(params.data.id, {
      [params.colDef.field]: params.newValue
    })
  }, [updateItem, currentQuotation, setCurrentQuotation, updateQuotation, quotationsHook])

  // Handle double-click to open component card (now redundant since we handle it in cell renderer)
  const onCellDoubleClicked = useCallback((params: any) => {
    // Only open component cards for non-system rows
    if (!params.data.isSystemGroup && params.data.componentName) {
      // Find the component in the library
      const component = components.find(comp => comp.name === params.data.componentName)
      if (component) {
        // Open component form modal for editing/viewing
        setModal({ type: 'edit-component', data: component })
      }
    }
  }, [components, setModal])

  // Toggle column visibility
  const toggleColumn = useCallback((field: string) => {
    const newVisibleColumns = config.visibleColumns.includes(field)
      ? config.visibleColumns.filter(col => col !== field)
      : [...config.visibleColumns, field]
    
    saveConfig({ visibleColumns: newVisibleColumns })
  }, [config.visibleColumns, saveConfig])

  // Get all available columns for management
  const allColumns = useMemo(() => {
    return columnDefs.map(col => ({
      field: col.field!,
      headerName: col.headerName!,
      isVisible: config.visibleColumns.includes(col.field!)
    }))
  }, [columnDefs, config.visibleColumns])

  // Handle grid ready with config restoration
  const onGridReady = useCallback((params: any) => {
    if (!params.api) return

    // Apply saved column widths
    if (Object.keys(config.columnWidths).length > 0) {
      params.api.getAllDisplayedColumns()?.forEach((col: any) => {
        const fieldId = col.getColId()
        if (config.columnWidths[fieldId]) {
          params.api.setColumnWidth(col.getColId(), config.columnWidths[fieldId])
        }
      })
    }

    // Apply saved filter state
    if (Object.keys(config.filterState).length > 0) {
      params.api.setFilterModel(config.filterState)
    }

    params.api.sizeColumnsToFit()
  }, [config.columnWidths, config.filterState])

  // Handle column resize
  const onColumnResized = useCallback((params: any) => {
    if (params.finished && params.api) {
      const widths: Record<string, number> = {}
      params.api.getAllDisplayedColumns()?.forEach((col: any) => {
        widths[col.getColId()] = col.getActualWidth()
      })
      saveConfig({ columnWidths: widths })
    }
  }, [saveConfig])

  // Handle column move
  const onColumnMoved = useCallback((params: any) => {
    if (params.finished && params.api) {
      const order = params.api.getAllDisplayedColumns()?.map((col: any) => col.getColId()) || []
      saveConfig({ columnOrder: order })
    }
  }, [saveConfig])

  // Handle filter change
  const onFilterChanged = useCallback((params: any) => {
    saveConfig({ filterState: params.api.getFilterModel() })
  }, [saveConfig])

  // Calculate totals
  const calculations = useMemo(() => {
    if (!currentQuotation || !currentQuotation.parameters) return null
    return calculateQuotationTotals(currentQuotation)
  }, [currentQuotation])

  // Calculate statistics
  const statistics = useMemo(() => {
    console.log('🔍 STATISTICS CHECK:', {
      hasQuotation: !!currentQuotation,
      hasCalculations: !!calculations,
      itemsCount: currentQuotation?.items?.length || 0,
      systemsCount: currentQuotation?.systems?.length || 0,
      calculations: calculations
    })

    if (!currentQuotation || !calculations) return null

    // IMPORTANT: Ensure calculations are attached to the quotation object
    const quotationWithCalcs = {
      ...currentQuotation,
      calculations: calculations
    }

    try {
      return calculateQuotationStatistics(quotationWithCalcs)
    } catch (error) {
      console.error('Failed to calculate statistics:', error)
      return null
    }
  }, [currentQuotation, calculations])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading table configuration...</div>
  }

  if (!currentQuotation) {
    return <div className="flex items-center justify-center h-64">No quotation selected</div>
  }

  // Guard: Ensure parameters exists
  if (!currentQuotation.parameters) {
    return <div className="flex items-center justify-center h-64">Quotation data is incomplete (missing parameters)</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentQuotation.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">{currentQuotation.customerName}</p>
            {currentQuotation.projectName && (
              <>
                <span className="text-gray-400">|</span>
                <p className="text-gray-600">{currentQuotation.projectName}</p>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProjectPicker(true)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
              title="בחר פרויקט"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs">שנה פרויקט</span>
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            חזור לרשימה
          </Button>
        </div>
      </div>

      {/* Parameters */}
      <QuotationParameters
        parameters={currentQuotation.parameters}
        onChange={updateParameters}
      />

      {/* Tabs for Items and Statistics */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="items">פריטי הצעת מחיר</TabsTrigger>
          <TabsTrigger value="statistics">סטטיסטיקה</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
      {/* Systems and Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">פריטי הצעת מחיר</h3>
          
          <div className="flex items-center gap-3">
            {/* Column Management */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnManager(!showColumnManager)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                ניהול עמודות
                <ChevronDown className={`h-4 w-4 transition-transform ${showColumnManager ? 'rotate-180' : ''}`} />
              </Button>
              
              {showColumnManager && (
                <div ref={columnManagerRef} className="absolute top-full mt-2 right-0 bg-background border border-border rounded-md shadow-lg z-50 p-4 min-w-64">
                  <h4 className="font-medium mb-3">בחר עמודות להצגה</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allColumns.map(col => (
                      <label key={col.field} className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-muted p-1 rounded">
                        <input
                          type="checkbox"
                          checked={col.isVisible}
                          onChange={() => toggleColumn(col.field)}
                          className="rounded"
                        />
                        <span className="text-sm">{col.headerName}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveConfig({ visibleColumns: allColumns.map(col => col.field) })}
                    >
                      הצג הכל
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveConfig({ visibleColumns: ['displayNumber', 'componentName', 'actions'] })}
                    >
                      מינימלי
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Add System Button */}
            <Button
              onClick={addSystem}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              הוסף מערכת
            </Button>
          </div>
        </div>
        
        <div className="h-96">
          <AgGridReact
            rowData={gridData}
            columnDefs={visibleColumnDefs}
            autoGroupColumnDef={autoGroupColumnDef}
            gridOptions={gridOptions}
            enableRtl={true}
            onGridReady={onGridReady}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            onFilterChanged={onFilterChanged}
            onCellValueChanged={onCellValueChanged}
            onCellDoubleClicked={onCellDoubleClicked}
            onSelectionChanged={(e) => setSelectedItems(e.api.getSelectedRows().map((row: any) => row.id))}
            groupDefaultExpanded={1}
            className="ag-theme-alpine"
          />
        </div>
      </div>

      {/* Calculations Summary */}
      {calculations && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">סיכום חישובים</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">עלויות</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">חומרה:</span>
                  <span className="font-mono text-sm">₪{calculations.totalHardwareILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">תוכנה:</span>
                  <span className="font-mono text-sm">₪{calculations.totalSoftwareILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">עבודה:</span>
                  <span className="font-mono text-sm">₪{calculations.totalLaborILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="mr-4 space-y-0.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>→ הנדסה:</span>
                    <span className="font-mono">₪{calculations.totalEngineeringILS.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>→ הרצה:</span>
                    <span className="font-mono">₪{calculations.totalCommissioningILS.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>→ התקנה:</span>
                    <span className="font-mono">₪{calculations.totalInstallationILS.toLocaleString('he-IL', { minimumFractionDigits: 0 })}</span>
                  </div>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span className="text-sm">סה"כ עלות:</span>
                  <span className="font-mono text-sm">₪{calculations.totalCostILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">מכירות</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סה"כ מחיר נטו:</span>
                  <span className="font-mono text-sm">₪{calculations.totalCostILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">רווח:</span>
                  <span className="font-mono text-sm">₪{calculations.totalProfitILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">תוספת סיכון:</span>
                  <span className="font-mono text-sm">₪{calculations.riskAdditionILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-sm">סה"כ לפני מע"מ:</span>
                  <span className="font-mono text-sm">₪{calculations.totalQuoteILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">סטטיסטיקה</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">מספר מערכות:</span>
                  <span className="font-mono text-sm">{currentQuotation.systems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">מספר פריטים:</span>
                  <span className="font-mono text-sm">{currentQuotation.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">פריטים שנבחרו:</span>
                  <span className="font-mono text-sm">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">אחוז רווח:</span>
                  <span className="font-mono text-sm">{calculations.profitMarginPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          {statistics ? (
            <QuotationStatisticsPanelSimplified statistics={statistics} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">אין נתונים סטטיסטיים זמינים</p>
              <p className="text-sm text-gray-400 mt-2">הוסף פריטים להצעת המחיר כדי לראות סטטיסטיקה</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Component/Assembly Selector Popup */}
      {showComponentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={componentSelectorRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">בחר רכיב מהספרייה</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComponentSelector(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tabs */}
              <Tabs value={selectorTab} onValueChange={(v) => setSelectorTab(v as 'components' | 'assemblies')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="components">רכיבים ({components.length})</TabsTrigger>
                  <TabsTrigger value="assemblies">הרכבות ({assemblies.length})</TabsTrigger>
                </TabsList>

                <div className="mb-4">
                  <input
                    type="text"
                    value={componentSearchText}
                    onChange={(e) => setComponentSearchText(e.target.value)}
                    placeholder={selectorTab === 'components' ? 'חפש לפי שם, יצרן או קטגוריה...' : 'חפש הרכבה לפי שם או תיאור...'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* Components Tab */}
                <TabsContent value="components" className="mt-0">
                  <div className="overflow-y-auto max-h-[50vh]">
                    {filteredComponents.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">לא נמצאו רכיבים התואמים לחיפוש</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredComponents.map((component) => (
                          <div
                            key={component.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => addComponentToSystem(component)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{component.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {component.category}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{component.manufacturer}</p>

                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">מחיר יחידה:</span>
                                <span className="font-mono">
                                  ₪{component.unitCostNIS?.toLocaleString('he-IL', { minimumFractionDigits: 2 }) || '0.00'}
                                </span>
                              </div>
                              {component.unitCostUSD && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">מחיר דולר:</span>
                                  <span className="font-mono">
                                    ${component.unitCostUSD.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Assemblies Tab */}
                <TabsContent value="assemblies" className="mt-0">
                  <div className="overflow-y-auto max-h-[50vh]">
                    {filteredAssemblies.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">לא נמצאו הרכבות התואמות לחיפוש</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAssemblies.map((assembly) => {
                          const pricing = calculateAssemblyPricing(assembly)
                          const formatted = formatAssemblyPricing(pricing)
                          return (
                            <div
                              key={assembly.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => addAssemblyToSystem(assembly)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{assembly.name}</h4>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {pricing.componentCount} רכיבים
                                </span>
                              </div>

                              {assembly.description && (
                                <p className="text-sm text-gray-600 mb-3">{assembly.description}</p>
                              )}

                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">מחיר כולל:</span>
                                  <span className="font-mono font-semibold">
                                    {formatted.nis}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatted.usd} • {formatted.eur}
                                </div>
                              </div>

                              {!assembly.isComplete && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                  ⚠ הרכבה לא שלמה
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Component Card Modal */}
      <ComponentForm
        component={modalState?.type === 'edit-component' ? modalState.data : null}
        isOpen={modalState?.type === 'edit-component'}
        onClose={closeModal}
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        isOpen={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        onSelect={handleProjectSelect}
        currentProjectId={currentQuotation?.projectId}
      />

      {/* Assembly Detail Modal */}
      <AssemblyDetailModal
        assembly={selectedAssemblyForDetail}
        isOpen={showAssemblyDetail}
        onClose={() => {
          setShowAssemblyDetail(false)
          setSelectedAssemblyForDetail(null)
        }}
      />
    </div>
  )
}
