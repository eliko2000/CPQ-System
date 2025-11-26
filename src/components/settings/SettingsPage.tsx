import React, { useState, lazy, Suspense } from 'react';
import {
  Settings,
  Building,
  DollarSign,
  FileText,
  Database,
  Shield,
  Bell,
  Palette,
  List,
  Grid3x3,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load all settings sections
const GeneralSettings = lazy(() =>
  import('./sections/GeneralSettings').then(m => ({
    default: m.GeneralSettings,
  }))
);
const CompanySettings = lazy(() =>
  import('./sections/CompanySettings').then(m => ({
    default: m.CompanySettings,
  }))
);
const PricingSettings = lazy(() =>
  import('./sections/PricingSettings').then(m => ({
    default: m.PricingSettings,
  }))
);
const QuotationSettings = lazy(() =>
  import('./sections/QuotationSettings').then(m => ({
    default: m.QuotationSettings,
  }))
);
const DatabaseSettings = lazy(() =>
  import('./sections/DatabaseSettings').then(m => ({
    default: m.DatabaseSettings,
  }))
);
const SecuritySettings = lazy(() =>
  import('./sections/SecuritySettings').then(m => ({
    default: m.SecuritySettings,
  }))
);
const NotificationSettings = lazy(() =>
  import('./sections/NotificationSettings').then(m => ({
    default: m.NotificationSettings,
  }))
);
const AppearanceSettings = lazy(() =>
  import('./sections/AppearanceSettings').then(m => ({
    default: m.AppearanceSettings,
  }))
);
const ComponentCategoriesSettings = lazy(() =>
  import('./sections/ComponentCategoriesSettings').then(m => ({
    default: m.ComponentCategoriesSettings,
  }))
);
const TableColumnsSettings = lazy(() =>
  import('./sections/TableColumnsSettings').then(m => ({
    default: m.TableColumnsSettings,
  }))
);

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const settingsSections: SettingsSection[] = [
    {
      id: 'general',
      title: 'הגדרות כלליות',
      description: 'הגדרות בסיסיות של המערכת',
      icon: Settings,
      component: GeneralSettings,
    },
    {
      id: 'company',
      title: 'פרטי חברה',
      description: 'מידע על החברה ופרטי התקשרות',
      icon: Building,
      component: CompanySettings,
    },
    {
      id: 'pricing',
      title: 'הגדרות תמחור',
      description: 'פרמטרים פיננסיים ושערי חליפין',
      icon: DollarSign,
      component: PricingSettings,
    },
    {
      id: 'quotations',
      title: 'הגדרות הצעות מחיר',
      description: 'תבניות והגדרות להצעות מחיר',
      icon: FileText,
      component: QuotationSettings,
    },
    {
      id: 'database',
      title: 'ניהול מידע',
      description: 'גיבוי, ייבוא וייצוא נתונים',
      icon: Database,
      component: DatabaseSettings,
    },
    {
      id: 'security',
      title: 'אבטחה והרשאות',
      description: 'ניהול משתמשים והרשאות גישה',
      icon: Shield,
      component: SecuritySettings,
    },
    {
      id: 'notifications',
      title: 'התראות',
      description: 'הגדרות התראות ודיוורים',
      icon: Bell,
      component: NotificationSettings,
    },
    {
      id: 'appearance',
      title: 'מראה והתנהגות',
      description: 'עיצוב, שפה והגדרות ממשק',
      icon: Palette,
      component: AppearanceSettings,
    },
    {
      id: 'componentCategories',
      title: 'קטגוריות רכיבים',
      description: 'ניהול קטגוריות רכיבים במערכת',
      icon: List,
      component: ComponentCategoriesSettings,
    },
    {
      id: 'tableColumns',
      title: 'עמודות טבלאות',
      description: 'הגדרות עמודות ברירת מחדל לטבלאות',
      icon: Grid3x3,
      component: TableColumnsSettings,
    },
  ];

  const ActiveComponent =
    settingsSections.find(section => section.id === activeSection)?.component ||
    GeneralSettings;

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
              <h1 className="text-xl font-semibold text-foreground">
                הגדרות מערכת
              </h1>
              <p className="text-sm text-muted-foreground">
                נהל את הגדרות המערכת
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {settingsSections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center space-x-reverse space-x-3 px-4 py-3 rounded-lg text-right transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 text-right">
                    <div className="font-medium">{section.title}</div>
                    <div
                      className={cn(
                        'text-xs',
                        isActive
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      )}
                    >
                      {section.description}
                    </div>
                  </div>
                </button>
              );
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
                {
                  settingsSections.find(s => s.id === activeSection)
                    ?.description
                }
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span>טוען...</span>
                  </div>
                </div>
              }
            >
              <ActiveComponent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
