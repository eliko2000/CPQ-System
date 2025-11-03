import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { FolderOpen, Plus } from 'lucide-react'

export function ProjectList() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">פרויקטים</h1>
          <p className="text-muted-foreground">
            נהל את פרויקטי הצעות המחיר שלך
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          פרויקט חדש
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-reverse space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>פרויקטים פעילים</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">אין פרויקטים שנוצרו עדיין</p>
        </CardContent>
      </Card>
    </div>
  )
}