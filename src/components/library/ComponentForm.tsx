import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useCPQ } from '../../contexts/CPQContext'
import { Component, ComponentFormData } from '../../types'
import { useClickOutside } from '../../hooks/useClickOutside'

// Unified categories for both form and grid
const UNIFIED_CATEGORIES = [
  'בקרים (PLCs)',
  'חיישנים',
  'אקטואטורים',
  'מנועים',
  'בקרים',
  'ספקי כוח',
  'תקשורת',
  'בטיחות',
  'מכני',
  'כבלים ומחברים',
  'אחר'
]

interface ComponentFormProps {
  component?: Component | null
  isOpen: boolean
  onClose: () => void
}

export function ComponentForm({ component, isOpen, onClose }: ComponentFormProps) {
  const { addComponent, updateComponent } = useCPQ()
  const [formData, setFormData] = useState<ComponentFormData>({
    name: '',
    description: '',
        category: 'אחר',
    productType: '',
    manufacturer: '',
    manufacturerPN: '',
    supplier: '',
    unitCostNIS: 0,
    unitCostUSD: 0,
    currency: 'NIS',
    originalCost: 0,
    quoteDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const modalRef = useClickOutside<HTMLDivElement>(() => handleClose())

  // Initialize form data when component changes
  useEffect(() => {
    if (component) {
      setFormData({
        name: component.name,
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
      })
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'אחר',
        productType: '',
        manufacturer: '',
        manufacturerPN: '',
        supplier: '',
        unitCostNIS: 0,
        unitCostUSD: 0,
        currency: 'NIS',
        originalCost: 0,
        quoteDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    }
  }, [component])

  const handleInputChange = (field: keyof ComponentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.manufacturer.trim() || !formData.supplier.trim()) {
      alert('נא למלא שדות חובה: שם, יצרן וספק')
      return
    }

    if (formData.unitCostNIS <= 0) {
      alert('מחיר חייב להיות גדול מ-0')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Convert ComponentFormData to Component by adding required fields
      const componentData = {
        ...formData,
        quoteDate: new Date().toISOString().split('T')[0], // Today's date
        quoteFileUrl: '', // Empty for manual entry
      }
      
      if (component) {
        await updateComponent(component.id, componentData)
      } else {
        await addComponent(componentData)
      }
      onClose()
    } catch (error) {
      alert(`שגיאה בשמירת רכיב: ${error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card ref={modalRef} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {component ? 'עריכת רכיב' : 'הוספת רכיב חדש'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מידע בסיסי</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    שם רכיב *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="לדוגמה: שסתום סולנואידי"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    קטגוריה
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    {UNIFIED_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    סוג מוצר
                  </label>
                  <Input
                    value={formData.productType}
                    onChange={(e) => handleInputChange('productType', e.target.value)}
                    placeholder="לדוגמה: שסתומים, חיישנים, מנועים"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="תיאור מפורט של הרכיב..."
                  rows={3}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-vertical"
                />
              </div>
            </div>

            {/* Manufacturer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מידע יצרן</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    יצרן *
                  </label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                    placeholder="לדוגמה: Siemens"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    מק"ט יצרן
                  </label>
                  <Input
                    value={formData.manufacturerPN}
                    onChange={(e) => handleInputChange('manufacturerPN', e.target.value)}
                    placeholder="לדוגמה: 6ES7214-1AG40-0XB0"
                  />
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מידע ספק</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  ספק *
                </label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="לדוגמה: אלקטרוניקה ישראלית"
                  required
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מחירון</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    מטבע מקורי
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value as 'NIS' | 'USD' | 'EUR')}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="NIS">ש"ח</option>
                    <option value="USD">דולר</option>
                    <option value="EUR">אירו</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    מחיר מקורי *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalCost}
                    onChange={(e) => handleInputChange('originalCost', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    מחיר בש"ח (מחושב)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostNIS}
                    onChange={(e) => handleInputChange('unitCostNIS', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    מחיר בדולר (מחושב)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostUSD}
                    onChange={(e) => handleInputChange('unitCostUSD', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-green-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    תאריך הצעת מחיר
                  </label>
                  <Input
                    type="date"
                    value={formData.quoteDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מידע נוסף</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="הערות נוספות על הרכיב..."
                  rows={3}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-vertical"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'שומר...' : (component ? 'עדכן רכיב' : 'הוסף רכיב')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
