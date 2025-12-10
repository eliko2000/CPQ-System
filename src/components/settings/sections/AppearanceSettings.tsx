import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Loader2, Check } from 'lucide-react';
import { loadSetting, saveSetting } from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

interface AppearancePreferences {
  itemsPerPage: number;
  compactMode: boolean;
  showTooltips: boolean;
  autoSave: boolean;
  confirmActions: boolean;
}

const DEFAULT_PREFERENCES: AppearancePreferences = {
  itemsPerPage: 25,
  compactMode: false,
  showTooltips: true,
  autoSave: true,
  confirmActions: true,
};

export function AppearanceSettings() {
  const { currentTeam } = useTeam();
  const [preferences, setPreferences] =
    useState<AppearancePreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load preferences on mount and when team changes
  useEffect(() => {
    loadPreferences();
  }, [currentTeam?.id]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const result = await loadSetting<AppearancePreferences>(
        'appearancePreferences',
        currentTeam?.id
      );
      if (result.success && result.data) {
        setPreferences(result.data);
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      logger.error('Error loading appearance preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (updatedPreferences: AppearancePreferences) => {
    try {
      const result = await saveSetting(
        'appearancePreferences',
        updatedPreferences,
        currentTeam?.id
      );
      if (result.success) {
        setSaveStatus({ type: 'success', message: 'נשמר בהצלחה' });
        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent('appearance-preferences-updated', {
            detail: updatedPreferences,
          })
        );
      } else {
        setSaveStatus({ type: 'error', message: 'שגיאה בשמירה' });
      }
    } catch (error) {
      logger.error('Error saving appearance preferences:', error);
      setSaveStatus({ type: 'error', message: 'שגיאה בשמירה' });
    }

    // Clear status after 2 seconds
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleItemsPerPageChange = (value: string) => {
    const updatedPreferences = {
      ...preferences,
      itemsPerPage: parseInt(value),
    };
    setPreferences(updatedPreferences);
    savePreferences(updatedPreferences);
  };

  const handleCheckboxChange = (field: keyof AppearancePreferences) => {
    const updatedPreferences = { ...preferences, [field]: !preferences[field] };
    setPreferences(updatedPreferences);
    savePreferences(updatedPreferences);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
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
          <CardTitle>עיצוב ממשק</CardTitle>
          <CardDescription>הגדרות מראה והתנהגות הממשק</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ערכת נושא</label>
            <select className="w-full p-2 border rounded-md" disabled>
              <option value="light">בהיר</option>
              <option value="dark">כהה</option>
              <option value="system">ברירת מחדל מערכת</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">בקרוב</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">שפה</label>
            <select className="w-full p-2 border rounded-md" disabled>
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">בקרוב</p>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input
              type="checkbox"
              id="compactMode"
              checked={preferences.compactMode}
              onChange={() => handleCheckboxChange('compactMode')}
            />
            <label htmlFor="compactMode" className="text-sm">
              מצב קומפקטי
            </label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input
              type="checkbox"
              id="showTooltips"
              checked={preferences.showTooltips}
              onChange={() => handleCheckboxChange('showTooltips')}
            />
            <label htmlFor="showTooltips" className="text-sm">
              הצג טיפים
            </label>
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
            <input
              type="checkbox"
              id="autoSave"
              checked={preferences.autoSave}
              onChange={() => handleCheckboxChange('autoSave')}
            />
            <label htmlFor="autoSave" className="text-sm">
              שמירה אוטומטית
            </label>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input
              type="checkbox"
              id="confirmActions"
              checked={preferences.confirmActions}
              onChange={() => handleCheckboxChange('confirmActions')}
            />
            <label htmlFor="confirmActions" className="text-sm">
              אישור פעולות מסוכנות
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              פריטים בעמוד
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={preferences.itemsPerPage.toString()}
              onChange={e => handleItemsPerPageChange(e.target.value)}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            {saveStatus && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  saveStatus.type === 'success'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {saveStatus.type === 'success' && <Check className="h-4 w-4" />}
                <span>{saveStatus.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
