import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Package,
  Plus,
  Search,
  DollarSign,
  Building,
  Calendar,
  Sparkles
} from 'lucide-react'
import { useCPQ } from '../../contexts/CPQContext'
import { Component } from '../../types'
import { ComponentForm } from './ComponentForm'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EnhancedComponentGrid } from './EnhancedComponentGrid'
import { SupplierQuoteImport } from '../supplier-quotes/SupplierQuoteImport'
import { useComponents } from '../../hooks/useComponents'
import { toast } from 'sonner'

export function ComponentLibrary() {
  const { components, updateComponent, deleteComponent, setModal, modalState, closeModal } = useCPQ()
  const { addComponent } = useComponents()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAIImportOpen, setIsAIImportOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; componentId: string | null; componentName: string }>({
    isOpen: false,
    componentId: null,
    componentName: ''
  })

  // Handle inline component updates
  const handleComponentUpdate = useCallback(async (componentId: string, field: string, value: any) => {
    try {
      const component = components.find(c => c.id === componentId)
      if (component) {
        await updateComponent(componentId, { [field]: value })
      }
    } catch (error) {
      console.error('Failed to update component:', error)
    }
  }, [components, updateComponent])

  // Filter components based on search only
  const filteredComponents = useMemo(() => {
    return components.filter(component => {
      const matchesSearch = searchTerm === '' || 
        component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.manufacturerPN.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [components, searchTerm])

  const handleAddComponent = () => {
    setModal({ type: 'add-component', data: null })
  }

  const handleEditComponent = (component: Component) => {
    setModal({ type: 'edit-component', data: component })
  }

  const handleDuplicateComponent = (component: Component) => {
    // Create a duplicate without an ID so the form treats it as new
    const duplicatedComponent = {
      name: `${component.name} (העתק)`,
      description: component.description || '',
      category: component.category,
      productType: component.productType || '',
      manufacturer: component.manufacturer,
      manufacturerPN: component.manufacturerPN,
      supplier: component.supplier,
      unitCostNIS: component.unitCostNIS,
      unitCostUSD: component.unitCostUSD || 0,
      currency: component.currency || 'NIS',
      originalCost: component.originalCost || component.unitCostNIS,
      quoteDate: component.quoteDate || new Date().toISOString().split('T')[0],
      notes: component.notes || ''
    }
    setModal({ type: 'add-component', data: duplicatedComponent })
  }

  const handleDeleteComponent = (componentId: string, componentName: string) => {
    setDeleteConfirm({
      isOpen: true,
      componentId,
      componentName
    })
  }

  const confirmDelete = async () => {
    if (deleteConfirm.componentId) {
      await deleteComponent(deleteConfirm.componentId)
      setDeleteConfirm({ isOpen: false, componentId: null, componentName: '' })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, componentId: null, componentName: '' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ספריית רכיבים</h1>
          <p className="text-muted-foreground">
            נהל את הרכיבים והאסמבלים שלך ({components.length} רכיבים)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAIImportOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            ייבוא חכם
          </Button>
          <Button onClick={handleAddComponent}>
            <Plus className="h-4 w-4 ml-2" />
            הוסף רכיב
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם, יצרן, מקט, קטגוריה, סוג מוצר, ספק..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
        </div>
      </div>

      {/* Enhanced Grid */}
      {filteredComponents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'לא נמצאו רכיבים תואמים' : 'אין רכיבים שנוספו עדיין'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'נסה לשנות את תנאי החיפוש'
                : 'התחל בהוספת הרכיב הראשון שלך לספרייה'
              }
            </p>
            {!searchTerm && (
              <Button onClick={handleAddComponent}>
                <Plus className="h-4 w-4 ml-2" />
                הוסף רכיב ראשון
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <EnhancedComponentGrid
          components={filteredComponents}
          onEdit={handleEditComponent}
          onDelete={handleDeleteComponent}
          onDuplicate={handleDuplicateComponent}
          onComponentUpdate={handleComponentUpdate}
        />
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">סה"כ רכיבים</span>
            </div>
            <p className="text-2xl font-bold">{components.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">ספקים</span>
            </div>
            <p className="text-2xl font-bold">
              {new Set(components.map(c => c.supplier)).size}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">ערך ממוצע</span>
            </div>
            <p className="text-2xl font-bold">
              {components.length > 0 
                ? formatCurrency(components.reduce((sum, c) => sum + c.unitCostNIS, 0) / components.length)
                : '$0'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">עודכן לאחרונה</span>
            </div>
            <p className="text-2xl font-bold">
              {components.length > 0 
                ? new Date(Math.max(...components.map(c => new Date(c.updatedAt).getTime()))).toLocaleDateString('he-IL')
                : '-'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Component Form Modal */}
      <ComponentForm
        component={modalState?.type === 'edit-component' || modalState?.type === 'add-component' ? modalState.data : null}
        isOpen={modalState?.type === 'add-component' || modalState?.type === 'edit-component'}
        onClose={closeModal}
      />

      {/* AI Import Modal - Now uses enhanced SupplierQuoteImport */}
      <SupplierQuoteImport
        isOpen={isAIImportOpen}
        onClose={() => setIsAIImportOpen(false)}
        onSuccess={() => {
          setIsAIImportOpen(false);
          toast.success('רכיבים יובאו בהצלחה');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="מחיקת רכיב"
        message={`האם אתה בטוח שברצונך למחוק את הרכיב "${deleteConfirm.componentName}"? פעולה זו אינה ניתנת לביטול.`}
        confirmText="מחק"
        cancelText="ביטול"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}
