import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import {
  Settings,
  User,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertCircle,
  Building,
  DollarSign,
  FileText,
  Database,
  Shield,
  Bell,
  Palette,
  List,
  Grid3x3,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_COMPONENT_CATEGORIES, TABLE_COLUMN_DEFINITIONS, getDefaultVisibleColumns } from '@/constants/settings'

interface SettingsData {
  general: {
    systemName: string
    systemDescription: string
    timezone: string
    dateFormat: string
  }
  company: {
    name: string
    taxId: string
    address: string
    phone: string
    fax: string
    website: string
    contactName: string
    contactTitle: string
    contactEmail: string
    contactMobile: string
  }
  pricing: {
    usdToIlsRate: number
    eurToIlsRate: number
    autoUpdateRates: boolean
    defaultMarkup: number
    defaultRisk: number
    dayWorkCost: number
    vatRate: number
    deliveryTime: string
  }
  quotations: {
    titleTemplate: string
    logoUploaded: boolean
    footer: string
    signature: string
    paymentTerms: string
    warranty: string
  }
  database: {
    autoBackup: boolean
  }
  security: {
    requireLogin: boolean
    sessionTimeout: boolean
    timeoutMinutes: number
  }
  notifications: {
    emailNotifications: boolean
    browserNotifications: boolean
    quotationNotifications: boolean
    systemNotifications: boolean
    primaryEmail: string
    additionalEmails: string
  }
  appearance: {
    theme: string
    language: string
    compactMode: boolean
    showTooltips: boolean
    autoSave: boolean
    confirmActions: boolean
    itemsPerPage: string
  }
  componentCategories: {
    categories: string[]
  }
  tableColumns: {
    component_library: string[]
    bom_grid: string[]
    quotation_data_grid: string[]
  }
}

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  component: React.ComponentType<any>
}

// Helper functions
function getDefaultSettings(): SettingsData {
  return {
    general: {
      systemName: 'מערכת CPQ חכמה',
      systemDescription: 'מערכת לניהול הצעות מחיר לפרויקטי רובוטיקה',
      timezone: 'Asia/Jerusalem',
      dateFormat: 'DD/MM/YYYY'
    },
    company: {
      name: '',
      taxId: '',
      address: '',
      phone: '',
      fax: '',
      website: '',
      contactName: '',
      contactTitle: '',
      contactEmail: '',
      contactMobile: ''
    },
    pricing: {
      usdToIlsRate: 3.70,
      eurToIlsRate: 4.00,
      autoUpdateRates: false,
      defaultMarkup: 25,
      defaultRisk: 5,
      dayWorkCost: 1200,
      vatRate: 17,
      deliveryTime: '4-6 שבועות'
    },
    quotations: {
      titleTemplate: 'הצעת מחיר - {{project_name}}',
      logoUploaded: false,
      footer: 'תודה על אמונכם',
      signature: '',
      paymentTerms: 'net30',
      warranty: 'שנת אחריות על חלקים ועבודה'
    },
    database: {
      autoBackup: false
    },
    security: {
      requireLogin: true,
      sessionTimeout: true,
      timeoutMinutes: 30
    },
    notifications: {
      emailNotifications: true,
      browserNotifications: true,
      quotationNotifications: true,
      systemNotifications: false,
      primaryEmail: '',
      additionalEmails: ''
    },
    appearance: {
      theme: 'light',
      language: 'he',
      compactMode: false,
      showTooltips: true,
      autoSave: true,
      confirmActions: true,
      itemsPerPage: '25'
    },
    componentCategories: {
      categories: [...DEFAULT_COMPONENT_CATEGORIES]
    },
    tableColumns: {
      component_library: getDefaultVisibleColumns('component_library'),
      bom_grid: getDefaultVisibleColumns('bom_grid'),
      quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid')
    }
  }
}

