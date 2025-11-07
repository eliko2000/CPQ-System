import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Settings,
  User,
  Building,
  DollarSign,
  FileText,
  Database,
  Shield,
  Bell,
  Globe,
  Palette,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  AlertCircle,
  Hash,
  Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    defaultDiscount: number
    minMargin: number
    showCostToCustomer: boolean
  }
  quotations: {
    titleTemplate: string
    logoUploaded: boolean
    footer: string
    signature: string
    paymentTerms: string
    warranty: string
    numberingFormat: string
    numberingPrefix: string
    nextNumber: number
    termsAndConditions: string
    validityPeriod: number
    requireApproval: boolean
    approvalThreshold: number
  }
  database: {
    autoBackup: boolean
    backupFrequency: string
    lastBackup: string
  }
  security: {
    requireLogin: boolean
    sessionTimeout: boolean
    timeoutMinutes: number
    passwordPolicy: string
    twoFactorAuth: boolean
  }
  notifications: {
    emailNotifications: boolean
    browserNotifications: boolean
    quotationNotifications: boolean
    systemNotifications: boolean
    primaryEmail: string
    additionalEmails: string
    notifyOnApproval: boolean
    notifyOnExpiry: boolean
  }
  appearance: {
    theme: string
    language: string
    compactMode: boolean
    showTooltips: boolean
    autoSave: boolean
    confirmActions: boolean
    itemsPerPage: string
    fontSize: string
  }
  workflow: {
    enableApprovalWorkflow: boolean
    approvalLevels: number
    autoApproveBelow: number
    requireManagerApproval: boolean
    notifyOnStatusChange: boolean
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
      deliveryTime: '4-6 שבועות',
      defaultDiscount: 0,
      minMargin: 10,
      showCostToCustomer: false
    },
    quotations: {
      titleTemplate: 'הצעת מחיר - {{project_name}}',
      logoUploaded: false,
      footer: 'תודה על אמונכם',
      signature: '',
      paymentTerms: 'net30',
      warranty: 'שנת אחריות על חלקים ועבודה',
      numberingFormat: 'QT-{YEAR}-{NUMBER}',
      numberingPrefix: 'QT',
      nextNumber: 1001,
      termsAndConditions: 'תנאים כלליים:\n1. ההצעה תקפה ל-30 יום\n2. המחירים אינם כוללים מע"מ\n3. זמני אספקה בכפוף לזמינות',
      validityPeriod: 30,
      requireApproval: false,
      approvalThreshold: 50000
    },
    database: {
      autoBackup: false,
      backupFrequency: 'daily',
      lastBackup: ''
    },
    security: {
      requireLogin: true,
      sessionTimeout: true,
      timeoutMinutes: 30,
      passwordPolicy: 'medium',
      twoFactorAuth: false
    },
    notifications: {
      emailNotifications: true,
      browserNotifications: true,
      quotationNotifications: true,
      systemNotifications: false,
      primaryEmail: '',
      additionalEmails: '',
      notifyOnApproval: true,
      notifyOnExpiry: true
    },
    appearance: {
      theme: 'light',
      language: 'he',
      compactMode: false,
      showTooltips: true,
      autoSave: true,
      confirmActions: true,
      itemsPerPage: '25',
      fontSize: 'medium'
    },
    workflow: {
      enableApprovalWorkflow: false,
      approvalLevels: 1,
      autoApproveBelow: 10000,
      requireManagerApproval: true,
      notifyOnStatusChange: true
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
  if (settings.pricing.minMargin < 0 || settings.pricing.minMargin > 100) {
    errors.push('מרווח מינימלי חייב להיות בין 0 ל-100')
  }
  if (settings.pricing.defaultDiscount < 0 || settings.pricing.defaultDiscount > 100) {
    errors.push('הנחה ברירת מחדל חייבת להיות בין 0 ל-100')
  }

  // Validate quotation settings
  if (settings.quotations.validityPeriod < 1 || settings.quotations.validityPeriod > 365) {
    errors.push('תקופת תוקף חייבת להיות בין 1 ל-365 יום')
  }
  if (settings.quotations.nextNumber < 1) {
    errors.push('מספר הבא חייב להיות חיובי')
  }

  // Validate email
  if (settings.notifications.primaryEmail && !isValidEmail(settings.notifications.primaryEmail)) {
    errors.push('כתובת דוא"ל ראשית אינה תקינה')
  }

  // Validate security settings
  if (settings.security.timeoutMinutes < 1 || settings.security.timeoutMinutes > 480) {
    errors.push('זמן ניתוק חייב להיות בין 1 ל-480 דקות')
  }

  // Validate workflow settings
  if (settings.workflow.approvalLevels < 1 || settings.workflow.approvalLevels > 5) {
    errors.push('מספר רמות אישור חייב להיות בין 1 ל-5')
  }
  if (settings.workflow.autoApproveBelow < 0) {
    errors.push('סכום אישור אוטומטי חייב להיות חיובי')
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

  // Load settings from localStorage on mount and merge with defaults
  const [settings, setSettings] = useState<SettingsData>(() => {
    const savedSettings = localStorage.getItem('cpq-settings')
    const defaultSettings = getDefaultSettings()

    if (!savedSettings) {
      return defaultSettings
    }

    try {
      const parsed = JSON.parse(savedSettings)
      // Deep merge: keep saved values but add any missing default values
      return {
        general: { ...defaultSettings.general, ...parsed.general },
        company: { ...defaultSettings.company, ...parsed.company },
        pricing: { ...defaultSettings.pricing, ...parsed.pricing },
        quotations: { ...defaultSettings.quotations, ...parsed.quotations },
        database: { ...defaultSettings.database, ...parsed.database },
        security: { ...defaultSettings.security, ...parsed.security },
        notifications: { ...defaultSettings.notifications, ...parsed.notifications },
        appearance: { ...defaultSettings.appearance, ...parsed.appearance },
        workflow: { ...defaultSettings.workflow, ...(parsed.workflow || {}) }
      }
    } catch (error) {
      console.error('Failed to parse saved settings:', error)
      return defaultSettings
    }
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
      description: 'תבניות, מספור והגדרות להצעות מחיר',
      icon: FileText,
      component: QuotationSettings
    },
    {
      id: 'workflow',
      title: 'תהליכי עבודה',
      description: 'אישורים ותהליכי עבודה אוטומטיים',
      icon: Workflow,
      component: WorkflowSettings
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

  // Update settings helper
  const updateSettings = <K extends keyof SettingsData>(
    section: K,
    field: keyof SettingsData[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
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

            <ActiveComponent
              settings={settings}
              updateSettings={updateSettings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Individual Settings Sections ============

interface SettingsComponentProps {
  settings: SettingsData
  updateSettings: <K extends keyof SettingsData>(
    section: K,
    field: keyof SettingsData[K],
    value: any
  ) => void
}

function GeneralSettings({ settings, updateSettings }: SettingsComponentProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>הגדרות בסיסיות</CardTitle>
          <CardDescription>הגדרות כלליות של המערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="systemName">שם המערכת</Label>
              <Input
                id="systemName"
                value={settings.general.systemName}
                onChange={(e) => updateSettings('general', 'systemName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">גרסת מערכת</Label>
              <Input id="version" value="1.0.0" disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemDescription">תיאור מערכת</Label>
            <Textarea
              id="systemDescription"
              value={settings.general.systemDescription}
              onChange={(e) => updateSettings('general', 'systemDescription', e.target.value)}
              rows={3}
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
            <div className="space-y-2">
              <Label htmlFor="timezone">אזור זמן</Label>
              <Select
                value={settings.general.timezone}
                onValueChange={(value) => updateSettings('general', 'timezone', value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jerusalem">ישראל (GMT+2)</SelectItem>
                  <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                  <SelectItem value="America/New_York">ניו יורק (GMT-5)</SelectItem>
                  <SelectItem value="Europe/London">לונדון (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">פורמט תאריך</Label>
              <Select
                value={settings.general.dateFormat}
                onValueChange={(value) => updateSettings('general', 'dateFormat', value)}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CompanySettings({ settings, updateSettings }: SettingsComponentProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>פרטי חברה</CardTitle>
          <CardDescription>מידע בסיסי על החברה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">שם חברה</Label>
              <Input
                id="companyName"
                placeholder="שם החברה"
                value={settings.company.name}
                onChange={(e) => updateSettings('company', 'name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">ח.פ./ע.מ.</Label>
              <Input
                id="taxId"
                placeholder="ח.פ. או ע.מ."
                value={settings.company.taxId}
                onChange={(e) => updateSettings('company', 'taxId', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              placeholder="רחוב, מספר, עיר"
              value={settings.company.address}
              onChange={(e) => updateSettings('company', 'address', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                placeholder="טלפון ראשי"
                value={settings.company.phone}
                onChange={(e) => updateSettings('company', 'phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">פקס</Label>
              <Input
                id="fax"
                placeholder="מספר פקס"
                value={settings.company.fax}
                onChange={(e) => updateSettings('company', 'fax', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">אתר אינטרנט</Label>
            <Input
              id="website"
              placeholder="www.example.com"
              value={settings.company.website}
              onChange={(e) => updateSettings('company', 'website', e.target.value)}
            />
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
            <div className="space-y-2">
              <Label htmlFor="contactName">שם איש קשר</Label>
              <Input
                id="contactName"
                placeholder="שם מלא"
                value={settings.company.contactName}
                onChange={(e) => updateSettings('company', 'contactName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactTitle">תפקיד</Label>
              <Input
                id="contactTitle"
                placeholder="תפקיד בחברה"
                value={settings.company.contactTitle}
                onChange={(e) => updateSettings('company', 'contactTitle', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">אימייל</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="email@company.com"
                value={settings.company.contactEmail}
                onChange={(e) => updateSettings('company', 'contactEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactMobile">טלפון נייד</Label>
              <Input
                id="contactMobile"
                placeholder="טלפון נייד"
                value={settings.company.contactMobile}
                onChange={(e) => updateSettings('company', 'contactMobile', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PricingSettings({ settings, updateSettings }: SettingsComponentProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>שערי חליפין</CardTitle>
          <CardDescription>עדכון שערי חליפין אוטומטי וידני</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usdRate">דולר לשקל (USD/ILS)</Label>
              <Input
                id="usdRate"
                type="number"
                step="0.01"
                value={settings.pricing.usdToIlsRate}
                onChange={(e) => updateSettings('pricing', 'usdToIlsRate', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eurRate">אירו לשקל (EUR/ILS)</Label>
              <Input
                id="eurRate"
                type="number"
                step="0.01"
                value={settings.pricing.eurToIlsRate}
                onChange={(e) => updateSettings('pricing', 'eurToIlsRate', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="autoUpdate" className="cursor-pointer">עדכון אוטומטי מדי יום</Label>
            <Switch
              id="autoUpdate"
              checked={settings.pricing.autoUpdateRates}
              onCheckedChange={(checked) => updateSettings('pricing', 'autoUpdateRates', checked)}
            />
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
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultMarkup">אחוז רווח ברירת מחדל (%)</Label>
              <Input
                id="defaultMarkup"
                type="number"
                step="0.1"
                value={settings.pricing.defaultMarkup}
                onChange={(e) => updateSettings('pricing', 'defaultMarkup', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultRisk">אחוז סיכון ברירת מחדל (%)</Label>
              <Input
                id="defaultRisk"
                type="number"
                step="0.1"
                value={settings.pricing.defaultRisk}
                onChange={(e) => updateSettings('pricing', 'defaultRisk', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDiscount">הנחה ברירת מחדל (%)</Label>
              <Input
                id="defaultDiscount"
                type="number"
                step="0.1"
                value={settings.pricing.defaultDiscount || 0}
                onChange={(e) => updateSettings('pricing', 'defaultDiscount', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minMargin">מרווח מינימלי (%)</Label>
              <Input
                id="minMargin"
                type="number"
                step="0.1"
                value={settings.pricing.minMargin || 10}
                onChange={(e) => updateSettings('pricing', 'minMargin', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">המערכת תתריע כשהמרווח נמוך ממינימום זה</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dayWorkCost">עלות יום עבודה (₪)</Label>
              <Input
                id="dayWorkCost"
                type="number"
                step="10"
                value={settings.pricing.dayWorkCost}
                onChange={(e) => updateSettings('pricing', 'dayWorkCost', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatRate">שיעור מע"מ (%)</Label>
              <Input
                id="vatRate"
                type="number"
                step="0.1"
                value={settings.pricing.vatRate}
                onChange={(e) => updateSettings('pricing', 'vatRate', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryTime">זמן אספקה ברירת מחדל</Label>
              <Input
                id="deliveryTime"
                value={settings.pricing.deliveryTime}
                onChange={(e) => updateSettings('pricing', 'deliveryTime', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="showCostToCustomer" className="cursor-pointer">הצג עלות ללקוח</Label>
              <p className="text-xs text-muted-foreground mt-1">הצג פירוט עלויות בהצעת המחיר</p>
            </div>
            <Switch
              id="showCostToCustomer"
              checked={settings.pricing.showCostToCustomer || false}
              onCheckedChange={(checked) => updateSettings('pricing', 'showCostToCustomer', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuotationSettings({ settings, updateSettings }: SettingsComponentProps) {
  // Safely generate format preview with fallback
  const formatPreview = (settings.quotations?.numberingFormat || 'QT-{YEAR}-{NUMBER}')
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{NUMBER}', (settings.quotations?.nextNumber || 1001).toString().padStart(4, '0'))
    .replace('{PREFIX}', settings.quotations?.numberingPrefix || 'QT')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Hash className="h-5 w-5 inline ml-2" />
            מספור הצעות מחיר
          </CardTitle>
          <CardDescription>הגדרת פורמט מספור אוטומטי להצעות מחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberingFormat">פורמט מספור</Label>
              <Input
                id="numberingFormat"
                value={settings.quotations.numberingFormat || 'QT-{YEAR}-{NUMBER}'}
                onChange={(e) => updateSettings('quotations', 'numberingFormat', e.target.value)}
                placeholder="QT-{YEAR}-{NUMBER}"
              />
              <p className="text-xs text-muted-foreground">
                משתנים זמינים: {'{YEAR}'}, {'{NUMBER}'}, {'{PREFIX}'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextNumber">מספר הבא</Label>
              <Input
                id="nextNumber"
                type="number"
                value={settings.quotations.nextNumber || 1001}
                onChange={(e) => updateSettings('quotations', 'nextNumber', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-sm font-medium mb-1">דוגמה:</div>
            <div className="text-lg font-mono font-bold text-primary">{formatPreview}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תבנית הצעת מחיר</CardTitle>
          <CardDescription>הגדרות תבנית ומראה הצעת המחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titleTemplate">כותרת הצעת מחיר</Label>
            <Input
              id="titleTemplate"
              value={settings.quotations.titleTemplate}
              onChange={(e) => updateSettings('quotations', 'titleTemplate', e.target.value)}
              placeholder="הצעת מחיר - {{project_name}}"
            />
            <p className="text-xs text-muted-foreground">
              משתנה זמין: {'{{project_name}}'}
            </p>
          </div>
          <div className="space-y-2">
            <Label>לוגו חברה</Label>
            <div className="flex items-center space-x-reverse space-x-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 ml-2" />
                העלה לוגו
              </Button>
              <Badge variant={settings.quotations.logoUploaded ? "default" : "secondary"}>
                {settings.quotations.logoUploaded ? "לוגו הועלה" : "אין לוגו"}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="footer">כותרת תחתונה</Label>
              <Input
                id="footer"
                value={settings.quotations.footer}
                onChange={(e) => updateSettings('quotations', 'footer', e.target.value)}
                placeholder="תודה על אמונכם"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature">חתימה</Label>
              <Input
                id="signature"
                value={settings.quotations.signature}
                onChange={(e) => updateSettings('quotations', 'signature', e.target.value)}
                placeholder="שם החותם"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="termsAndConditions">תנאים כלליים</Label>
            <Textarea
              id="termsAndConditions"
              value={settings.quotations.termsAndConditions || ''}
              onChange={(e) => updateSettings('quotations', 'termsAndConditions', e.target.value)}
              rows={5}
              placeholder="תנאים כלליים להצעת מחיר..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תנאים מסחריים</CardTitle>
          <CardDescription>תנאי תשלום, תוקף ואחריות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">תנאי תשלום</Label>
              <Select
                value={settings.quotations.paymentTerms}
                onValueChange={(value) => updateSettings('quotations', 'paymentTerms', value)}
              >
                <SelectTrigger id="paymentTerms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net30">30 יום מקבלת חשבונית</SelectItem>
                  <SelectItem value="net45">45 יום מקבלת חשבונית</SelectItem>
                  <SelectItem value="net60">60 יום מקבלת חשבונית</SelectItem>
                  <SelectItem value="net90">90 יום מקבלת חשבונית</SelectItem>
                  <SelectItem value="immediate">מיידי</SelectItem>
                  <SelectItem value="advance">מקדמה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validityPeriod">תקופת תוקף (ימים)</Label>
              <Input
                id="validityPeriod"
                type="number"
                value={settings.quotations.validityPeriod || 30}
                onChange={(e) => updateSettings('quotations', 'validityPeriod', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="warranty">תנאי אחריות</Label>
            <Input
              id="warranty"
              value={settings.quotations.warranty}
              onChange={(e) => updateSettings('quotations', 'warranty', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות אישור</CardTitle>
          <CardDescription>דרישות אישור להצעות מחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="requireApproval" className="cursor-pointer">דרוש אישור להצעות מחיר</Label>
              <p className="text-xs text-muted-foreground mt-1">הצעות מעל סכום מסוים ידרשו אישור</p>
            </div>
            <Switch
              id="requireApproval"
              checked={settings.quotations.requireApproval || false}
              onCheckedChange={(checked) => updateSettings('quotations', 'requireApproval', checked)}
            />
          </div>
          {settings.quotations.requireApproval && (
            <div className="space-y-2">
              <Label htmlFor="approvalThreshold">סכום לאישור (₪)</Label>
              <Input
                id="approvalThreshold"
                type="number"
                value={settings.quotations.approvalThreshold || 50000}
                onChange={(e) => updateSettings('quotations', 'approvalThreshold', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                הצעות מעל סכום זה ידרשו אישור מנהל
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DatabaseSettings({ settings, updateSettings }: SettingsComponentProps) {
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
                <span className="font-medium">{settings.database.lastBackup || 'לא בוצע גיבוי'}</span>
              </div>
              <div className="flex justify-between">
                <span>גודל מסד נתונים:</span>
                <span className="font-medium">~2.5 MB</span>
              </div>
              <div className="flex justify-between">
                <span>גיבוי אוטומטי:</span>
                <Badge variant={settings.database.autoBackup ? "default" : "secondary"}>
                  {settings.database.autoBackup ? 'פעיל' : 'כבוי'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="autoBackup" className="cursor-pointer">גיבוי אוטומטי</Label>
            <Switch
              id="autoBackup"
              checked={settings.database.autoBackup}
              onCheckedChange={(checked) => updateSettings('database', 'autoBackup', checked)}
            />
          </div>
          {settings.database.autoBackup && (
            <div className="space-y-2">
              <Label htmlFor="backupFrequency">תדירות גיבוי</Label>
              <Select
                value={settings.database.backupFrequency || 'daily'}
                onValueChange={(value) => updateSettings('database', 'backupFrequency', value)}
              >
                <SelectTrigger id="backupFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">כל שעה</SelectItem>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                  <SelectItem value="monthly">חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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

function SecuritySettings({ settings, updateSettings }: SettingsComponentProps) {
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="requireLogin" className="cursor-pointer">דרוש התחברות</Label>
            <Switch
              id="requireLogin"
              checked={settings.security.requireLogin}
              onCheckedChange={(checked) => updateSettings('security', 'requireLogin', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="sessionTimeout" className="cursor-pointer">ניתוק אוטומטי אחרי חוסר פעילות</Label>
            <Switch
              id="sessionTimeout"
              checked={settings.security.sessionTimeout}
              onCheckedChange={(checked) => updateSettings('security', 'sessionTimeout', checked)}
            />
          </div>
          {settings.security.sessionTimeout && (
            <div className="space-y-2">
              <Label htmlFor="timeoutMinutes">זמן ניתוק (דקות)</Label>
              <Input
                id="timeoutMinutes"
                type="number"
                value={settings.security.timeoutMinutes}
                onChange={(e) => updateSettings('security', 'timeoutMinutes', parseInt(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="passwordPolicy">מדיניות סיסמאות</Label>
            <Select
              value={settings.security.passwordPolicy || 'medium'}
              onValueChange={(value) => updateSettings('security', 'passwordPolicy', value)}
            >
              <SelectTrigger id="passwordPolicy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">נמוכה - 6 תווים</SelectItem>
                <SelectItem value="medium">בינונית - 8 תווים, אותיות ומספרים</SelectItem>
                <SelectItem value="high">גבוהה - 12 תווים, אותיות, מספרים ותווים מיוחדים</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="twoFactorAuth" className="cursor-pointer">אימות דו-שלבי</Label>
              <p className="text-xs text-muted-foreground mt-1">דרוש אימות נוסף בכל התחברות</p>
            </div>
            <Switch
              id="twoFactorAuth"
              checked={settings.security.twoFactorAuth || false}
              onCheckedChange={(checked) => updateSettings('security', 'twoFactorAuth', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSettings({ settings, updateSettings }: SettingsComponentProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>התראות מערכת</CardTitle>
          <CardDescription>הגדרות התראות ודיוורים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התראות דוא"ל</Label>
              <p className="text-xs text-muted-foreground mt-1">קבל התראות בדוא"ל</p>
            </div>
            <Switch
              checked={settings.notifications.emailNotifications}
              onCheckedChange={(checked) => updateSettings('notifications', 'emailNotifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התראות דפדפן</Label>
              <p className="text-xs text-muted-foreground mt-1">התראות בדפדפן</p>
            </div>
            <Switch
              checked={settings.notifications.browserNotifications}
              onCheckedChange={(checked) => updateSettings('notifications', 'browserNotifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התראות הצעות</Label>
              <p className="text-xs text-muted-foreground mt-1">עדכונים על הצעות מחיר</p>
            </div>
            <Switch
              checked={settings.notifications.quotationNotifications}
              onCheckedChange={(checked) => updateSettings('notifications', 'quotationNotifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התראות מערכת</Label>
              <p className="text-xs text-muted-foreground mt-1">עדכוני מערכת ותחזוקה</p>
            </div>
            <Switch
              checked={settings.notifications.systemNotifications}
              onCheckedChange={(checked) => updateSettings('notifications', 'systemNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>התראות CPQ ספציפיות</CardTitle>
          <CardDescription>התראות ספציפיות למערכת הצעות מחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התרעה על אישורים</Label>
              <p className="text-xs text-muted-foreground mt-1">קבל התראה כשהצעה ממתינה לאישור</p>
            </div>
            <Switch
              checked={settings.notifications.notifyOnApproval || true}
              onCheckedChange={(checked) => updateSettings('notifications', 'notifyOnApproval', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="cursor-pointer">התרעה על פקיעת תוקף</Label>
              <p className="text-xs text-muted-foreground mt-1">קבל התראה לפני פקיעת הצעת מחיר</p>
            </div>
            <Switch
              checked={settings.notifications.notifyOnExpiry || true}
              onCheckedChange={(checked) => updateSettings('notifications', 'notifyOnExpiry', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>כתובות דוא"ל</CardTitle>
          <CardDescription>ניהול כתובות לקבלת התראות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryEmail">כתובת דוא"ל ראשית</Label>
            <Input
              id="primaryEmail"
              type="email"
              placeholder="admin@company.com"
              value={settings.notifications.primaryEmail}
              onChange={(e) => updateSettings('notifications', 'primaryEmail', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalEmails">כתובות נוספות</Label>
            <Input
              id="additionalEmails"
              placeholder="email1@company.com, email2@company.com"
              value={settings.notifications.additionalEmails}
              onChange={(e) => updateSettings('notifications', 'additionalEmails', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">הפרד כתובות עם פסיק</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppearanceSettings({ settings, updateSettings }: SettingsComponentProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>עיצוב ממשק</CardTitle>
          <CardDescription>הגדרות מראה והתנהגות הממשק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">ערכת נושא</Label>
            <Select
              value={settings.appearance.theme}
              onValueChange={(value) => updateSettings('appearance', 'theme', value)}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">בהיר</SelectItem>
                <SelectItem value="dark">כהה</SelectItem>
                <SelectItem value="system">ברירת מחדל מערכת</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">שפה</Label>
            <Select
              value={settings.appearance.language}
              onValueChange={(value) => updateSettings('appearance', 'language', value)}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="he">עברית</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fontSize">גודל גופן</Label>
            <Select
              value={settings.appearance.fontSize || 'medium'}
              onValueChange={(value) => updateSettings('appearance', 'fontSize', value)}
            >
              <SelectTrigger id="fontSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">קטן</SelectItem>
                <SelectItem value="medium">בינוני</SelectItem>
                <SelectItem value="large">גדול</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="compactMode" className="cursor-pointer">מצב קומפקטי</Label>
            <Switch
              id="compactMode"
              checked={settings.appearance.compactMode}
              onCheckedChange={(checked) => updateSettings('appearance', 'compactMode', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label htmlFor="showTooltips" className="cursor-pointer">הצג טיפים</Label>
            <Switch
              id="showTooltips"
              checked={settings.appearance.showTooltips}
              onCheckedChange={(checked) => updateSettings('appearance', 'showTooltips', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>התנהגות ממשק</CardTitle>
          <CardDescription>הגדרות התנהגות ואינטראקציה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="autoSave" className="cursor-pointer">שמירה אוטומטית</Label>
              <p className="text-xs text-muted-foreground mt-1">שמור שינויים אוטומטית</p>
            </div>
            <Switch
              id="autoSave"
              checked={settings.appearance.autoSave}
              onCheckedChange={(checked) => updateSettings('appearance', 'autoSave', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="confirmActions" className="cursor-pointer">אישור פעולות מסוכנות</Label>
              <p className="text-xs text-muted-foreground mt-1">הצג אישור למחיקה ופעולות בלתי הפיכות</p>
            </div>
            <Switch
              id="confirmActions"
              checked={settings.appearance.confirmActions}
              onCheckedChange={(checked) => updateSettings('appearance', 'confirmActions', checked)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="itemsPerPage">פריטים בעמוד</Label>
            <Select
              value={settings.appearance.itemsPerPage}
              onValueChange={(value) => updateSettings('appearance', 'itemsPerPage', value)}
            >
              <SelectTrigger id="itemsPerPage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WorkflowSettings({ settings, updateSettings }: SettingsComponentProps) {
  // Ensure workflow settings exist with fallback
  const workflowSettings = settings.workflow || {
    enableApprovalWorkflow: false,
    approvalLevels: 1,
    autoApproveBelow: 10000,
    requireManagerApproval: true,
    notifyOnStatusChange: true
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Workflow className="h-5 w-5 inline ml-2" />
            תהליך אישור הצעות מחיר
          </CardTitle>
          <CardDescription>הגדר תהליך אישור אוטומטי להצעות מחיר</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="enableApprovalWorkflow" className="cursor-pointer">הפעל תהליך אישור</Label>
              <p className="text-xs text-muted-foreground mt-1">דרוש אישור מנהל להצעות מחיר</p>
            </div>
            <Switch
              id="enableApprovalWorkflow"
              checked={workflowSettings.enableApprovalWorkflow}
              onCheckedChange={(checked) => updateSettings('workflow', 'enableApprovalWorkflow', checked)}
            />
          </div>

          {workflowSettings.enableApprovalWorkflow && (
            <>
              <div className="space-y-2">
                <Label htmlFor="approvalLevels">מספר רמות אישור</Label>
                <Select
                  value={workflowSettings.approvalLevels.toString()}
                  onValueChange={(value) => updateSettings('workflow', 'approvalLevels', parseInt(value))}
                >
                  <SelectTrigger id="approvalLevels">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">רמה אחת</SelectItem>
                    <SelectItem value="2">שתי רמות</SelectItem>
                    <SelectItem value="3">שלוש רמות</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  מספר המנהלים שצריכים לאשר הצעה
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoApproveBelow">אישור אוטומטי מתחת ל-₪</Label>
                <Input
                  id="autoApproveBelow"
                  type="number"
                  value={workflowSettings.autoApproveBelow}
                  onChange={(e) => updateSettings('workflow', 'autoApproveBelow', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  הצעות מתחת לסכום זה יאושרו אוטומטית
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="requireManagerApproval" className="cursor-pointer">דרוש אישור מנהל</Label>
                  <p className="text-xs text-muted-foreground mt-1">כל הצעה תדרוש אישור מנהל</p>
                </div>
                <Switch
                  id="requireManagerApproval"
                  checked={workflowSettings.requireManagerApproval}
                  onCheckedChange={(checked) => updateSettings('workflow', 'requireManagerApproval', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="notifyOnStatusChange" className="cursor-pointer">התראה על שינוי סטטוס</Label>
                  <p className="text-xs text-muted-foreground mt-1">שלח התראה כשסטטוס ההצעה משתנה</p>
                </div>
                <Switch
                  id="notifyOnStatusChange"
                  checked={workflowSettings.notifyOnStatusChange}
                  onCheckedChange={(checked) => updateSettings('workflow', 'notifyOnStatusChange', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תהליך אוטומציה</CardTitle>
          <CardDescription>כללי אוטומציה נוספים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border border-muted-foreground/20 bg-muted/30">
            <div className="flex items-center space-x-reverse space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h4 className="font-medium">כללי אוטומציה פעילים</h4>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 mr-6">
              <li>• שליחת התראה אוטומטית למנהל בהצעות מעל {workflowSettings.autoApproveBelow.toLocaleString()}₪</li>
              <li>• עדכון סטטוס אוטומטי להצעות שאושרו</li>
              <li>• התראה על הצעות שממתינות לאישור מעל 7 ימים</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
