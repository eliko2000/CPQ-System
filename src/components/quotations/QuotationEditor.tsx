import { useState, useCallback, useMemo, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, ICellRendererParams, ValueGetterParams, ICellEditorParams } from 'ag-grid-community'
import { useCPQ } from '../../contexts/CPQContext'
import { QuotationProject, QuotationItem, QuotationSystem, Component } from '../../types'
import { QuotationParameters } from './QuotationParameters'
import { calculateQuotationTotals, renumberItems } from '../../utils/quotationCalculations'
import { Button } from '../ui/button'
import { Trash2, Plus, Settings, ChevronDown, X, Save, LogOut, Edit } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useTableConfig } from '../../hooks/useTableConfig'
import { useQuotations } from '../../hooks/useQuotations'
import { CustomHeader } from '../grid/CustomHeader'
import { ComponentForm } from '../library/ComponentForm'
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
    setCurrentQuotation,
    updateQuotation,
    addQuotation,
    setModal,
    modalState,
    closeModal
  } = useCPQ()

  // Use quotations hook for Supabase persistence
  const quotationsHook = useQuotations()

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('quotation_editor', {
    columnOrder: ['customerPriceILS', 'totalPriceILS', 'totalPriceUSD', 'unitPriceILS', 'quantity', 'componentName', 'displayNumber', 'actions'],
    columnWidths: {},
    visibleColumns: ['customerPriceILS', 'totalPriceILS', 'totalPriceUSD', 'unitPriceILS', 'quantity', 'componentName', 'displayNumber', 'actions'],
    filterState: {}
  })

  // Make components available globally for the LibrarySearchEditor
  useEffect(() => {
    (window as any).__cpq_components = components
  }, [components])

  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showComponentSelector, setShowComponentSelector] = useState(false)
  const [selectedSystemId, setSelectedSystemId] = useState<string>('')
  const [componentSearchText, setComponentSearchText] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)

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
      setIsDirty(true)
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

    // Persist item to Supabase FIRST to get real ID
    try {
      const dbItem = await quotationsHook.addQuotationItem({
        quotation_system_id: selectedSystemId,
        component_id: component.id,
        item_name: component.name,
        manufacturer: component.manufacturer,
        manufacturer_part_number: component.manufacturerPN,
        quantity: 1,
        unit_cost: component.unitCostNIS || 0,
        total_cost: component.unitCostNIS || 0,
        unit_price: component.unitCostNIS || 0,
        total_price: component.unitCostNIS || 0,
        margin_percentage: currentQuotation.parameters.markupPercent || 25,
        sort_order: itemOrder
      })

      if (!dbItem) {
        throw new Error('Failed to create item')
      }

      // Create local item with DB ID
      const newItem: QuotationItem = {
        id: dbItem.id,
        systemId: selectedSystemId,
        systemOrder: system.order,
        itemOrder: itemOrder,
        displayNumber: `${system.order}.${itemOrder}`,
        componentId: component.id,
        componentName: component.name,
        componentCategory: component.category,
        isLabor: false,
        quantity: dbItem.quantity,
        unitPriceUSD: component.unitCostUSD || 0,
        unitPriceILS: dbItem.unit_cost || 0,
        totalPriceUSD: (component.unitCostUSD || 0) * dbItem.quantity,
        totalPriceILS: dbItem.total_cost || 0,
        itemMarkupPercent: dbItem.margin_percentage || 25,
        customerPriceILS: dbItem.total_price || 0,
        notes: dbItem.notes || '',
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at
      }

      const updatedQuotation = {
        ...currentQuotation,
        items: [...currentQuotation.items, newItem]
      }

      setCurrentQuotation(updatedQuotation)
      updateQuotation(currentQuotation.id, { items: updatedQuotation.items })
      setShowComponentSelector(false)
      setIsDirty(true)
    } catch (error) {
      console.error('Failed to save item:', error)
      alert('שגיאה בהוספת פריט. נסה שוב.')
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
    setIsDirty(true)
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
    setIsDirty(true)
  }, [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation])

  // Update parameters
  const updateParameters = useCallback((parameters: any) => {
    if (!currentQuotation) return

    const updatedQuotation = {
      ...currentQuotation,
      parameters
    }

    setCurrentQuotation(updatedQuotation)
    updateQuotation(currentQuotation.id, { parameters })
    setIsDirty(true)
  }, [currentQuotation, setCurrentQuotation, updateQuotation])

  // Handle save and exit
  const handleSaveAndExit = useCallback(() => {
    if (currentQuotation) {
      // Save is already handled through updateQuotation calls
      // Just clear the current quotation to go back to list
      setCurrentQuotation(null)
      setIsDirty(false)
    }
  }, [currentQuotation, setCurrentQuotation])

  // Handle close (with confirmation if dirty)
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirmation(true)
    } else {
      setCurrentQuotation(null)
    }
  }, [isDirty, setCurrentQuotation])

  // Confirm exit without saving
  const confirmExit = useCallback(() => {
    setShowExitConfirmation(false)
    setIsDirty(false)
    setCurrentQuotation(null)
  }, [setCurrentQuotation])

  // Cancel exit
  const cancelExit = useCallback(() => {
    setShowExitConfirmation(false)
  }, [])

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
    const markupPercent = currentQuotation.parameters?.markupPercent ?? 25
    
    // Create tree structure with systems as parent nodes
    currentQuotation.systems.forEach(system => {
      const systemItems = currentQuotation.items.filter(item => item.systemId === system.id)
      
      // Calculate system totals with current profit coefficient
      const systemTotalCost = systemItems.reduce((sum, item) => sum + ((item.unitPriceILS || 0) * (item.quantity ||1)), 0)
      const profitCoefficient = 1 / (1 + markupPercent / 100)
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
        const profitCoefficient = 1 / (1 + markupPercent / 100)
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

  // Grid column definitions (RTL order - all pinned to right)
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'מחיר ללקוח',
      field: 'customerPriceILS',
      width: 120,
      pinned: 'right',
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
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0
            const quantity = item.quantity || 1
            const markupPercent = currentQuotation?.parameters?.markupPercent ?? 25
            const profitCoefficient = 1 / (1 + markupPercent / 100)
            const customerPrice = (unitPrice * quantity) / profitCoefficient
            return sum + customerPrice
          }, 0)
          return itemsTotal * systemQuantity
        }
        // Calculate customer price with profit coefficient for individual items
        const unitPrice = params.data.unitPriceILS || 0
        const quantity = params.data.quantity || 1
        const markupPercent = currentQuotation?.parameters?.markupPercent ?? 25
        const profitCoefficient = 1 / (1 + markupPercent / 100)
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
      pinned: 'right',
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
      pinned: 'right',
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
      pinned: 'right',
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
      pinned: 'right',
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
      pinned: 'right',
      editable: (params: any) => params.data?.isSystemGroup, // ✅ Only systems editable
      cellEditor: SystemNameEditor, // ✅ Direct class assignment
      cellClass: params => params.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      cellRenderer: (params: ICellRendererParams) => {
        if (params.data?.isSystemGroup) {
          return (
            <span className="font-bold">
              {params.value}
            </span>
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
            className="cursor-pointer hover:text-blue-600"
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
      headerName: 'מס"ד',
      field: 'displayNumber',
      width: 80,
      pinned: 'right',
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
      pinned: 'right',
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
                    setIsDirty(true)
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
    // First filter by visibility, then reorder
    const visible = columnDefs.filter(col => config.visibleColumns.includes(col.field!))
    
    // Reorder according to config.columnOrder
    const ordered = config.columnOrder
      .filter(fieldId => visible.some(col => col.field === fieldId))
      .map(fieldId => visible.find(col => col.field === fieldId)!)
    
    return ordered
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
          updateQuotation(currentQuotation?.id || '', { systems: updatedSystems })
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
          updateQuotation(currentQuotation?.id || '', { systems: updatedSystems })
        }
      }
      return
    }
    
    updateItem(params.data.id, {
      [params.colDef.field]: params.newValue
    })
  }, [updateItem, currentQuotation, setCurrentQuotation, updateQuotation])

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
    if (!currentQuotation) return null
    return calculateQuotationTotals(currentQuotation)
  }, [currentQuotation])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading table configuration...</div>
  }

  if (!currentQuotation) {
    return <div className="flex items-center justify-center h-64">No quotation selected</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentQuotation.name}
            {isDirty && <span className="text-orange-500 text-sm mr-2">(שינויים שלא נשמרו)</span>}
          </h1>
          <p className="text-gray-600">{currentQuotation.customerName}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSaveAndExit}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            שמור וצא
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            סגור
          </Button>
        </div>
      </div>

      {/* Parameters */}
      <QuotationParameters
        parameters={currentQuotation.parameters}
        onChange={updateParameters}
      />

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">עלויות</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">חומרה:</span>
                  <span className="font-mono text-sm">₪{calculations.totalHardwareILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">עבודה:</span>
                  <span className="font-mono text-sm">₪{calculations.totalLaborILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">סה"כ עלות:</span>
                  <span className="font-mono text-sm">₪{calculations.totalCostILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">מכירות</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סה"כ לפני סיכון מע"מ:</span>
                  <span className="font-mono text-sm">₪{calculations.totalCustomerPriceILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">תוספת סיכון:</span>
                  <span className="font-mono text-sm">₪{calculations.riskAdditionILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סה"כ לפני מע"מ:</span>
                  <span className="font-mono text-sm">₪{calculations.totalQuoteILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">סה"כ סופי:</span>
                  <span className="font-mono text-sm">₪{calculations.finalTotalILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">רווח</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סה"כ רווח:</span>
                  <span className="font-mono text-sm">₪{calculations.totalProfitILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">אחוז רווח:</span>
                  <span className="font-mono text-sm">{calculations.profitMarginPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">סיכון:</span>
                  <span className="font-mono text-sm">₪{calculations.riskAdditionILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Component Selector Popup */}
      {showComponentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={componentSelectorRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
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

              <div className="mt-4">
                <input
                  type="text"
                  value={componentSearchText}
                  onChange={(e) => setComponentSearchText(e.target.value)}
                  placeholder="חפש לפי שם, יצרן או קטגוריה..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
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
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">שינויים שלא נשמרו</h3>
            <p className="text-gray-600 mb-6">
              יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת מבלי לשמור?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={cancelExit}
                variant="outline"
              >
                ביטול
              </Button>
              <Button
                onClick={confirmExit}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                צא מבלי לשמור
              </Button>
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
    </div>
  )
}
