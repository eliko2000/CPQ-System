import { Card } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { Filter, X } from 'lucide-react'

interface CategoryFilterProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  availableCategories: string[]
}

export function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
  availableCategories
}: CategoryFilterProps) {
  const handleToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoriesChange([...selectedCategories, category])
    }
  }

  const handleSelectAll = () => {
    onCategoriesChange(availableCategories)
  }

  const handleClearAll = () => {
    onCategoriesChange([])
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">סינון לפי קטגוריה</span>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              בחר הכל
            </Button>
            {selectedCategories.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <X className="h-3 w-3 ml-1" />
                נקה
              </Button>
            )}
          </div>
        </div>

        {selectedCategories.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {selectedCategories.length} מתוך {availableCategories.length} נבחרו
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {availableCategories.map((category) => (
            <div key={category} className="flex items-center gap-2">
              <Checkbox
                id={`category-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleToggle(category)}
              />
              <label
                htmlFor={`category-${category}`}
                className="text-sm cursor-pointer"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
