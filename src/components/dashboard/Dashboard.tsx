import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { BarChart3, FileText, Package, Plus } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
        <p className="text-muted-foreground">
          ברוכים הבאים למערכת CPQ שלכם. הנה מה קורה עם הפרויקטים שלכם.
        </p>
      </div>

      {/* פעולות מהירות */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">פרויקט חדש</h3>
                <p className="text-sm text-muted-foreground">צור פרויקט הצעת מחיר חדש</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">העלאת הצעה</h3>
                <p className="text-sm text-muted-foreground">הוסף הצעות ספקים דרך OCR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">ספריית רכיבים</h3>
                <p className="text-sm text-muted-foreground">נהל רכיבים ואסמבלים</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* סקירת סטטיסטיקות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">פרויקטים פעילים</p>
                <p className="text-3xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">+2 מהחודש שעבר</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">סך הצעות</p>
                <p className="text-3xl font-bold">48</p>
                <p className="text-xs text-muted-foreground">+8 מהחודש שעבר</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">רכיבים</p>
                <p className="text-3xl font-bold">256</p>
                <p className="text-xs text-muted-foreground">+15 מהחודש שעבר</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">רווח ממוצע</p>
                <p className="text-3xl font-bold">32%</p>
                <p className="text-xs text-muted-foreground">+2% מהחודש שעבר</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* פעילות אחרונה */}
      <Card>
        <CardHeader>
          <CardTitle>פעילות אחרונה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">פרויקט תא ריתוך עודכן</p>
                <p className="text-sm text-muted-foreground">נוסף רובוט KUKA KR10 ל-BOM</p>
              </div>
              <span className="text-sm text-muted-foreground">לפני 2 שעות</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="font-medium">הצעה חדשה מ-ABC Robotics</p>
                <p className="text-sm text-muted-foreground">3 רכיבים פוענחו דרך OCR</p>
              </div>
              <span className="text-sm text-muted-foreground">לפני 5 שעות</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">אסמבלי נוצר</p>
                <p className="text-sm text-muted-foreground">"אסמבלי גריפר סטנדרטי" עם 8 רכיבים</p>
              </div>
              <span className="text-sm text-muted-foreground">לפני יום</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}