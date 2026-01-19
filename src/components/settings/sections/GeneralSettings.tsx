import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Eye, EyeOff, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { loadSetting, saveSetting } from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

export function GeneralSettings() {
  const { currentTeam } = useTeam();
  // State for Anthropic API key management
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // State for Tavily API key management
  const [tavilyApiKey, setTavilyApiKey] = useState<string>('');
  const [showTavilyApiKey, setShowTavilyApiKey] = useState(false);
  const [isSavingTavily, setIsSavingTavily] = useState(false);
  const [isTestingTavily, setIsTestingTavily] = useState(false);
  const [tavilyTestStatus, setTavilyTestStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [tavilySaveStatus, setTavilySaveStatus] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Load API keys on mount
  useEffect(() => {
    loadApiKey();
    loadTavilyApiKey();
  }, [currentTeam?.id]);

  const loadApiKey = async () => {
    try {
      const result = await loadSetting<{ apiKey: string }>(
        'anthropicApiKey',
        currentTeam?.id
      );
      if (result.success && result.data?.apiKey) {
        setApiKey(result.data.apiKey);
      }
    } catch (error) {
      logger.error('Error loading API key:', error);
    }
  };

  const loadTavilyApiKey = async () => {
    try {
      const result = await loadSetting<{ apiKey: string }>(
        'tavilyApiKey',
        currentTeam?.id
      );
      if (result.success && result.data?.apiKey) {
        setTavilyApiKey(result.data.apiKey);
      }
    } catch (error) {
      logger.error('Error loading Tavily API key:', error);
    }
  };

  const handleSaveApiKey = async () => {
    setSaveStatus(null);

    if (!apiKey.trim()) {
      setSaveStatus({ message: 'נא להזין מפתח API', type: 'error' });
      return;
    }

    // Validate format
    if (!apiKey.startsWith('sk-ant-')) {
      setSaveStatus({
        message: 'מפתח API לא תקין. צריך להתחיל ב-sk-ant-',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveSetting(
        'anthropicApiKey',
        {
          apiKey: apiKey.trim(),
        },
        currentTeam?.id
      );

      if (result.success) {
        setSaveStatus({ message: 'מפתח API נשמר בהצלחה', type: 'success' });
        // Dispatch event to notify Claude AI service
        window.dispatchEvent(new CustomEvent('cpq-api-key-updated'));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      } else {
        setSaveStatus({
          message: 'שגיאה בשמירת מפתח API: ' + result.error,
          type: 'error',
        });
      }
    } catch (error) {
      logger.error('Error saving API key:', error);
      setSaveStatus({ message: 'שגיאה בשמירת מפתח API', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setSaveStatus({ message: 'נא להזין מפתח API תחילה', type: 'error' });
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    setSaveStatus(null);

    try {
      // Simple test: Initialize Anthropic client and check if it works
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
      });

      // Try to send a minimal request
      await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });

      setTestStatus('success');
      setSaveStatus({ message: 'התחברות למערכת AI הצליחה!', type: 'success' });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (error: any) {
      setTestStatus('error');
      logger.error('API test failed:', error);

      if (error.status === 401) {
        setSaveStatus({ message: 'מפתח API לא תקין', type: 'error' });
      } else if (error.status === 429) {
        setSaveStatus({ message: 'חרגת ממכסת השימוש', type: 'error' });
      } else {
        setSaveStatus({
          message: 'שגיאה בחיבור: ' + error.message,
          type: 'error',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveTavilyApiKey = async () => {
    setTavilySaveStatus(null);

    if (!tavilyApiKey.trim()) {
      setTavilySaveStatus({ message: 'נא להזין מפתח API', type: 'error' });
      return;
    }

    // Validate format - Tavily keys start with "tvly-"
    if (!tavilyApiKey.startsWith('tvly-')) {
      setTavilySaveStatus({
        message: 'מפתח API לא תקין. צריך להתחיל ב-tvly-',
        type: 'error',
      });
      return;
    }

    setIsSavingTavily(true);

    try {
      const result = await saveSetting(
        'tavilyApiKey',
        {
          apiKey: tavilyApiKey.trim(),
        },
        currentTeam?.id
      );

      if (result.success) {
        setTavilySaveStatus({
          message: 'מפתח API נשמר בהצלחה',
          type: 'success',
        });
        // Dispatch event to notify services (include team ID for team-scoped settings)
        window.dispatchEvent(
          new CustomEvent('cpq-tavily-api-key-updated', {
            detail: { teamId: currentTeam?.id },
          })
        );

        // Clear success message after 3 seconds
        setTimeout(() => {
          setTavilySaveStatus(null);
        }, 3000);
      } else {
        setTavilySaveStatus({
          message: 'שגיאה בשמירת מפתח API: ' + result.error,
          type: 'error',
        });
      }
    } catch (error) {
      logger.error('Error saving Tavily API key:', error);
      setTavilySaveStatus({ message: 'שגיאה בשמירת מפתח API', type: 'error' });
    } finally {
      setIsSavingTavily(false);
    }
  };

  const handleTestTavilyConnection = async () => {
    if (!tavilyApiKey.trim()) {
      setTavilySaveStatus({
        message: 'נא להזין מפתח API תחילה',
        type: 'error',
      });
      return;
    }

    setIsTestingTavily(true);
    setTavilyTestStatus('idle');
    setTavilySaveStatus(null);

    try {
      // Test Tavily API with a simple search
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: tavilyApiKey.trim(),
          query: 'test connection',
          max_results: 1,
        }),
      });

      if (response.ok) {
        setTavilyTestStatus('success');
        setTavilySaveStatus({
          message: 'התחברות ל-Tavily הצליחה!',
          type: 'success',
        });

        // Clear success message after 3 seconds
        setTimeout(() => {
          setTavilySaveStatus(null);
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      setTavilyTestStatus('error');
      logger.error('Tavily API test failed:', error);

      if (
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized')
      ) {
        setTavilySaveStatus({ message: 'מפתח API לא תקין', type: 'error' });
      } else if (error.message?.includes('429')) {
        setTavilySaveStatus({ message: 'חרגת ממכסת השימוש', type: 'error' });
      } else {
        setTavilySaveStatus({
          message: 'שגיאה בחיבור: ' + error.message,
          type: 'error',
        });
      }
    } finally {
      setIsTestingTavily(false);
    }
  };

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
              <label className="block text-sm font-medium mb-2">
                שם המערכת
              </label>
              <Input defaultValue="RadiaQ AI" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                גרסת מערכת
              </label>
              <Input defaultValue="1.0.0" disabled />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              תיאור מערכת
            </label>
            <Input defaultValue="מערכת CPQ חכמה לניהול הצעות מחיר לפרויקטי רובוטיקה" />
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
              <select className="w-full p-2 border rounded-md">
                <option value="Asia/Jerusalem">ישראל (GMT+2)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">ניו יורק (GMT-5)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                פורמט תאריך
              </label>
              <select className="w-full p-2 border rounded-md">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הגדרות AI Vision</CardTitle>
          <CardDescription>
            הגדרות Anthropic Claude API לעיבוד מסמכים חכם
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              מפתח API של Anthropic Claude
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={isTesting || !apiKey.trim()}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    בודק...
                  </>
                ) : (
                  <>
                    {testStatus === 'success' && (
                      <Check className="h-4 w-4 ml-2 text-green-600" />
                    )}
                    {testStatus === 'error' && (
                      <X className="h-4 w-4 ml-2 text-red-600" />
                    )}
                    {testStatus === 'idle' && (
                      <AlertCircle className="h-4 w-4 ml-2" />
                    )}
                    בדוק חיבור
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveApiKey}
                disabled={isSaving || !apiKey.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור'
                )}
              </Button>
            </div>
            {/* Status Message Area */}
            <div className="min-h-[24px] mt-2">
              {saveStatus ? (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    saveStatus.type === 'success'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {saveStatus.type === 'success' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{saveStatus.message}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  המפתח נשמר באופן מאובטח ומאפשר עיבוד מסמכים באמצעות AI Vision
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>חיפוש מידע על רכיבים (Tavily)</CardTitle>
          <CardDescription>
            חיפוש אוטומטי של מידע על רכיבים לא מזוהים - עוזר לזהות סוג הרכיב לפי
            מספר קטלוגי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              מפתח API של Tavily
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showTavilyApiKey ? 'text' : 'password'}
                  value={tavilyApiKey}
                  onChange={e => setTavilyApiKey(e.target.value)}
                  placeholder="tvly-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTavilyApiKey(!showTavilyApiKey)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showTavilyApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleTestTavilyConnection}
                variant="outline"
                disabled={isTestingTavily || !tavilyApiKey.trim()}
              >
                {isTestingTavily ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    בודק...
                  </>
                ) : (
                  <>
                    {tavilyTestStatus === 'success' && (
                      <Check className="h-4 w-4 ml-2 text-green-600" />
                    )}
                    {tavilyTestStatus === 'error' && (
                      <X className="h-4 w-4 ml-2 text-red-600" />
                    )}
                    {tavilyTestStatus === 'idle' && (
                      <AlertCircle className="h-4 w-4 ml-2" />
                    )}
                    בדוק חיבור
                  </>
                )}
              </Button>
              <Button
                onClick={handleSaveTavilyApiKey}
                disabled={isSavingTavily || !tavilyApiKey.trim()}
              >
                {isSavingTavily ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור'
                )}
              </Button>
            </div>
            {/* Status Message Area */}
            <div className="min-h-[24px] mt-2">
              {tavilySaveStatus ? (
                <div
                  className={`flex items-center gap-2 text-sm ${
                    tavilySaveStatus.type === 'success'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {tavilySaveStatus.type === 'success' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{tavilySaveStatus.message}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  הרשמה חינמית ב-tavily.com (1,000 חיפושים/חודש). עוזר לזהות
                  רכיבים לפי מספר קטלוגי.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