function validateSettings(settings: SettingsData): string[] {
  const errors: string[] = []
  
  // Validate pricing settings
  if (settings.pricing.usdToIlsRate <= 0) {
    errors.push('שער דולר לשקל חייב להיות חיובי')
  }
  if (settings.pricing.eurToIlsRate <= 0) {
    errors.push('שער אירו לשקל חייב להיות חיובי')
  }
  if (settings.pricing.defaultMarkup < 0 || settings.pricing.defaultMarkup > 100) {
    errors.push('אחוז רווח חייב להיות בין 0 ל-100')
  }
  if (settings.pricing.defaultRisk < 0 || settings.pricing.defaultRisk > 50) {
    errors.push('אחוז סיכון חייב להיות בין 0 ל-50')
  }
  if (settings.pricing.dayWorkCost < 0) {
    errors.push('עלות יום עבודה חייבת להיות חיובית')
  }
  if (settings.pricing.vatRate < 0 || settings.pricing.vatRate > 100) {
    errors.push('שיעור מע"מ חייב להיות בין 0 ל-100')
  }
  
  // Validate email
  if (settings.notifications.primaryEmail && !isValidEmail(settings.notifications.primaryEmail)) {
    errors.push('כתובת דוא"ל ראשית אינה תקינה')
  }
  
  // Validate security settings
  if (settings.security.timeoutMinutes < 1 || settings.security.timeoutMinutes > 480) {
    errors.push('זמן ניתוק חייב להיות בין 1 ל-480 דקות')
  }
  
  return errors
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function applySettings(settings: SettingsData): void {
  // Apply theme
  if (settings.appearance.theme) {
    document.documentElement.setAttribute('data-theme', settings.appearance.theme)
  }
  
  // Apply language (in a real app, this would trigger re-render with translations)
  if (settings.appearance.language) {
    document.documentElement.lang = settings.appearance.language
  }
  
  // Apply compact mode
  if (settings.appearance.compactMode) {
    document.body.classList.add('compact-mode')
  } else {
    document.body.classList.remove('compact-mode')
  }
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load settings from localStorage on mount
  const [settings, setSettings] = useState<SettingsData>(() => {
    const savedSettings = localStorage.getItem('cpq-settings')
    return savedSettings ? JSON.parse(savedSettings) : getDefaultSettings()
  })

  const settingsSections: SettingsSection[] = [
    {
      id: 'general',
      title: 'הגדרות כלליות',
      description: 'הגדרות בסיסיות של המערכת',
      icon: Settings,
      component: GeneralSettings
    },
    {
      id: 'company',
      title: 'פרטי חברה',
      description: 'מידע על החברה ופרטי התקשרות',
      icon: Building,
      component: CompanySettings
    },
    {
      id: 'pricing',
      title: 'הגדרות תמחור',
      description: 'פרמטרים פיננסיים ושערי חליפין',
      icon: DollarSign,
      component: PricingSettings
    },
    {
      id: 'quotations',
      title: 'הגדרות הצעות מחיר',
      description: 'תבניות והגדרות להצעות מחיר',
      icon: FileText,
      component: QuotationSettings
    },
    {
      id: 'database',
      title: 'ניהול מידע',
      description: 'גיבוי, ייבוא וייצוא נתונים',
      icon: Database,
      component: DatabaseSettings
    },
    {
      id: 'security',
      title: 'אבטחה והרשאות',
      description: 'ניהול משתמשים והרשאות גישה',
      icon: Shield,
      component: SecuritySettings
    },
    {
      id: 'notifications',
      title: 'התראות',
      description: 'הגדרות התראות ודיוורים',
      icon: Bell,
      component: NotificationSettings
    },
    {
      id: 'appearance',
      title: 'מראה והתנהגות',
      description: 'עיצוב, שפה והגדרות ממשק',
      icon: Palette,
      component: AppearanceSettings
    },
    {
      id: 'componentCategories',
      title: 'קטגוריות רכיבים',
      description: 'ניהול קטגוריות רכיבים במערכת',
      icon: List,
      component: ComponentCategoriesSettings
    },
    {
      id: 'tableColumns',
      title: 'עמודות טבלאות',
      description: 'הגדרות עמודות ברירת מחדל לטבלאות',
      icon: Grid3x3,
      component: TableColumnsSettings
    }
  ]

  // Save settings to localStorage
  const saveSettings = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      // Validate settings
      const validationErrors = validateSettings(settings)
      if (validationErrors.length > 0) {
        setSaveMessage({
          type: 'error',
          message: `שגיאות באימות: ${validationErrors.join(', ')}`
        })
        return
      }

      // Save to localStorage
      localStorage.setItem('cpq-settings', JSON.stringify(settings))
      
      // Apply settings to application
      applySettings(settings)
      
      setHasChanges(false)
      setSaveMessage({
        type: 'success',
        message: 'ההגדרות נשמרו בהצלחה'
      })
    } catch (error) {
      setSaveMessage({
        type: 'error',
        message: 'שגיאה בשמירת ההגדרות'
      })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // Reset settings to defaults
  const resetSettings = () => {
    const defaultSettings = getDefaultSettings()
    setSettings(defaultSettings)
    setHasChanges(true)
  }

  const ActiveComponent = settingsSections.find(section => section.id === activeSection)?.component || GeneralSettings

  return (
    <div className="flex h-full bg-background" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="w-80 border-l border-border bg-card">
        <div className="p-6">
          <div className="flex items-center space-x-reverse space-x-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">הגדרות מערכת</h1>
              <p className="text-sm text-muted-foreground">נהל את הגדרות המערכת</p>
            </div>
          </div>

          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg text-right transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 text-right">
                    <div className="font-medium">{section.title}</div>
                    <div className={cn(
                      "text-xs",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {section.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-border space-y-3">
          {/* Save Message */}
          {saveMessage && (
            <div className={cn(
              "p-3 rounded-lg mb-3 flex items-center space-x-reverse space-x-2",
              saveMessage.type === 'success' 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            )}>
              {saveMessage.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{saveMessage.message}</span>
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 ml-2" />
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={resetSettings}
          >
            <RotateCcw className="h-4 w-4 ml-2" />
            אפס לברירת מחדל
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {settingsSections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-muted-foreground">
                {settingsSections.find(s => s.id === activeSection)?.description}
              </p>
            </div>

            <ActiveComponent onSettingsChange={() => setHasChanges(true)} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Individual Settings Sections ============

function GeneralSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>הגדרות בסיסיות</CardTitle>
          <CardDescription>הגדרות כלליות של המערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם המערכת</label>
              <Input 
                defaultValue="מערכת CPQ חכמה" 
                onChange={onSettingsChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">גרסת מערכת</label>
              <Input defaultValue="1.0.0" disabled />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">תיאור מערכת</label>
            <Input 
              defaultValue="מערכת לניהול הצעות מחיר לפרויקטי רובוטיקה" 
              onChange={onSettingsChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות אזור זמן</CardTitle>
          <CardDescription>הגדרות זמן ותאריכים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אזור זמן</label>
              <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
                <option value="Asia/Jerusalem">ישראל (GMT+2)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">ניו יורק (GMT-5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">פורמט תאריך</label>
              <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CompanySettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>פרטי חברה</CardTitle>
          <CardDescription>מידע בסיסי על החברה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם חברה</label>
              <Input placeholder="שם החברה" onChange={onSettingsChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ח.פ./ע.מ.</label>
              <Input placeholder="ח.פ. או ע.מ." onChange={onSettingsChange} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">כתובת</label>
            <Input placeholder="רחוב, מספר, עיר" onChange={onSettingsChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">טלפון</label>
              <Input placeholder="טלפון ראשי" onChange={onSettingsChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">פקס</label>
              <Input placeholder="מספר פקס" onChange={onSettingsChange} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">אתר אינטרנט</label>
            <Input placeholder="www.example.com" onChange={onSettingsChange} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>אנשי קשר</CardTitle>
          <CardDescription>אנשי קשר עיקריים בחברה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שם איש קשר</label>
              <Input placeholder="שם מלא" onChange={onSettingsChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">תפקיד</label>
              <Input placeholder="תפקיד בחברה" onChange={onSettingsChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אימייל</label>
              <Input type="email" placeholder="email@company.com" onChange={onSettingsChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">טלפון נייד</label>
              <Input placeholder="טלפון נייד" onChange={onSettingsChange} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PricingSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>שערי חליפין</CardTitle>
          <CardDescription>עדכון שערי חליפין אוטומטי וידני</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">דולר לשקל (USD/ILS)</label>
              <Input 
                type="number" 
                step="0.01" 
                defaultValue="3.70" 
                onChange={onSettingsChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">אירו לשקל (EUR/ILS)</label>
              <Input 
                type="number" 
                step="0.01" 
                defaultValue="4.00" 
                onChange={onSettingsChange}
              />
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoUpdate" onChange={onSettingsChange} />
            <label htmlFor="autoUpdate" className="text-sm">עדכון אוטומטי מדי יום</label>
          </div>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 ml-2" />
            עדכן שערים עכשיו
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ברירות מחדל תמחור</CardTitle>
          <CardDescription>הגדרות תמחור ברירת מחדל להצעות מחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אחוז רווח ברירת מחדל (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                defaultValue="25" 
                onChange={onSettingsChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">אחוז סיכון ברירת מחדל (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                defaultValue="5" 
                onChange={onSettingsChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">עלות יום עבודה (₪)</label>
            <Input 
              type="number" 
              step="10" 
              defaultValue="1200" 
              onChange={onSettingsChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שיעור מע"מ (%)</label>
              <Input 
                type="number" 
                step="0.1" 
                defaultValue="17" 
                onChange={onSettingsChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">זמן אספקה ברירת מחדל</label>
              <Input 
                defaultValue="4-6 שבועות" 
                onChange={onSettingsChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuotationSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>תבנית הצעת מחיר</CardTitle>
          <CardDescription>הגדרות תבנית ומראה הצעת המחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">כותרת הצעת מחיר</label>
            <Input 
              defaultValue="הצעת מחיר - {{project_name}}" 
              onChange={onSettingsChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">לוגו חברה</label>
            <div className="flex items-center space-x-reverse space-x-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 ml-2" />
                העלה לוגו
              </Button>
              <Badge variant="secondary">אין לוגו</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">כותרת תחתונה</label>
              <Input 
                placeholder="תודה על אמונכם" 
                onChange={onSettingsChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">חתימה</label>
              <Input 
                placeholder="שם החותם" 
                onChange={onSettingsChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תנאי תשלום</CardTitle>
          <CardDescription>תנאי תשלום ברירת מחדל</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">תנאי תשלום</label>
            <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
              <option value="net30">30 יום מקבלת חשבונית</option>
              <option value="net45">45 יום מקבלת חשבונית</option>
              <option value="net60">60 יום מקבלת חשבונית</option>
              <option value="immediate">מיידי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">תנאי אחריות</label>
            <Input 
              defaultValue="שנת אחריות על חלקים ועבודה" 
              onChange={onSettingsChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DatabaseSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>גיבוי נתונים</CardTitle>
          <CardDescription>ניהול גיבויים ושחזור נתונים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button className="w-full">
              <Download className="h-4 w-4 ml-2" />
              גיבוי מיידי
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              שחזר מגיבוי
            </Button>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>גיבוי אחרון:</span>
                <span className="font-medium">לא בוצע גיבוי</span>
              </div>
              <div className="flex justify-between">
                <span>גודל מסד נתונים:</span>
                <span className="font-medium">~2.5 MB</span>
              </div>
              <div className="flex justify-between">
                <span>גיבוי אוטומטי:</span>
                <Badge variant="secondary">כבוי</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoBackup" onChange={onSettingsChange} />
            <label htmlFor="autoBackup" className="text-sm">גיבוי אוטומטי יומי</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ייבוא וייצוא</CardTitle>
          <CardDescription>ייבוא וייצוא נתונים מקובצים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 ml-2" />
              ייצא רכיבים
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              ייבא רכיבים
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 ml-2" />
              ייצא הצעות
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="h-4 w-4 ml-2" />
              ייבא הצעות
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            פורמטים נתמכים: CSV, Excel, JSON
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SecuritySettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>משתמשים והרשאות</CardTitle>
          <CardDescription>ניהול משתמשים והרשאות גישה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">מנהל מערכת</div>
              <div className="text-sm text-muted-foreground">גישה מלאה לכל הפונקציות</div>
            </div>
            <Badge>1 משתמש</Badge>
          </div>
          <Button variant="outline" className="w-full">
            <User className="h-4 w-4 ml-2" />
            הוסף משתמש
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות אבטחה</CardTitle>
          <CardDescription>הגדרות אבטחה כלליות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="requireLogin" defaultChecked onChange={onSettingsChange} />
            <label htmlFor="requireLogin" className="text-sm">דרוש התחברות</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="sessionTimeout" defaultChecked onChange={onSettingsChange} />
            <label htmlFor="sessionTimeout" className="text-sm">ניתוק אוטומטי אחרי חוסר פעילות</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">זמן ניתוק (דקות)</label>
            <Input type="number" defaultValue="30" onChange={onSettingsChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>התראות מערכת</CardTitle>
          <CardDescription>הגדרות התראות ודיוורים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות דוא"ל</div>
                <div className="text-sm text-muted-foreground">קבל התראות בדוא"ל</div>
              </div>
              <input type="checkbox" defaultChecked onChange={onSettingsChange} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות דפדפן</div>
                <div className="text-sm text-muted-foreground">התראות בדפדפן</div>
              </div>
              <input type="checkbox" defaultChecked onChange={onSettingsChange} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות הצעות</div>
                <div className="text-sm text-muted-foreground">עדכונים על הצעות מחיר</div>
              </div>
              <input type="checkbox" defaultChecked onChange={onSettingsChange} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות מערכת</div>
                <div className="text-sm text-muted-foreground">עדכוני מערכת ותחזוקה</div>
              </div>
              <input type="checkbox" onChange={onSettingsChange} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כתובות דוא"ל</CardTitle>
          <CardDescription>ניהול כתובות לקבלת התראות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">כתובת דוא"ל ראשית</label>
            <Input type="email" placeholder="admin@company.com" onChange={onSettingsChange} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">כתובות נוספות</label>
            <Input placeholder="email1@company.com, email2@company.com" onChange={onSettingsChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppearanceSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>עיצוב ממשק</CardTitle>
          <CardDescription>הגדרות מראה והתנהגות הממשק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ערכת נושא</label>
            <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
              <option value="light">בהיר</option>
              <option value="dark">כהה</option>
              <option value="system">ברירת מחדל מערכת</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">שפה</label>
            <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="compactMode" onChange={onSettingsChange} />
            <label htmlFor="compactMode" className="text-sm">מצב קומפקטי</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="showTooltips" defaultChecked onChange={onSettingsChange} />
            <label htmlFor="showTooltips" className="text-sm">הצג טיפים</label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>התנהגות ממשק</CardTitle>
          <CardDescription>הגדרות התנהגות ואינטראקציה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="autoSave" defaultChecked onChange={onSettingsChange} />
            <label htmlFor="autoSave" className="text-sm">שמירה אוטומטית</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="confirmActions" defaultChecked onChange={onSettingsChange} />
            <label htmlFor="confirmActions" className="text-sm">אישור פעולות מסוכנות</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">פריטים בעמוד</label>
            <select className="w-full p-2 border rounded-md" onChange={onSettingsChange}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ComponentCategoriesSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  const [categories, setCategories] = useState<string[]>(() => {
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return parsed.componentCategories?.categories || [...DEFAULT_COMPONENT_CATEGORIES]
    }
    return [...DEFAULT_COMPONENT_CATEGORIES]
  })
  const [newCategory, setNewCategory] = useState('')

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)
      setNewCategory('')

      // Update settings in localStorage
      const savedSettings = localStorage.getItem('cpq-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        parsed.componentCategories = { categories: updatedCategories }
        localStorage.setItem('cpq-settings', JSON.stringify(parsed))
      }
      onSettingsChange()
    }
  }

  const handleDeleteCategory = (category: string) => {
    const updatedCategories = categories.filter(c => c !== category)
    setCategories(updatedCategories)

    // Update settings in localStorage
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      parsed.componentCategories = { categories: updatedCategories }
      localStorage.setItem('cpq-settings', JSON.stringify(parsed))
    }
    onSettingsChange()
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const updatedCategories = [...categories]
      ;[updatedCategories[index - 1], updatedCategories[index]] =
        [updatedCategories[index], updatedCategories[index - 1]]
      setCategories(updatedCategories)

      // Update settings in localStorage
      const savedSettings = localStorage.getItem('cpq-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        parsed.componentCategories = { categories: updatedCategories }
        localStorage.setItem('cpq-settings', JSON.stringify(parsed))
      }
      onSettingsChange()
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < categories.length - 1) {
      const updatedCategories = [...categories]
      ;[updatedCategories[index], updatedCategories[index + 1]] =
        [updatedCategories[index + 1], updatedCategories[index]]
      setCategories(updatedCategories)

      // Update settings in localStorage
      const savedSettings = localStorage.getItem('cpq-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        parsed.componentCategories = { categories: updatedCategories }
        localStorage.setItem('cpq-settings', JSON.stringify(parsed))
      }
      onSettingsChange()
    }
  }

  const handleResetToDefaults = () => {
    setCategories([...DEFAULT_COMPONENT_CATEGORIES])

    // Update settings in localStorage
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      parsed.componentCategories = { categories: [...DEFAULT_COMPONENT_CATEGORIES] }
      localStorage.setItem('cpq-settings', JSON.stringify(parsed))
    }
    onSettingsChange()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>קטגוריות רכיבים</CardTitle>
          <CardDescription>ניהול רשימת הקטגוריות לרכיבים במערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="הוסף קטגוריה חדשה"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory()
                }
              }}
            />
            <Button onClick={handleAddCategory}>הוסף</Button>
          </div>

          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span className="font-medium">{category}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === categories.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleResetToDefaults} className="w-full">
              <RotateCcw className="h-4 w-4 ml-2" />
              אפס לברירת מחדל
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TableColumnsSettings({ onSettingsChange }: { onSettingsChange: () => void }) {
  const [activeTable, setActiveTable] = useState<'component_library' | 'bom_grid' | 'quotation_data_grid'>('component_library')
  const [tableSettings, setTableSettings] = useState(() => {
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return parsed.tableColumns || {
        component_library: getDefaultVisibleColumns('component_library'),
        bom_grid: getDefaultVisibleColumns('bom_grid'),
        quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid')
      }
    }
    return {
      component_library: getDefaultVisibleColumns('component_library'),
      bom_grid: getDefaultVisibleColumns('bom_grid'),
      quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid')
    }
  })

  const tableNames = {
    component_library: 'ספריית רכיבים',
    bom_grid: 'BOM Grid',
    quotation_data_grid: 'טבלת הצעות מחיר'
  }

  const handleToggleColumn = (tableType: typeof activeTable, columnId: string) => {
    const currentColumns = tableSettings[tableType] || []
    const updatedColumns = currentColumns.includes(columnId)
      ? currentColumns.filter(id => id !== columnId)
      : [...currentColumns, columnId]

    const updatedSettings = {
      ...tableSettings,
      [tableType]: updatedColumns
    }

    setTableSettings(updatedSettings)

    // Update settings in localStorage
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      parsed.tableColumns = updatedSettings
      localStorage.setItem('cpq-settings', JSON.stringify(parsed))
    }
    onSettingsChange()
  }

  const handleResetTable = (tableType: typeof activeTable) => {
    const defaultColumns = getDefaultVisibleColumns(tableType)
    const updatedSettings = {
      ...tableSettings,
      [tableType]: defaultColumns
    }

    setTableSettings(updatedSettings)

    // Update settings in localStorage
    const savedSettings = localStorage.getItem('cpq-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      parsed.tableColumns = updatedSettings
      localStorage.setItem('cpq-settings', JSON.stringify(parsed))
    }
    onSettingsChange()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>עמודות ברירת מחדל לטבלאות</CardTitle>
          <CardDescription>בחר אילו עמודות יוצגו כברירת מחדל בכל טבלה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 border-b pb-4">
            {Object.entries(tableNames).map(([key, name]) => (
              <Button
                key={key}
                variant={activeTable === key ? 'default' : 'outline'}
                onClick={() => setActiveTable(key as typeof activeTable)}
              >
                {name}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">{tableNames[activeTable]}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetTable(activeTable)}
              >
                <RotateCcw className="h-4 w-4 ml-2" />
                אפס לברירת מחדל
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TABLE_COLUMN_DEFINITIONS[activeTable].map((column) => {
                const isVisible = tableSettings[activeTable]?.includes(column.id) ?? column.defaultVisible
                return (
                  <div
                    key={column.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isVisible ? "bg-primary/5 border-primary" : "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`${activeTable}-${column.id}`}
                        checked={isVisible}
                        onChange={() => handleToggleColumn(activeTable, column.id)}
                        className="cursor-pointer"
                      />
                      <label
                        htmlFor={`${activeTable}-${column.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                    {isVisible && (
                      <Badge variant="secondary" className="text-xs">
                        מוצג
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
