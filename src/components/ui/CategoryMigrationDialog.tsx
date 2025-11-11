import { useState } from 'react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { AlertTriangle } from 'lucide-react'

interface CategoryMigrationDialogProps {
  isOpen: boolean
  categoryToDelete: string
  componentCount: number
  availableCategories: string[]
  onConfirm: (targetCategory: string) => void
  onCancel: () => void
}

export function CategoryMigrationDialog({
  isOpen,
  categoryToDelete,
  componentCount,
  availableCategories,
  onConfirm,
  onCancel
}: CategoryMigrationDialogProps) {
  const [targetCategory, setTargetCategory] = useState<string>(
    availableCategories.length > 0 ? availableCategories[0] : ''
  )

  if (!isOpen) return null

  const handleConfirm = () => {
    if (targetCategory) {
      onConfirm(targetCategory)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <Card className="w-full max-w-md border-2 text-yellow-600 bg-yellow-50 border-yellow-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">מחיקת קטגוריה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              {componentCount > 0 ? (
                <>
                  הקטגוריה <strong>"{categoryToDelete}"</strong> מכילה{' '}
                  <strong>{componentCount}</strong>{' '}
                  {componentCount === 1 ? 'רכיב' : 'רכיבים'}.
                </>
              ) : (
                <>
                  האם אתה בטוח שברצונך למחוק את הקטגוריה{' '}
                  <strong>"{categoryToDelete}"</strong>?
                </>
              )}
            </p>
            {componentCount > 0 && (
              <p className="text-muted-foreground">
                אנא בחר קטגוריה חדשה לרכיבים אלה:
              </p>
            )}
          </div>

          {componentCount > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-right">
                העבר רכיבים לקטגוריה:
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={componentCount > 0 && !targetCategory}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {componentCount > 0 ? 'העבר ומחק' : 'מחק'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
