import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useCPQ } from '../../contexts/CPQContext'
import { Component, ComponentFormData, ComponentType, LaborSubtype } from '../../types'
import { useClickOutside } from '../../hooks/useClickOutside'
import { getComponentCategories, CATEGORIES_UPDATED_EVENT } from '../../constants/settings'
import { classifyComponent } from '../../services/componentTypeClassifier'
import { convertToAllCurrencies, getGlobalExchangeRates, type Currency } from '../../utils/currencyConversion'
import { classifyLaborSubtype } from '../../services/laborClassifier'
import { useErrorHandler } from '../../hooks/useErrorHandler'

interface ComponentFormProps {
  component?: Component | null
  isOpen: boolean
  onClose: () => void
}

export function ComponentForm({ component, isOpen, onClose }: ComponentFormProps) {
  const { addComponent, updateComponent } = useCPQ()
  const { handleError, handleWarning, handleSuccess } = useErrorHandler()
  const [categories, setCategories] = useState<string[]>(() => getComponentCategories())
  const [formData, setFormData] = useState<ComponentFormData & { componentType: ComponentType; laborSubtype?: LaborSubtype }>({
    name: '',
    description: '',
        category: 'אחר',
    componentType: 'hardware',
    laborSubtype: undefined,
    productType: '',
    manufacturer: '',
    manufacturerPN: '',
    supplier: '',
    unitCostNIS: 0,
    unitCostUSD: 0,
    unitCostEUR: 0,
    currency: 'NIS',
    originalCost: 0,
    quoteDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [priceInputField, setPriceInputField] = useState<'NIS' | 'USD' | 'EUR'>('NIS')
  const modalRef = useClickOutside<HTMLDivElement>(() => handleClose())

  // Listen for category updates from settings
  useEffect(() => {
    const handleCategoriesUpdate = () => {
      setCategories(getComponentCategories())
    }

    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesUpdate)
    return () => {
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesUpdate)
    }
  }, [])

  // Initialize form data when component changes
  useEffect(() => {
    if (component) {
      // Check if it's a full Component (has id) or ComponentFormData (no id)
      if ('id' in component) {
        // Full Component - editing existing
        const componentCurrency = component.currency || 'NIS'
        setFormData({
          name: component.name,
          description: component.description || '',
          category: component.category,
          componentType: component.componentType || 'hardware',
          laborSubtype: component.laborSubtype, // ← FIXED: Include laborSubtype
          productType: component.productType || '',
          manufacturer: component.manufacturer,
          manufacturerPN: component.manufacturerPN,
          supplier: component.supplier,
          unitCostNIS: component.unitCostNIS,
          unitCostUSD: component.unitCostUSD || 0,
          unitCostEUR: component.unitCostEUR || 0,
          currency: componentCurrency,
          originalCost: component.originalCost || component.unitCostNIS,
          quoteDate: component.quoteDate || new Date().toISOString().split('T')[0],
          notes: component.notes || ''
        })
        // Set the price input field to match the original currency (green field)
        setPriceInputField(componentCurrency)
      } else {
        // ComponentFormData - duplicating or new with pre-filled data
        const formDataCurrency = (component as ComponentFormData).currency || 'NIS'
        setFormData({
          ...(component as ComponentFormData),
          componentType: (component as any).componentType || 'hardware'
        })
        setPriceInputField(formDataCurrency)
      }
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'אחר',
        componentType: 'hardware',  // ← ADDED THIS
        productType: '',
        manufacturer: '',
        manufacturerPN: '',
        supplier: '',
        unitCostNIS: 0,
        unitCostUSD: 0,
        unitCostEUR: 0,
        currency: 'NIS',
        originalCost: 0,
        quoteDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setPriceInputField('NIS')
    }
  }, [component])

  const handleInputChange = (field: keyof ComponentFormData | 'componentType' | 'laborSubtype', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePriceChange = (currency: Currency, value: number) => {
    setPriceInputField(currency)

    // Get exchange rates from global settings
    const rates = getGlobalExchangeRates()

    // Convert to all currencies
    const convertedPrices = convertToAllCurrencies(value, currency, rates)

    setFormData(prev => ({
      ...prev,
      unitCostNIS: convertedPrices.unitCostNIS,
      unitCostUSD: convertedPrices.unitCostUSD,
      unitCostEUR: convertedPrices.unitCostEUR,
      originalCost: convertedPrices.originalCost,
      currency: convertedPrices.currency
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.manufacturer.trim() || !formData.supplier.trim()) {
      handleWarning('שדות חסרים', 'נא למלא שדות חובה: שם, יצרן וספק')
      return
    }

    if (formData.unitCostNIS <= 0) {
      handleWarning('מחיר לא תקין', 'מחיר חייב להיות גדול מ-0')
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

      // FIXED: Check if component has an 'id' property to distinguish between editing and adding
      if (component && 'id' in component) {
        // Editing existing component - has an id
        await updateComponent(component.id, componentData)
        handleSuccess('הרכיב עודכן בהצלחה')
      } else {
        // Adding new component (including duplicates) - no id
        await addComponent(componentData)
        handleSuccess('הרכיב נוסף בהצלחה')
      }
      onClose()
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה בשמירת רכיב',
        context: { componentName: formData.name }
      })
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
            {component && 'id' in component ? 'עריכת רכיב' : 'הוספת רכיב חדש'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">מידע בסיסי</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                  <label className="block text-sm font-medium mb-1">
                    קטגוריה
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    סוג רכיב *
                  </label>
                  <select
                    value={formData.componentType}
                    onChange={(e) => handleInputChange('componentType', e.target.value as ComponentType)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="hardware">חומרה (Hardware)</option>
                    <option value="software">תוכנה (Software)</option>
                    <option value="labor">עבודה (Labor)</option>
                  </select>
                  {formData.name && (() => {
                    const suggestion = classifyComponent(formData.name, formData.category, formData.description);
                    if (suggestion.componentType !== formData.componentType && suggestion.confidence > 0.5) {
                      return (
                        <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <span>💡</span>
                          <span>
                            הצעה: {suggestion.componentType === 'hardware' ? 'חומרה' : suggestion.componentType === 'software' ? 'תוכנה' : 'עבודה'}
                            {' '}({(suggestion.confidence * 100).toFixed(0)}% ביטחון)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInputChange('componentType', suggestion.componentType)}
                            className="underline hover:text-amber-800"
                          >
                            החל
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Labor Subtype - Only show for labor components */}
                {formData.componentType === 'labor' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      סוג עבודה *
                    </label>
                    <select
                      value={formData.laborSubtype || ''}
                      onChange={(e) => handleInputChange('laborSubtype', e.target.value as LaborSubtype)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                    >
                      <option value="">בחר סוג עבודה...</option>
                      <option value="engineering">פיתוח והנדסה (Engineering & Development)</option>
                      <option value="commissioning">הזמנה והפעלה (Commissioning)</option>
                      <option value="installation">התקנה (Installation)</option>
                    </select>
                    {formData.name && formData.componentType === 'labor' && (() => {
                      const laborClassification = classifyLaborSubtype(formData.name, formData.description);
                      if (laborClassification.laborSubtype !== formData.laborSubtype && laborClassification.confidence > 0.5) {
                        const hebrewLabels: Record<LaborSubtype, string> = {
                          engineering: 'פיתוח והנדסה',
                          commissioning: 'הזמנה והפעלה',
                          installation: 'התקנה'
                        };
                        return (
                          <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                            <span>💡</span>
                            <span>
                              הצעה: {hebrewLabels[laborClassification.laborSubtype]}
                              {' '}({(laborClassification.confidence * 100).toFixed(0)}% ביטחון)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInputChange('laborSubtype', laborClassification.laborSubtype)}
                              className="underline hover:text-amber-800"
                            >
                              החל
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  תיאור
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="תיאור מפורט של הרכיב..."
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-vertical"
                />
              </div>
            </div>

            {/* Manufacturer Information */}
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">מידע יצרן</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                  <label className="block text-sm font-medium mb-1">
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
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">מידע ספק</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
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
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">מחירון</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    מחיר בש"ח
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostNIS}
                    onChange={(e) => handlePriceChange('NIS', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={priceInputField === 'NIS' ? 'bg-green-100 border-green-400' : 'bg-orange-50 border-orange-300'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    מחיר בדולר
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostUSD}
                    onChange={(e) => handlePriceChange('USD', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={priceInputField === 'USD' ? 'bg-green-100 border-green-400' : 'bg-orange-50 border-orange-300'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    מחיר באירו
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCostEUR}
                    onChange={(e) => handlePriceChange('EUR', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={priceInputField === 'EUR' ? 'bg-green-100 border-green-400' : 'bg-orange-50 border-orange-300'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    תאריך הצעת מחיר
                  </label>
                  <Input
                    type="date"
                    value={formData.quoteDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    תאריך יצירה
                  </label>
                  <Input
                    type="date"
                    value={component && 'createdAt' in component ? component.createdAt : new Date().toISOString().split('T')[0]}
                    disabled
                    className="w-full px-3 py-2 border border-input bg-gray-100 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-3">
              <div className="border-b pb-2">
                <h3 className="text-lg font-semibold text-blue-600">מידע נוסף</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  הערות
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="הערות נוספות על הרכיב..."
                  rows={2}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm resize-vertical"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t">
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
                {isSubmitting ? 'שומר...' : (component && 'id' in component ? 'עדכן רכיב' : 'הוסף רכיב')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
