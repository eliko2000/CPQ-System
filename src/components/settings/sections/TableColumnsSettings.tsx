import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TABLE_COLUMN_DEFINITIONS,
  getDefaultVisibleColumns,
} from '@/constants/settings';
import { loadSetting, saveSetting } from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

export function TableColumnsSettings() {
  const { currentTeam } = useTeam();
  const [activeTable, setActiveTable] = useState<
    'component_library' | 'bom_grid' | 'quotation_data_grid'
  >('component_library');
  const [isLoading, setIsLoading] = useState(true);
  const [tableSettings, setTableSettings] = useState({
    component_library: getDefaultVisibleColumns('component_library'),
    bom_grid: getDefaultVisibleColumns('bom_grid'),
    quotation_data_grid: getDefaultVisibleColumns('quotation_data_grid'),
  });

  // Load table settings from Supabase on mount
  useEffect(() => {
    async function loadTableSettings() {
      setIsLoading(true);
      try {
        const result = await loadSetting<{
          component_library: string[];
          bom_grid: string[];
          quotation_data_grid: string[];
        }>('tableColumns', currentTeam?.id);

        if (result.success && result.data) {
          setTableSettings(result.data);
        } else {
          // Use defaults
          setTableSettings({
            component_library: getDefaultVisibleColumns('component_library'),
            bom_grid: getDefaultVisibleColumns('bom_grid'),
            quotation_data_grid: getDefaultVisibleColumns(
              'quotation_data_grid'
            ),
          });
        }
      } catch (error) {
        logger.error('Error loading table settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadTableSettings();
  }, [currentTeam?.id]);

  const tableNames = {
    component_library: 'ספריית רכיבים',
    bom_grid: 'טבלת תמחור',
    quotation_data_grid: 'טבלת הצעות מחיר',
  };

  const handleToggleColumn = async (
    tableType: typeof activeTable,
    columnId: string
  ) => {
    const currentColumns = tableSettings[tableType] || [];
    const updatedColumns = currentColumns.includes(columnId)
      ? currentColumns.filter(id => id !== columnId)
      : [...currentColumns, columnId];

    const updatedSettings = {
      ...tableSettings,
      [tableType]: updatedColumns,
    };

    setTableSettings(updatedSettings);

    // Save to Supabase with team scope
    try {
      await saveSetting('tableColumns', updatedSettings, currentTeam?.id);
      // Notify grids that table column settings have changed
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'));
    } catch (error) {
      logger.error('Error saving table column settings:', error);
    }
  };

  const handleResetTable = async (tableType: typeof activeTable) => {
    const defaultColumns = getDefaultVisibleColumns(tableType);
    const updatedSettings = {
      ...tableSettings,
      [tableType]: defaultColumns,
    };

    setTableSettings(updatedSettings);

    // Save to Supabase with team scope
    try {
      await saveSetting('tableColumns', updatedSettings, currentTeam?.id);
      // Notify grids that table column settings have changed
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'));
    } catch (error) {
      logger.error('Error saving table column settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>עמודות ברירת מחדל לטבלאות</CardTitle>
            <CardDescription>
              בחר אילו עמודות יוצגו כברירת מחדל בכל טבלה
            </CardDescription>
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
          <CardTitle>עמודות ברירת מחדל לטבלאות</CardTitle>
          <CardDescription>
            בחר אילו עמודות יוצגו כברירת מחדל בכל טבלה
          </CardDescription>
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
              {TABLE_COLUMN_DEFINITIONS[activeTable].map(column => {
                const isVisible =
                  tableSettings[activeTable]?.includes(column.id) ??
                  column.defaultVisible;
                return (
                  <div
                    key={column.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isVisible ? 'bg-primary/5 border-primary' : 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`${activeTable}-${column.id}`}
                        checked={isVisible}
                        onChange={() =>
                          handleToggleColumn(activeTable, column.id)
                        }
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
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
