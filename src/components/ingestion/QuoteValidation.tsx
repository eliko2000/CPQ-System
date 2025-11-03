import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { CheckCircle, XCircle, AlertTriangle, FileText, ExternalLink, Edit3, Save } from 'lucide-react'
import { ValidatedComponent, ComponentFormData } from '@/types'

interface QuoteValidationProps {
  extractedData: {
    supplier: string;
    quoteDate: string;
    items: Array<{
      name: string;
      description?: string;
      manufacturer?: string;
      manufacturerPN?: string;
      quantity?: number;
      unitPrice?: number;
      confidence: number;
    }>;
    confidence: number;
  };
  onComplete: (validatedComponents: ValidatedComponent[]) => void;
}

export function QuoteValidation({ extractedData, onComplete }: QuoteValidationProps) {
  const [validatedComponents, setValidatedComponents] = useState<ValidatedComponent[]>(() =>
    extractedData.items.map((item) => ({
      extractedItem: item,
      status: item.confidence > 0.8 ? 'approved' : 'modified',
      componentData: {
        name: item.name,
        description: item.description,
        manufacturer: item.manufacturer,
        manufacturerPN: item.manufacturerPN,
        unitCostNIS: item.unitPrice || 0,
      },
      notes: item.confidence > 0.8 ? 'זוהה אוטומטית' : 'דורש בדיקה'
    }))
  )

  const handleComponentChange = (index: number, field: keyof ComponentFormData, value: string | number) => {
    setValidatedComponents(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        componentData: {
          ...updated[index].componentData,
          [field]: value
        },
        status: 'modified'
      }
      return updated
    })
  }

  const handleStatusChange = (index: number, status: 'approved' | 'modified' | 'rejected') => {
    setValidatedComponents(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status }
      return updated
    })
  }

  const handleSave = () => {
    const approvedComponents = validatedComponents.filter(comp => comp.status === 'approved')
    onComplete(approvedComponents)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-100 text-green-800'
    if (confidence > 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'modified':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-3 w-3" />
      case 'modified':
        return <Edit3 className="h-3 w-3" />
      case 'rejected':
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertTriangle className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-reverse space-x-2">
              <FileText className="h-5 w-5" />
              <span>אימות ואימות נתונים מהצעה</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getConfidenceColor(extractedData.confidence)}>
                ביטחון: {(extractedData.confidence * 100).toFixed(0)}%
              </Badge>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 ml-2" />
                הצג מקורב
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">ספק:</span>
                <span className="mr-2">{extractedData.supplier}</span>
              </div>
              <div>
                <span className="font-medium">תאריך:</span>
                <span className="mr-2">{extractedData.quoteDate}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-foreground">פריטים שזוהו ({extractedData.items.length})</h3>
              <div className="space-y-3">
                {validatedComponents.map((component, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-reverse space-x-2 mb-2">
                            <Badge className={getStatusColor(component.status)}>
                              {getStatusIcon(component.status)}
                              {component.status === 'approved' ? 'אושר' :
                               component.status === 'modified' ? 'נערך' : 'נדחה'}
                            </Badge>
                            <div>
                              <h4 className="font-semibold">{component.extractedItem.name}</h4>
                              {component.extractedItem.description && (
                                <p className="text-sm text-muted-foreground">
                                  {component.extractedItem.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(index, component.status === 'approved' ? 'modified' : 'approved')}
                          >
                            {component.status === 'approved' ? 'ערוך' : 'אשר'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(index, 'rejected')}
                          >
                            דחה
                          </Button>
                        </div>
                      </div>

                      {(component.status === 'approved' || component.status === 'modified') && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              שם רכיב
                            </label>
                            <Input
                              value={component.componentData?.name || ''}
                              onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
                              placeholder="שם הרכיב"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              יצרן
                            </label>
                            <Input
                              value={component.componentData?.manufacturer || ''}
                              onChange={(e) => handleComponentChange(index, 'manufacturer', e.target.value)}
                              placeholder="יצרן"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground">
                              מק"ט יצרן
                            </label>
                            <Input
                              value={component.componentData?.manufacturerPN || ''}
                              onChange={(e) => handleComponentChange(index, 'manufacturerPN', e.target.value)}
                              placeholder="מקט יצרן"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              קטגוריה
                            </label>
                            <Input
                              value={component.componentData?.category || ''}
                              onChange={(e) => handleComponentChange(index, 'category', e.target.value)}
                              placeholder="קטגוריה"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              ספק
                            </label>
                            <Input
                              value={component.componentData?.supplier || ''}
                              onChange={(e) => handleComponentChange(index, 'supplier', e.target.value)}
                              placeholder="ספק"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              מחיר (₪)
                            </label>
                            <Input
                              type="number"
                              value={component.componentData?.unitCostNIS || 0}
                              onChange={(e) => handleComponentChange(index, 'unitCostNIS', parseFloat(e.target.value) || 0)}
                              placeholder="מחיר בשקלים"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-reverse space-x-2">
        <Button variant="outline">
          צור הכל
        </Button>
        <Button onClick={handleSave} className="flex items-center space-x-reverse space-x-2">
          <Save className="h-4 w-4" />
          שמור רכיבים אישורים
        </Button>
      </div>
    </div>
  )
}