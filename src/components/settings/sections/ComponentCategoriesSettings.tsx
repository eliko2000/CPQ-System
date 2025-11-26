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
import { Loader2, Edit2, Trash2 } from 'lucide-react';
import {
  DEFAULT_COMPONENT_CATEGORIES,
  notifyCategoriesUpdated,
} from '@/constants/settings';
import { CategoryMigrationDialog } from '../../ui/CategoryMigrationDialog';
import { useCPQ } from '@/contexts/CPQContext';
import {
  loadSetting,
  saveSetting,
  migrateLocalStorageToSupabase,
} from '@/services/settingsService';
import { logger } from '@/lib/logger';

export function ComponentCategoriesSettings() {
  const { components, updateComponent } = useCPQ();
  const [categories, setCategories] = useState<string[]>([
    ...DEFAULT_COMPONENT_CATEGORIES,
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{
    index: number;
    oldName: string;
    newName: string;
  } | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [migrationDialog, setMigrationDialog] = useState<{
    isOpen: boolean;
    categoryToDelete: string;
    componentCount: number;
  }>({
    isOpen: false,
    categoryToDelete: '',
    componentCount: 0,
  });

  // Load categories from Supabase on mount
  useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      try {
        // First, migrate any old localStorage settings
        await migrateLocalStorageToSupabase();

        // Load from Supabase
        const result = await loadSetting<{ categories: string[] }>(
          'componentCategories'
        );
        if (result.success && result.data?.categories) {
          setCategories(result.data.categories);
        } else {
          // No settings found, use defaults
          setCategories([...DEFAULT_COMPONENT_CATEGORIES]);
        }
      } catch (error) {
        logger.error('Error loading categories:', error);
        setCategories([...DEFAULT_COMPONENT_CATEGORIES]);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  const updateCategoriesInStorage = async (updatedCategories: string[]) => {
    try {
      // Save to Supabase (also caches in localStorage)
      await saveSetting('componentCategories', {
        categories: updatedCategories,
      });
      notifyCategoriesUpdated();
    } catch (error) {
      logger.error('Error saving categories:', error);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      setNewCategory('');
      updateCategoriesInStorage(updatedCategories);
    }
  };

  const handleStartEdit = (index: number, categoryName: string) => {
    setEditingCategory({
      index,
      oldName: categoryName,
      newName: categoryName,
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.newName.trim()) return;

    const newName = editingCategory.newName.trim();
    const oldName = editingCategory.oldName;

    // Check if name already exists (and it's not the same category)
    if (newName !== oldName && categories.includes(newName)) {
      alert('קטגוריה בשם זה כבר קיימת');
      return;
    }

    setIsSavingRename(true);
    try {
      // Update all components with the old category to the new category name
      const componentsToUpdate = components.filter(c => c.category === oldName);

      if (componentsToUpdate.length > 0) {
        for (const component of componentsToUpdate) {
          await updateComponent(component.id, { category: newName });
        }
      }

      // Update the category in the list
      const updatedCategories = [...categories];
      updatedCategories[editingCategory.index] = newName;
      setCategories(updatedCategories);
      updateCategoriesInStorage(updatedCategories);

      setEditingCategory(null);
    } catch (error) {
      logger.error('Error renaming category:', error);
      alert('שגיאה בשינוי שם הקטגוריה. אנא נסה שוב.');
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleDeleteCategoryClick = (category: string) => {
    // Count components with this category
    const componentsInCategory = components.filter(
      c => c.category === category
    );

    setMigrationDialog({
      isOpen: true,
      categoryToDelete: category,
      componentCount: componentsInCategory.length,
    });
  };

  const handleConfirmDelete = async (targetCategory: string) => {
    const categoryToDelete = migrationDialog.categoryToDelete;

    // Migrate all components from deleted category to target category
    const componentsToMigrate = components.filter(
      c => c.category === categoryToDelete
    );

    try {
      // Update all components with the deleted category to the new category
      for (const component of componentsToMigrate) {
        await updateComponent(component.id, { category: targetCategory });
      }

      // Remove the category from the list
      const updatedCategories = categories.filter(c => c !== categoryToDelete);
      setCategories(updatedCategories);
      updateCategoriesInStorage(updatedCategories);

      // Close dialog
      setMigrationDialog({
        isOpen: false,
        categoryToDelete: '',
        componentCount: 0,
      });
    } catch (error) {
      logger.error('Error migrating components:', error);
      alert('שגיאה בהעברת הרכיבים. אנא נסה שוב.');
    }
  };

  const handleCancelDelete = () => {
    setMigrationDialog({
      isOpen: false,
      categoryToDelete: '',
      componentCount: 0,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const updatedCategories = [...categories];
      [updatedCategories[index - 1], updatedCategories[index]] = [
        updatedCategories[index],
        updatedCategories[index - 1],
      ];
      setCategories(updatedCategories);
      updateCategoriesInStorage(updatedCategories);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < categories.length - 1) {
      const updatedCategories = [...categories];
      [updatedCategories[index], updatedCategories[index + 1]] = [
        updatedCategories[index + 1],
        updatedCategories[index],
      ];
      setCategories(updatedCategories);
      updateCategoriesInStorage(updatedCategories);
    }
  };

  const availableCategoriesForMigration = categories.filter(
    c => c !== migrationDialog.categoryToDelete
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>קטגוריות רכיבים</CardTitle>
            <CardDescription>
              ניהול רשימת הקטגוריות לרכיבים במערכת
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
            <CardDescription>
              ניהול רשימת הקטגוריות לרכיבים במערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="הוסף קטגוריה חדשה"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
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
                        onChange={e =>
                          setEditingCategory({
                            ...editingCategory,
                            newName: e.target.value,
                          })
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={isSavingRename}
                      >
                        {isSavingRename ? 'שומר...' : 'שמור'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
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
  );
}
