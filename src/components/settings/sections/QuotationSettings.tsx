import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Upload, Loader2, Trash2 } from 'lucide-react';
import { loadSetting, saveSetting } from '@/services/settingsService';
import { logger } from '@/lib/logger';

export function QuotationSettings() {
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      const { uploadFile } = await import('../../../utils/storageHelpers');

      const result = await uploadFile(file, 'company-logo', 'company-assets');

      if (result.success && result.url) {
        setLogoUrl(result.url);
        // Save to settings
        await saveSetting('companyLogo', { logoUrl: result.url });
        // Dispatch event to notify other components
        window.dispatchEvent(
          new CustomEvent('cpq-logo-updated', {
            detail: { logoUrl: result.url },
          })
        );
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
      const { deleteFile } = await import('../../../utils/storageHelpers');

      await deleteFile('company-logo', 'company-assets');
      setLogoUrl(null);
      // Clear from settings
      await saveSetting('companyLogo', { logoUrl: null });
      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent('cpq-logo-updated', { detail: { logoUrl: null } })
      );
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
            <label className="block text-sm font-medium mb-2">
              כותרת הצעת מחיר
            </label>
            <Input defaultValue="הצעת מחיר - {{project_name}}" />
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
                    <p className="text-xs text-muted-foreground">
                      הלוגו יוצג בראש הצעות המחיר
                    </p>
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
              <label className="block text-sm font-medium mb-2">
                כותרת תחתונה
              </label>
              <Input placeholder="תודה על אמונכם" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">חתימה</label>
              <Input placeholder="שם החותם" />
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
            <select className="w-full p-2 border rounded-md">
              <option value="net30">30 יום מקבלת חשבונית</option>
              <option value="net45">45 יום מקבלת חשבונית</option>
              <option value="net60">60 יום מקבלת חשבונית</option>
              <option value="immediate">מיידי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              תנאי אחריות
            </label>
            <Input defaultValue="שנת אחריות על חלקים ועבודה" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
