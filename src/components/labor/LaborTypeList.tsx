import { useState } from 'react';
import { LaborType } from '../../types/labor.types';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Edit2, Trash2, LayoutGrid, List } from 'lucide-react';

interface LaborTypeListProps {
  laborTypes: LaborType[];
  onEdit: (laborType: LaborType) => void;
  onDelete: (id: string, name: string) => void;
}

export function LaborTypeList({
  laborTypes,
  onEdit,
  onDelete,
}: LaborTypeListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getLaborSubtypeLabel = (subtype: string) => {
    switch (subtype) {
      case 'engineering':
        return 'תכנון';
      case 'integration':
        return 'אינטגרציה';
      case 'development':
        return 'פיתוח';
      case 'testing':
        return 'הרצה';
      case 'commissioning':
        return 'הטמעה';
      case 'support_and_training':
        return 'תמיכה והדרכה';
      default:
        return subtype;
    }
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid className="h-4 w-4 ml-1" />
          כרטיסים
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4 ml-1" />
          רשימה
        </Button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {laborTypes.map(laborType => (
            <Card
              key={laborType.id}
              className={`transition-all hover:shadow-md flex flex-col ${
                laborType.isInternalLabor
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-purple-200 bg-purple-50/50'
              }`}
            >
              <CardContent className="p-4 flex flex-col flex-1">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {laborType.isInternalLabor ? '🏢' : '👤'}
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      {laborType.name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      laborType.isInternalLabor
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {laborType.isInternalLabor ? 'פנימי' : 'חיצוני'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">תת-סוג:</span>
                    <span className="font-medium">
                      {getLaborSubtypeLabel(laborType.laborSubtype)}
                    </span>
                  </div>
                  {!laborType.isInternalLabor && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">תעריף יומי:</span>
                      <span className="font-mono font-semibold text-purple-600">
                        ₪{(laborType.externalRate || 0).toLocaleString('he-IL')}
                      </span>
                    </div>
                  )}
                  {laborType.description && (
                    <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {laborType.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(laborType)}
                    className="flex-1"
                  >
                    <Edit2 className="h-3 w-3 ml-1" />
                    ערוך
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(laborType.id, laborType.name)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 ml-1" />
                    מחק
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {laborTypes.map(laborType => (
            <Card
              key={laborType.id}
              className={`transition-all hover:shadow-sm ${
                laborType.isInternalLabor
                  ? 'border-blue-200 bg-blue-50/30'
                  : 'border-purple-200 bg-purple-50/30'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-xl">
                      {laborType.isInternalLabor ? '🏢' : '👤'}
                    </span>
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {laborType.name}
                        </div>
                        {laborType.description && (
                          <div className="text-xs text-gray-600 line-clamp-1">
                            {laborType.description}
                          </div>
                        )}
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600">סוג</div>
                        <div className="font-medium">
                          {laborType.isInternalLabor ? 'פנימי' : 'חיצוני'}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-gray-600">תת-סוג</div>
                        <div className="font-medium">
                          {getLaborSubtypeLabel(laborType.laborSubtype)}
                        </div>
                      </div>
                      {!laborType.isInternalLabor && (
                        <div className="text-sm">
                          <div className="text-gray-600">תעריף יומי</div>
                          <div className="font-mono font-semibold text-purple-600">
                            ₪
                            {(laborType.externalRate || 0).toLocaleString(
                              'he-IL'
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(laborType)}
                    >
                      <Edit2 className="h-3 w-3 ml-1" />
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(laborType.id, laborType.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 ml-1" />
                      מחק
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
