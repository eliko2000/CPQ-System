import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { BarChart3 } from 'lucide-react'

export function Analytics() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">אנליטיקה</h1>
        <p className="text-muted-foreground">
          תובנות ואנליטיקה לנתוני ה-CPQ שלך
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-reverse space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>לוח בקרה אנליטי</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">תכונות אנליטיקה בקרוב...</p>
        </CardContent>
      </Card>
    </div>
  )
}