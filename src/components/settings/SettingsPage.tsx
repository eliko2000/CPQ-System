import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
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
  Users,
  ArrowRight,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Lazy load all settings sections
const TeamSettings = lazy(() =>
  import('./sections/TeamSettings').then(m => ({
    default: m.TeamSettings,
  }))
);
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
const NumberingSettings = lazy(() =>
  import('./sections/NumberingSettings').then(m => ({
    default: m.NumberingSettings,
  }))
);

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  adminOnly?: boolean; // Hide from non-admins
  viewOnly?: boolean; // Members can view but not edit
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const { members } = useTeamMembers(currentTeam?.id);

  // Get current user's role
  const currentMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  const settingsSections: SettingsSection[] = [
    {
      id: 'team',
      title: 'הגדרות צוות',
      description: 'ניהול פרטי צוות וחברים',
      icon: Users,
      component: TeamSettings,
      adminOnly: true, // Hide from members
    },
    {
      id: 'general',
      title: 'הגדרות כלליות',
      description: 'הגדרות בסיסיות של המערכת',
      icon: Settings,
      component: GeneralSettings,
      // Full access
    },
    {
      id: 'company',
      title: 'פרטי חברה',
      description: 'מידע על החברה ופרטי התקשרות',
      icon: Building,
      component: CompanySettings,
      viewOnly: true, // Members can view
    },
    {
      id: 'pricing',
      title: 'הגדרות תמחור',
      description: 'פרמטרים פיננסיים ושערי חליפין',
      icon: DollarSign,
      component: PricingSettings,
      viewOnly: true, // Members can view
    },
    {
      id: 'numbering',
      title: 'מספור פרויקטים והצעות מחיר',
      description: 'הגדרות תבנית המספור',
      icon: Hash,
      component: NumberingSettings,
      adminOnly: true, // Admin only
    },
    {
      id: 'quotations',
      title: 'הגדרות הצעות מחיר',
      description: 'תבניות והגדרות להצעות מחיר',
      icon: FileText,
      component: QuotationSettings,
      viewOnly: true, // Members can view
    },
    {
      id: 'database',
      title: 'ניהול מידע',
      description: 'גיבוי, ייבוא וייצוא נתונים',
      icon: Database,
      component: DatabaseSettings,
      adminOnly: true, // Hide from members
    },
    {
      id: 'security',
      title: 'אבטחה והרשאות',
      description: 'ניהול משתמשים והרשאות גישה',
      icon: Shield,
      component: SecuritySettings,
      adminOnly: true, // Hide from members
    },
    {
      id: 'notifications',
      title: 'התראות',
      description: 'הגדרות התראות ודיוורים',
      icon: Bell,
      component: NotificationSettings,
      // Full access
    },
    {
      id: 'appearance',
      title: 'מראה והתנהגות',
      description: 'עיצוב, שפה והגדרות ממשק',
      icon: Palette,
      component: AppearanceSettings,
      // Full access
    },
    {
      id: 'componentCategories',
      title: 'קטגוריות רכיבים',
      description: 'ניהול קטגוריות רכיבים במערכת',
      icon: List,
      component: ComponentCategoriesSettings,
      viewOnly: true, // Members can view
    },
    {
      id: 'tableColumns',
      title: 'עמודות טבלאות',
      description: 'הגדרות עמודות ברירת מחדל לטבלאות',
      icon: Grid3x3,
      component: TableColumnsSettings,
      // Full access (personal preference)
    },
  ];

  // Filter sections based on role
  const visibleSections = settingsSections.filter(section => {
    if (section.adminOnly && !isAdmin) return false;
    return true;
  });

  // Set default active section to first visible section
  const [activeSection, setActiveSection] = useState(() => {
    const firstSection = visibleSections[0];
    return firstSection ? firstSection.id : 'general';
  });

  const ActiveComponent =
    visibleSections.find(section => section.id === activeSection)?.component ||
    GeneralSettings;

  const activeSettings = visibleSections.find(s => s.id === activeSection);
  const isViewOnly = activeSettings?.viewOnly && !isAdmin;

  return (
    <div
      className="flex h-full bg-background rounded-lg border shadow-sm overflow-hidden"
      dir="rtl"
    >
      {/* Sidebar Navigation */}
      <div className="w-64 border-l border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-8 w-8"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold text-lg">הגדרות</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            ניהול הגדרות המערכת והצוות
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {visibleSections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-right transition-colors text-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{section.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {visibleSections.find(s => s.id === activeSection)?.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {visibleSections.find(s => s.id === activeSection)?.description}
            </p>
            {isViewOnly && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  רק מנהלי צוות יכולים לערוך הגדרות אלו
                </p>
              </div>
            )}
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>טוען...</span>
                </div>
              </div>
            }
          >
            <ActiveComponent isAdmin={isAdmin} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
