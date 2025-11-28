import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ComponentType, Currency, LaborSubtype } from '../../types';

export interface CustomItemData {
  name: string;
  description?: string;
  category: string;
  componentType: ComponentType;
  laborSubtype?: LaborSubtype;
  unitCost: number;
  currency: Currency;
  quantity: number;
}

interface CustomItemFormProps {
  onSubmit: (data: CustomItemData) => void;
  onCancel: () => void;
}

export function CustomItemForm({ onSubmit, onCancel }: CustomItemFormProps) {
  const [formData, setFormData] = useState<CustomItemData>({
    name: '',
    description: '',
    category: 'כללי',
    componentType: 'hardware',
    unitCost: 0,
    currency: 'NIS',
    quantity: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    field: keyof CustomItemData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-1 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
          {/* Basic Info */}
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm">
              שם הפריט *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="לדוגמה: כבל רשת מיוחד"
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="category" className="text-sm">
              קטגוריה
            </Label>
            <Input
              id="category"
              value={formData.category}
              onChange={e => handleChange('category', e.target.value)}
              placeholder="כללי"
              className="h-9"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-1">
            <Label htmlFor="componentType" className="text-sm">
              סוג פריט
            </Label>
            <Select
              value={formData.componentType}
              onValueChange={(value: ComponentType) =>
                handleChange('componentType', value)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hardware">חומרה</SelectItem>
                <SelectItem value="software">תוכנה</SelectItem>
                <SelectItem value="labor">עבודה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Always render labor subtype to prevent layout shift - just hide it */}
          <div
            className={`space-y-1 ${formData.componentType !== 'labor' ? 'invisible' : ''}`}
          >
            <Label htmlFor="laborSubtype" className="text-sm">
              סוג עבודה
            </Label>
            <Select
              value={formData.laborSubtype || 'installation'}
              onValueChange={(value: LaborSubtype) =>
                handleChange('laborSubtype', value)
              }
              disabled={formData.componentType !== 'labor'}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineering">הנדסה</SelectItem>
                <SelectItem value="programming">תכנות</SelectItem>
                <SelectItem value="installation">התקנה</SelectItem>
                <SelectItem value="commissioning">הפעלה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing */}
          <div className="space-y-1">
            <Label htmlFor="unitCost" className="text-sm">
              מחיר יחידה *
            </Label>
            <Input
              id="unitCost"
              type="number"
              min="0"
              step="1"
              value={formData.unitCost}
              onChange={e => {
                const value = parseInt(e.target.value);
                handleChange('unitCost', isNaN(value) ? 0 : value);
              }}
              className="h-9"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="currency" className="text-sm">
              מטבע *
            </Label>
            <Select
              value={formData.currency}
              onValueChange={(value: Currency) =>
                handleChange('currency', value)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NIS">₪ (ILS)</SelectItem>
                <SelectItem value="USD">$ (USD)</SelectItem>
                <SelectItem value="EUR">€ (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="quantity" className="text-sm">
              כמות *
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={formData.quantity}
              onChange={e => {
                const value = parseInt(e.target.value);
                handleChange('quantity', isNaN(value) ? 1 : value);
              }}
              className="h-9"
              required
            />
          </div>
        </div>

        <div className="space-y-1 mt-3">
          <Label htmlFor="description" className="text-sm">
            תיאור / הערות
          </Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleChange('description', e.target.value)
            }
            rows={2}
            className="text-sm"
          />
        </div>
      </div>

      {/* Sticky footer with buttons */}
      <div className="sticky bottom-0 bg-white border-t pt-3 pb-1 px-1 flex justify-end space-x-2 space-x-reverse">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          ביטול
        </Button>
        <Button type="submit" size="sm">
          הוסף פריט
        </Button>
      </div>
    </form>
  );
}
