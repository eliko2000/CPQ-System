import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Search, Briefcase } from 'lucide-react';
import { useLaborTypes } from '../../hooks/useLaborTypes';
import { LaborType } from '../../types/labor.types';
import { LaborTypeForm } from './LaborTypeForm';
import { LaborTypeGrid } from './LaborTypeGrid';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { toast } from 'sonner';

export function LaborTypesPage() {
  const { laborTypes, loading, deleteLaborType } = useLaborTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLaborType, setSelectedLaborType] = useState<LaborType | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    laborTypeId: string | null;
    laborTypeName: string;
  }>({
    isOpen: false,
    laborTypeId: null,
    laborTypeName: '',
  });

  // Filter labor types based on search
  const filteredLaborTypes = laborTypes.filter(laborType => {
    if (searchTerm === '') return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      laborType.name.toLowerCase().includes(searchLower) ||
      laborType.description?.toLowerCase().includes(searchLower) ||
      laborType.laborSubtype.toLowerCase().includes(searchLower)
    );
  });

  // Statistics
  const stats = {
    total: laborTypes.length,
    internal: laborTypes.filter(lt => lt.isInternalLabor).length,
    external: laborTypes.filter(lt => !lt.isInternalLabor).length,
  };

  const handleAddLaborType = () => {
    setSelectedLaborType(null);
    setIsFormOpen(true);
  };

  const handleEditLaborType = (laborType: LaborType) => {
    setSelectedLaborType(laborType);
    setIsFormOpen(true);
  };

  const handleDeleteLaborType = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      laborTypeId: id,
      laborTypeName: name,
    });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.laborTypeId) {
      try {
        await deleteLaborType(deleteConfirm.laborTypeId);
        toast.success('סוג העבודה נמחק בהצלחה');
      } catch (error) {
        toast.error('שגיאה במחיקת סוג העבודה');
      } finally {
        setDeleteConfirm({
          isOpen: false,
          laborTypeId: null,
          laborTypeName: '',
        });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, laborTypeId: null, laborTypeName: '' });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedLaborType(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-600" />
            סוגי עבודה
          </h1>
          <p className="text-gray-500 mt-1">
            ניהול סוגי עבודה פנימיים וחיצוניים
          </p>
        </div>
        <Button
          onClick={handleAddLaborType}
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          הוסף סוג עבודה
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">סה"כ סוגי עבודה</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Briefcase className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">עבודה פנימית</p>
                <p className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                  <span className="text-xl">🏢</span>
                  {stats.internal}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">עבודה חיצונית</p>
                <p className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  {stats.external}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש סוגי עבודה..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              מציג {filteredLaborTypes.length} מתוך {stats.total} סוגי עבודה
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labor Types Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">טוען סוגי עבודה...</p>
            </div>
          ) : filteredLaborTypes.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? 'לא נמצאו סוגי עבודה התואמים לחיפוש'
                  : 'אין סוגי עבודה עדיין. התחל בהוספת סוג עבודה ראשון.'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={handleAddLaborType}
                  className="mt-4 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-5 w-5" />
                  הוסף סוג עבודה ראשון
                </Button>
              )}
            </div>
          ) : (
            <div className="h-[600px]">
              <LaborTypeGrid
                laborTypes={filteredLaborTypes}
                onEdit={handleEditLaborType}
                onDelete={handleDeleteLaborType}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labor Type Form Modal */}
      <LaborTypeForm
        laborType={selectedLaborType}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="אישור מחיקה"
        message={`האם אתה בטוח שברצונך למחוק את סוג העבודה "${deleteConfirm.laborTypeName}"?`}
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
}
