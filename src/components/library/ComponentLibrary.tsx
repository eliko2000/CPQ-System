import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Package,
  Plus,
  Search,
  DollarSign,
  Building,
  Calendar,
  Sparkles,
  Layers,
  Briefcase,
} from 'lucide-react';
import { useCPQ } from '../../contexts/CPQContext';
import { Component, Assembly } from '../../types';
import { LaborType } from '../../types/labor.types';
import { ComponentForm } from './ComponentForm';
import { AssemblyForm } from './AssemblyForm';
import { AssemblyGrid } from './AssemblyGrid';
import { LaborTypeForm } from '../labor/LaborTypeForm';
import { LaborTypeList } from '../labor/LaborTypeList';
import { EnhancedComponentGrid } from './EnhancedComponentGrid';
import { SmartImportWizard } from '../shared/SmartImportWizard';
import { useLaborTypes } from '../../hooks/useLaborTypes';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function ComponentLibrary() {
  const {
    components,
    assemblies,
    updateComponent,
    deleteComponent,
    deleteAssembly,
    setModal,
    modalState,
    closeModal,
  } = useCPQ();
  const {
    laborTypes,
    deleteLaborType,
    reload: reloadLaborTypes,
  } = useLaborTypes();
  const [activeTab, setActiveTab] = useState<
    'components' | 'assemblies' | 'labor'
  >('components');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(
    null
  );
  const [isAssemblyFormOpen, setIsAssemblyFormOpen] = useState(false);
  const [selectedLaborType, setSelectedLaborType] = useState<LaborType | null>(
    null
  );
  const [isLaborFormOpen, setIsLaborFormOpen] = useState(false);

  // Handle inline component updates
  const handleComponentUpdate = useCallback(
    async (componentId: string, field: string, value: any) => {
      try {
        logger.debug('🎯 ComponentLibrary.handleComponentUpdate called:', {
          componentId,
          field,
          value,
        });
        const component = components.find(c => c.id === componentId);
        if (component) {
          logger.debug('🎯 Found component:', component);
          logger.debug('🎯 Creating update object:', { [field]: value });
          await updateComponent(componentId, { [field]: value });
          logger.debug('🎯 Update completed successfully');
        } else {
          logger.error('❌ Component not found:', componentId);
        }
      } catch (error) {
        logger.error('❌ Failed to update component:', error);
      }
    },
    [components, updateComponent]
  );

  // Filter components based on search only
  const filteredComponents = useMemo(() => {
    return components.filter(component => {
      const matchesSearch =
        searchTerm === '' ||
        component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.manufacturer
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        component.manufacturerPN
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        component.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        component.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.productType
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        component.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [components, searchTerm]);

  // Filter labor types based on search
  const filteredLaborTypes = useMemo(() => {
    if (searchTerm === '') return laborTypes;
    return laborTypes.filter(laborType => {
      const searchLower = searchTerm.toLowerCase();
      return (
        laborType.name.toLowerCase().includes(searchLower) ||
        laborType.description?.toLowerCase().includes(searchLower) ||
        laborType.laborSubtype.toLowerCase().includes(searchLower)
      );
    });
  }, [laborTypes, searchTerm]);

  const handleAddComponent = () => {
    setModal({ type: 'add-component', data: null });
  };

  const handleEditComponent = (component: Component) => {
    setModal({ type: 'edit-component', data: component });
  };

  const handleDuplicateComponent = (component: Component) => {
    // Create a duplicate without an ID so the form treats it as new
    const duplicatedComponent = {
      name: `${component.name} (העתק)`,
      description: component.description || '',
      category: component.category,
      productType: component.productType || '',
      manufacturer: component.manufacturer,
      manufacturerPN: component.manufacturerPN,
      supplier: component.supplier,
      unitCostNIS: component.unitCostNIS,
      unitCostUSD: component.unitCostUSD || 0,
      currency: component.currency || 'NIS',
      originalCost: component.originalCost || component.unitCostNIS,
      quoteDate: component.quoteDate || new Date().toISOString().split('T')[0],
      notes: component.notes || '',
    };
    setModal({ type: 'add-component', data: duplicatedComponent });
  };

  // Assembly handlers
  const handleAddAssembly = () => {
    setSelectedAssembly(null);
    setIsAssemblyFormOpen(true);
  };

  const handleEditAssembly = (assembly: Assembly) => {
    setSelectedAssembly(assembly);
    setIsAssemblyFormOpen(true);
  };

  const handleDeleteAssembly = async (
    assemblyId: string,
    assemblyName: string
  ) => {
    if (
      window.confirm(`האם אתה בטוח שברצונך למחוק את ההרכבה "${assemblyName}"?`)
    ) {
      try {
        await deleteAssembly(assemblyId);
        toast.success('ההרכבה נמחקה בהצלחה');
      } catch (error) {
        toast.error('שגיאה במחיקת הרכבה');
      }
    }
  };

  // Labor handlers
  const handleAddLaborType = () => {
    setSelectedLaborType(null);
    setIsLaborFormOpen(true);
  };

  const handleEditLaborType = (laborType: LaborType) => {
    setSelectedLaborType(laborType);
    setIsLaborFormOpen(true);
  };

  const handleDeleteLaborType = async (id: string, name: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את סוג העבודה "${name}"?`)) {
      try {
        await deleteLaborType(id);
        toast.success('סוג העבודה נמחק בהצלחה');
      } catch (error) {
        toast.error('שגיאה במחיקת סוג העבודה');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ספריית רכיבים</h1>
          <p className="text-muted-foreground">
            נהל את הרכיבים, האסמבלים וסוגי העבודה שלך ({components.length}{' '}
            רכיבים, {assemblies.length} הרכבות, {laborTypes.length} סוגי עבודה)
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'components' && (
            <Button
              variant="outline"
              onClick={() => setIsAIImportOpen(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              ייבוא חכם
            </Button>
          )}
          {activeTab === 'components' ? (
            <Button onClick={handleAddComponent}>
              <Plus className="h-4 w-4 ml-2" />
              הוסף רכיב
            </Button>
          ) : activeTab === 'assemblies' ? (
            <Button onClick={handleAddAssembly}>
              <Plus className="h-4 w-4 ml-2" />
              הוסף הרכבה
            </Button>
          ) : (
            <Button onClick={handleAddLaborType}>
              <Plus className="h-4 w-4 ml-2" />
              הוסף סוג עבודה
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={v =>
          setActiveTab(v as 'components' | 'assemblies' | 'labor')
        }
      >
        <TabsList>
          <TabsTrigger value="components" className="gap-2">
            <Package className="h-4 w-4" />
            רכיבים ({components.length})
          </TabsTrigger>
          <TabsTrigger value="assemblies" className="gap-2">
            <Layers className="h-4 w-4" />
            הרכבות ({assemblies.length})
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2">
            <Briefcase className="h-4 w-4" />
            סוגי עבודה ({laborTypes.length})
          </TabsTrigger>
        </TabsList>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                dir="ltr"
                style={{ direction: 'ltr', textAlign: 'right' }}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="pr-10"
              />
              {!searchTerm && (
                <span
                  dir="rtl"
                  className="absolute inset-y-0 right-10 left-0 flex items-center text-sm text-muted-foreground pointer-events-none overflow-hidden"
                >
                  חיפוש לפי שם, יצרן, מקט, קטגוריה, סוג מוצר, ספק...
                </span>
              )}
            </div>
          </div>

          {/* Enhanced Grid */}
          {filteredComponents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm
                    ? 'לא נמצאו רכיבים תואמים'
                    : 'אין רכיבים שנוספו עדיין'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? 'נסה לשנות את תנאי החיפוש'
                    : 'התחל בהוספת הרכיב הראשון שלך לספרייה'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddComponent}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף רכיב ראשון
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <EnhancedComponentGrid
              components={filteredComponents}
              onEdit={handleEditComponent}
              onDelete={deleteComponent}
              onDuplicate={handleDuplicateComponent}
              onComponentUpdate={handleComponentUpdate}
            />
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    סה"כ רכיבים
                  </span>
                </div>
                <p className="text-2xl font-bold">{components.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    ספקים
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {new Set(components.map(c => c.supplier)).size}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    ערך ממוצע
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {components.length > 0
                    ? formatCurrency(
                        components.reduce((sum, c) => sum + c.unitCostNIS, 0) /
                          components.length
                      )
                    : '$0'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    עודכן לאחרונה
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {components.length > 0
                    ? new Date(
                        Math.max(
                          ...components.map(c =>
                            new Date(c.updatedAt).getTime()
                          )
                        )
                      ).toLocaleDateString('he-IL')
                    : '-'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assemblies Tab */}
        <TabsContent value="assemblies" className="space-y-4">
          <AssemblyGrid
            assemblies={assemblies}
            onEdit={handleEditAssembly}
            onDelete={handleDeleteAssembly}
          />
        </TabsContent>

        {/* Labor Types Tab */}
        <TabsContent value="labor" className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                dir="ltr"
                style={{ direction: 'ltr', textAlign: 'right' }}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="pr-10"
              />
              {!searchTerm && (
                <span
                  dir="rtl"
                  className="absolute inset-y-0 right-10 left-0 flex items-center text-sm text-muted-foreground pointer-events-none overflow-hidden"
                >
                  חיפוש לפי שם, קטגוריה, תיאור...
                </span>
              )}
            </div>
          </div>

          {/* Labor Grid */}
          {filteredLaborTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm
                    ? 'לא נמצאו סוגי עבודה תואמים'
                    : 'אין סוגי עבודה שנוספו עדיין'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? 'נסה לשנות את תנאי החיפוש'
                    : 'התחל בהוספת סוג העבודה הראשון שלך'}
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddLaborType}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף סוג עבודה ראשון
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <LaborTypeList
              laborTypes={filteredLaborTypes}
              onEdit={handleEditLaborType}
              onDelete={handleDeleteLaborType}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Component Form Modal */}
      <ComponentForm
        component={
          modalState?.type === 'edit-component' ||
          modalState?.type === 'add-component'
            ? modalState.data
            : null
        }
        isOpen={
          modalState?.type === 'add-component' ||
          modalState?.type === 'edit-component'
        }
        onClose={closeModal}
      />

      {/* Assembly Form Modal */}
      <AssemblyForm
        assembly={selectedAssembly}
        isOpen={isAssemblyFormOpen}
        onClose={() => {
          setIsAssemblyFormOpen(false);
          setSelectedAssembly(null);
        }}
      />

      {/* Labor Type Form Modal */}
      <LaborTypeForm
        laborType={selectedLaborType}
        isOpen={isLaborFormOpen}
        onClose={() => {
          setIsLaborFormOpen(false);
          setSelectedLaborType(null);
          // Reload labor types to show newly added/edited items
          reloadLaborTypes();
        }}
      />

      {/* Smart Import Wizard - Unified import with duplicate detection */}
      <SmartImportWizard
        isOpen={isAIImportOpen}
        onClose={() => setIsAIImportOpen(false)}
      />
    </div>
  );
}
