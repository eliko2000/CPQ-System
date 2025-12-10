import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Download, Loader2 } from 'lucide-react';
import {
  loadSetting,
  saveSetting,
  migrateLocalStorageToSupabase,
} from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

export function PricingSettings() {
  const { currentTeam } = useTeam();
  const [isLoading, setIsLoading] = useState(true);
  const [pricingSettings, setPricingSettings] = useState({
    usdToIlsRate: 3.7,
    eurToIlsRate: 4.0,
    autoUpdateRates: false,
    defaultMarkup: 0.75,
    defaultRisk: 5,
    dayWorkCost: 1200,
    vatRate: 17,
    deliveryTime: '4-6 שבועות',
  });

  // Load pricing settings from Supabase on mount
  useEffect(() => {
    async function loadPricingSettings() {
      setIsLoading(true);
      try {
        // First, migrate any old localStorage settings
        await migrateLocalStorageToSupabase();

        // Load from Supabase with team scope
        const result = await loadSetting<typeof pricingSettings>(
          'pricing',
          currentTeam?.id
        );
        if (result.success && result.data) {
          setPricingSettings(result.data);
        }
      } catch (error) {
        logger.error('Error loading pricing settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPricingSettings();
  }, [currentTeam?.id]);

  // Auto-save to Supabase whenever settings change
  const savePricingSettings = async (
    updatedSettings: typeof pricingSettings
  ) => {
    try {
      await saveSetting('pricing', updatedSettings, currentTeam?.id);
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'));
    } catch (error) {
      logger.error('Error saving pricing settings:', error);
    }
  };

  const handleChange = (field: keyof typeof pricingSettings, value: any) => {
    const updatedSettings = {
      ...pricingSettings,
      [field]: value,
    };
    setPricingSettings(updatedSettings);
    // Auto-save on change
    savePricingSettings(updatedSettings);
  };

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
    );
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
              <label className="block text-sm font-medium mb-2">
                דולר לשקל (USD/ILS)
              </label>
              <Input
                type="number"
                step="0.01"
                value={pricingSettings.usdToIlsRate}
                onChange={e =>
                  handleChange('usdToIlsRate', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                אירו לשקל (EUR/ILS)
              </label>
              <Input
                type="number"
                step="0.01"
                value={pricingSettings.eurToIlsRate}
                onChange={e =>
                  handleChange('eurToIlsRate', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <input
              type="checkbox"
              id="autoUpdate"
              checked={pricingSettings.autoUpdateRates}
              onChange={e => handleChange('autoUpdateRates', e.target.checked)}
            />
            <label htmlFor="autoUpdate" className="text-sm">
              עדכון אוטומטי מדי יום
            </label>
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
              <label className="block text-sm font-medium mb-2">
                מקדם רווח ברירת מחדל (0-1)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={pricingSettings.defaultMarkup}
                onChange={e => {
                  const value = parseFloat(e.target.value) || 0;
                  // Round to 2 decimal places
                  const rounded = Math.round(value * 100) / 100;
                  handleChange('defaultMarkup', rounded);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                אחוז סיכון ברירת מחדל (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={pricingSettings.defaultRisk}
                onChange={e =>
                  handleChange('defaultRisk', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              עלות יום עבודה (₪)
            </label>
            <Input
              type="number"
              step="10"
              value={pricingSettings.dayWorkCost}
              onChange={e =>
                handleChange('dayWorkCost', parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                שיעור מע"מ (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={pricingSettings.vatRate}
                onChange={e =>
                  handleChange('vatRate', parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                זמן אספקה ברירת מחדל
              </label>
              <Input
                value={pricingSettings.deliveryTime}
                onChange={e => handleChange('deliveryTime', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
