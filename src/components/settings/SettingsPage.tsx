import React, { useState, useEffect } from 'react'
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
  Trash2,
  Edit2,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_COMPONENT_CATEGORIES, TABLE_COLUMN_DEFINITIONS, getDefaultVisibleColumns, notifyCategoriesUpdated } from '@/constants/settings'
import { CategoryMigrationDialog } from '../ui/CategoryMigrationDialog'
import { useCPQ } from '@/contexts/CPQContext'
import { loadSetting, saveSetting, migrateLocalStorageToSupabase } from '@/services/settingsService'
import { logger } from '@/lib/logger'

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
function _getDefaultSettings(): SettingsData {
  return {
    general: {
      systemName: 'RadiaQ AI',
      systemDescription: 'מערכת CPQ חכמה לניהול הצעות מחיר לפרויקטי רובוטיקה',
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
      defaultMarkup: 0.75,
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

function _validateSettings(settings: SettingsData): string[] {
  const errors: string[] = []
  
  // Validate pricing settings
  if (settings.pricing.usdToIlsRate <= 0) {
    errors.push('שער דולר לשקל חייב להיות חיובי')
  }
  if (settings.pricing.eurToIlsRate <= 0) {
    errors.push('שער אירו לשקל חייב להיות חיובי')
  }
  if (settings.pricing.defaultMarkup < 0 || settings.pricing.defaultMarkup > 1) {
    errors.push('מקדם רווח חייב להיות בין 0 ל-1')
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

function _applySettings(settings: SettingsData): void {
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

            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Individual Settings Sections ============

function GeneralSettings() {
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
                defaultValue="RadiaQ AI"

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
              defaultValue="מערכת CPQ חכמה לניהול הצעות מחיר לפרויקטי רובוטיקה"

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
              <select className="w-full p-2 border rounded-md" >
                <option value="Asia/Jerusalem">ישראל (GMT+2)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">ניו יורק (GMT-5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">פורמט תאריך</label>
              <select className="w-full p-2 border rounded-md" >
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

function CompanySettings() {
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
              <Input placeholder="שם החברה"  />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ח.פ./ע.מ.</label>
              <Input placeholder="ח.פ. או ע.מ."  />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">כתובת</label>
            <Input placeholder="רחוב, מספר, עיר"  />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">טלפון</label>
              <Input placeholder="טלפון ראשי"  />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">פקס</label>
              <Input placeholder="מספר פקס"  />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">אתר אינטרנט</label>
            <Input placeholder="www.example.com"  />
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
              <Input placeholder="שם מלא"  />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">תפקיד</label>
              <Input placeholder="תפקיד בחברה"  />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">אימייל</label>
              <Input type="email" placeholder="email@company.com"  />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">טלפון נייד</label>
              <Input placeholder="טלפון נייד"  />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PricingSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [pricingSettings, setPricingSettings] = useState({
    usdToIlsRate: 3.70,
    eurToIlsRate: 4.00,
    autoUpdateRates: false,
    defaultMarkup: 0.75,
    defaultRisk: 5,
    dayWorkCost: 1200,
    vatRate: 17,
    deliveryTime: '4-6 שבועות'
  })

  // Load pricing settings from Supabase on mount
  useEffect(() => {
    async function loadPricingSettings() {
      setIsLoading(true)
      try {
        // First, migrate any old localStorage settings
        await migrateLocalStorageToSupabase()

        // Load from Supabase
        const result = await loadSetting<typeof pricingSettings>('pricing')
        if (result.success && result.data) {
          setPricingSettings(result.data)
        }
      } catch (error) {
        logger.error('Error loading pricing settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPricingSettings()
  }, [])

  // Auto-save to Supabase whenever settings change
  const savePricingSettings = async (updatedSettings: typeof pricingSettings) => {
    try {
      await saveSetting('pricing', updatedSettings)
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'))
    } catch (error) {
      logger.error('Error saving pricing settings:', error)
    }
  }

  const handleChange = (field: keyof typeof pricingSettings, value: any) => {
    const updatedSettings = {
      ...pricingSettings,
      [field]: value
    }
    setPricingSettings(updatedSettings)
    // Auto-save on change
    savePricingSettings(updatedSettings)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>הגדרות תמחור</CardTitle>
            <CardDescription>פרמטרים פיננסיים ושערי חליפין</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>טוען הגדרות מהענן...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                value={pricingSettings.usdToIlsRate}
                onChange={(e) => handleChange('usdToIlsRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">אירו לשקל (EUR/ILS)</label>
              <Input
                type="number"
                step="0.01"
                value={pricingSettings.eurToIlsRate}
                onChange={(e) => handleChange('eurToIlsRate', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input
              type="checkbox"
              id="autoUpdate"
              checked={pricingSettings.autoUpdateRates}
              onChange={(e) => handleChange('autoUpdateRates', e.target.checked)}
            />
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
              <label className="block text-sm font-medium mb-2">מקדם רווח ברירת מחדל (0-1)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={pricingSettings.defaultMarkup}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  // Round to 2 decimal places
                  const rounded = Math.round(value * 100) / 100
                  handleChange('defaultMarkup', rounded)
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">אחוז סיכון ברירת מחדל (%)</label>
              <Input
                type="number"
                step="0.1"
                value={pricingSettings.defaultRisk}
                onChange={(e) => handleChange('defaultRisk', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">עלות יום עבודה (₪)</label>
            <Input
              type="number"
              step="10"
              value={pricingSettings.dayWorkCost}
              onChange={(e) => handleChange('dayWorkCost', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">שיעור מע"מ (%)</label>
              <Input
                type="number"
                step="0.1"
                value={pricingSettings.vatRate}
                onChange={(e) => handleChange('vatRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">זמן אספקה ברירת מחדל</label>
              <Input
                value={pricingSettings.deliveryTime}
                onChange={(e) => handleChange('deliveryTime', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuotationSettings() {
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load logo URL from settings on mount
  useEffect(() => {
    async function loadLogo() {
      setIsLoading(true);
      try {
        const result = await loadSetting<{ logoUrl: string }>('companyLogo');
        if (result.success && result.data?.logoUrl) {
          setLogoUrl(result.data.logoUrl);
        }
      } catch (error) {
        logger.error('Error loading logo:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogo();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('נא להעלות קובץ תמונה בלבד');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('גודל הקובץ חייב להיות עד 2MB');
      return;
    }

    setIsUploading(true);
    try {
      // Import upload function dynamically to avoid circular dependencies
      const { uploadFile } = await import('../../utils/storageHelpers');

      const result = await uploadFile(file, 'company-logo', 'company-assets');

      if (result.success && result.url) {
        setLogoUrl(result.url);
        // Save to settings
        await saveSetting('companyLogo', { logoUrl: result.url });
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('cpq-logo-updated', { detail: { logoUrl: result.url } }));
      } else {
        alert('שגיאה בהעלאת הלוגו: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('Error uploading logo:', error);
      alert('שגיאה בהעלאת הלוגו');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הלוגו?')) return;

    try {
      // Import delete function
      const { deleteFile } = await import('../../utils/storageHelpers');

      await deleteFile('company-logo', 'company-assets');
      setLogoUrl(null);
      // Clear from settings
      await saveSetting('companyLogo', { logoUrl: null });
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('cpq-logo-updated', { detail: { logoUrl: null } }));
    } catch (error) {
      logger.error('Error removing logo:', error);
      alert('שגיאה במחיקת הלוגו');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>תבנית הצעת מחיר</CardTitle>
            <CardDescription>הגדרות תבנית ומראה הצעת המחיר</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>טוען הגדרות...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">לוגו חברה</label>
            <div className="space-y-3">
              {logoUrl && (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">לוגו נוכחי</p>
                    <p className="text-xs text-muted-foreground">הלוגו יוצג בראש הצעות המחיר</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={isUploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center space-x-reverse space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 ml-2" />
                      {logoUrl ? 'החלף לוגו' : 'העלה לוגו'}
                    </>
                  )}
                </Button>
                {!logoUrl && <Badge variant="secondary">אין לוגו</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                תמונות עד 2MB בפורמט JPG, PNG, GIF או SVG
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">כותרת תחתונה</label>
              <Input 
                placeholder="תודה על אמונכם" 
                
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">חתימה</label>
              <Input 
                placeholder="שם החותם" 
                
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
            <select className="w-full p-2 border rounded-md" >
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
              
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DatabaseSettings() {
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
            <input type="checkbox" id="autoBackup"  />
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

function SecuritySettings() {
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
            <input type="checkbox" id="requireLogin" defaultChecked  />
            <label htmlFor="requireLogin" className="text-sm">דרוש התחברות</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="sessionTimeout" defaultChecked  />
            <label htmlFor="sessionTimeout" className="text-sm">ניתוק אוטומטי אחרי חוסר פעילות</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">זמן ניתוק (דקות)</label>
            <Input type="number" defaultValue="30"  />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSettings() {
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
              <input type="checkbox" defaultChecked  />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות דפדפן</div>
                <div className="text-sm text-muted-foreground">התראות בדפדפן</div>
              </div>
              <input type="checkbox" defaultChecked  />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות הצעות</div>
                <div className="text-sm text-muted-foreground">עדכונים על הצעות מחיר</div>
              </div>
              <input type="checkbox" defaultChecked  />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">התראות מערכת</div>
                <div className="text-sm text-muted-foreground">עדכוני מערכת ותחזוקה</div>
              </div>
              <input type="checkbox"  />
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
            <Input type="email" placeholder="admin@company.com"  />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">כתובות נוספות</label>
            <Input placeholder="email1@company.com, email2@company.com"  />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppearanceSettings() {
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
            <select className="w-full p-2 border rounded-md" >
              <option value="light">בהיר</option>
              <option value="dark">כהה</option>
              <option value="system">ברירת מחדל מערכת</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">שפה</label>
            <select className="w-full p-2 border rounded-md" >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="compactMode"  />
            <label htmlFor="compactMode" className="text-sm">מצב קומפקטי</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="showTooltips" defaultChecked  />
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
            <input type="checkbox" id="autoSave" defaultChecked  />
            <label htmlFor="autoSave" className="text-sm">שמירה אוטומטית</label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input type="checkbox" id="confirmActions" defaultChecked  />
            <label htmlFor="confirmActions" className="text-sm">אישור פעולות מסוכנות</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">פריטים בעמוד</label>
            <select className="w-full p-2 border rounded-md" >
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

function ComponentCategoriesSettings() {
  const { components, updateComponent } = useCPQ()
  const [categories, setCategories] = useState<string[]>([...DEFAULT_COMPONENT_CATEGORIES])
  const [isLoading, setIsLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState<{
    index: number
    oldName: string
    newName: string
  } | null>(null)
  const [isSavingRename, setIsSavingRename] = useState(false)
  const [migrationDialog, setMigrationDialog] = useState<{
    isOpen: boolean
    categoryToDelete: string
    componentCount: number
  }>({
    isOpen: false,
    categoryToDelete: '',
    componentCount: 0
  })

  // Load categories from Supabase on mount
  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true)
      try {
        // First, migrate any old localStorage settings
        await migrateLocalStorageToSupabase()

        // Load from Supabase
        const result = await loadSetting<{ categories: string[] }>('componentCategories')
        if (result.success && result.data?.categories) {
          setCategories(result.data.categories)
        } else {
          // No settings found, use defaults
          setCategories([...DEFAULT_COMPONENT_CATEGORIES])
        }
      } catch (error) {
        logger.error('Error loading categories:', error)
        setCategories([...DEFAULT_COMPONENT_CATEGORIES])
      } finally {
        setIsLoading(false)
      }
    }
    loadCategories()
  }, [])

  const updateCategoriesInStorage = async (updatedCategories: string[]) => {
    try {
      // Save to Supabase (also caches in localStorage)
      await saveSetting('componentCategories', { categories: updatedCategories })
      notifyCategoriesUpdated()
    } catch (error) {
      logger.error('Error saving categories:', error)
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()]
      setCategories(updatedCategories)
      setNewCategory('')
      updateCategoriesInStorage(updatedCategories)
    }
  }

  const handleStartEdit = (index: number, categoryName: string) => {
    setEditingCategory({
      index,
      oldName: categoryName,
      newName: categoryName
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
  }

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.newName.trim()) return

    const newName = editingCategory.newName.trim()
    const oldName = editingCategory.oldName

    // Check if name already exists (and it's not the same category)
    if (newName !== oldName && categories.includes(newName)) {
      alert('קטגוריה בשם זה כבר קיימת')
      return
    }

    setIsSavingRename(true)
    try {
      // Update all components with the old category to the new category name
      const componentsToUpdate = components.filter(c => c.category === oldName)

      if (componentsToUpdate.length > 0) {
        for (const component of componentsToUpdate) {
          await updateComponent(component.id, { category: newName })
        }
      }

      // Update the category in the list
      const updatedCategories = [...categories]
      updatedCategories[editingCategory.index] = newName
      setCategories(updatedCategories)
      updateCategoriesInStorage(updatedCategories)

      setEditingCategory(null)
    } catch (error) {
      logger.error('Error renaming category:', error)
      alert('שגיאה בשינוי שם הקטגוריה. אנא נסה שוב.')
    } finally {
      setIsSavingRename(false)
    }
  }

  const handleDeleteCategoryClick = (category: string) => {
    // Count components with this category
    const componentsInCategory = components.filter(c => c.category === category)

    setMigrationDialog({
      isOpen: true,
      categoryToDelete: category,
      componentCount: componentsInCategory.length
    })
  }

  const handleConfirmDelete = async (targetCategory: string) => {
    const categoryToDelete = migrationDialog.categoryToDelete

    // Migrate all components from deleted category to target category
    const componentsToMigrate = components.filter(c => c.category === categoryToDelete)

    try {
      // Update all components with the deleted category to the new category
      for (const component of componentsToMigrate) {
        await updateComponent(component.id, { category: targetCategory })
      }

      // Remove the category from the list
      const updatedCategories = categories.filter(c => c !== categoryToDelete)
      setCategories(updatedCategories)
      updateCategoriesInStorage(updatedCategories)

      // Close dialog
      setMigrationDialog({ isOpen: false, categoryToDelete: '', componentCount: 0 })
    } catch (error) {
      logger.error('Error migrating components:', error)
      alert('שגיאה בהעברת הרכיבים. אנא נסה שוב.')
    }
  }

  const handleCancelDelete = () => {
    setMigrationDialog({ isOpen: false, categoryToDelete: '', componentCount: 0 })
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const updatedCategories = [...categories]
      ;[updatedCategories[index - 1], updatedCategories[index]] =
        [updatedCategories[index], updatedCategories[index - 1]]
      setCategories(updatedCategories)
      updateCategoriesInStorage(updatedCategories)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < categories.length - 1) {
      const updatedCategories = [...categories]
      ;[updatedCategories[index], updatedCategories[index + 1]] =
        [updatedCategories[index + 1], updatedCategories[index]]
      setCategories(updatedCategories)
      updateCategoriesInStorage(updatedCategories)
    }
  }

  const availableCategoriesForMigration = categories.filter(
    c => c !== migrationDialog.categoryToDelete
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>קטגוריות רכיבים</CardTitle>
            <CardDescription>ניהול רשימת הקטגוריות לרכיבים במערכת</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>טוען הגדרות מהענן...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <CategoryMigrationDialog
        isOpen={migrationDialog.isOpen}
        categoryToDelete={migrationDialog.categoryToDelete}
        componentCount={migrationDialog.componentCount}
        availableCategories={availableCategoriesForMigration}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

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
                  key={`${category}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  {editingCategory?.index === index ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <Input
                        value={editingCategory.newName}
                        onChange={(e) => setEditingCategory({
                          ...editingCategory,
                          newName: e.target.value
                        })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveEdit} disabled={isSavingRename}>
                        {isSavingRename ? 'שומר...' : 'שמור'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        ביטול
                      </Button>
                    </div>
                  ) : (
                    <>
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
                          onClick={() => handleStartEdit(index, category)}
                          title="שנה שם"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategoryClick(category)}
                          title="מחק"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function TableColumnsSettings() {
  const [activeTable, setActiveTable] = useState<'component_library' | 'bom_grid' | 'quotation_data_grid'>('component_library')
  const [isLoading, setIsLoading] = useState(true)
  const [tableSettings, setTableSettings] = useState({
    component_library: getDefaultVisibleColumns('component_library'),
    bom_grid: getDefaultVisibleColumns('bom_grid'),
    quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid')
  })

  // Load table settings from Supabase on mount
  useEffect(() => {
    async function loadTableSettings() {
      setIsLoading(true)
      try {
        const result = await loadSetting<{
          component_library: string[]
          bom_grid: string[]
          quotation_data_grid: string[]
        }>('tableColumns')

        if (result.success && result.data) {
          setTableSettings(result.data)
        } else {
          // Use defaults
          setTableSettings({
            component_library: getDefaultVisibleColumns('component_library'),
            bom_grid: getDefaultVisibleColumns('bom_grid'),
            quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid')
          })
        }
      } catch (error) {
        logger.error('Error loading table settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTableSettings()
  }, [])

  const tableNames = {
    component_library: 'ספריית רכיבים',
    bom_grid: 'טבלת תמחור',
    quotation_data_grid: 'טבלת הצעות מחיר'
  }

  const handleToggleColumn = async (tableType: typeof activeTable, columnId: string) => {
    const currentColumns = tableSettings[tableType] || []
    const updatedColumns = currentColumns.includes(columnId)
      ? currentColumns.filter(id => id !== columnId)
      : [...currentColumns, columnId]

    const updatedSettings = {
      ...tableSettings,
      [tableType]: updatedColumns
    }

    setTableSettings(updatedSettings)

    // Save to Supabase
    try {
      await saveSetting('tableColumns', updatedSettings)
      // Notify grids that table column settings have changed
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'))
    } catch (error) {
      logger.error('Error saving table column settings:', error)
    }
  }

  const handleResetTable = async (tableType: typeof activeTable) => {
    const defaultColumns = getDefaultVisibleColumns(tableType)
    const updatedSettings = {
      ...tableSettings,
      [tableType]: defaultColumns
    }

    setTableSettings(updatedSettings)

    // Save to Supabase
    try {
      await saveSetting('tableColumns', updatedSettings)
      // Notify grids that table column settings have changed
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'))
    } catch (error) {
      logger.error('Error saving table column settings:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>עמודות ברירת מחדל לטבלאות</CardTitle>
            <CardDescription>בחר אילו עמודות יוצגו כברירת מחדל בכל טבלה</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>טוען הגדרות מהענן...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
