import { QuotationProject } from '../../types';
import { Button } from '../ui/button';
import { LogOut, FolderOpen } from 'lucide-react';

interface QuotationHeaderProps {
  quotation: QuotationProject;
  onClose: () => void;
  onProjectPickerOpen: () => void;
}

export function QuotationHeader({
  quotation,
  onClose,
  onProjectPickerOpen,
}: QuotationHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900">{quotation.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-gray-600">{quotation.customerName}</p>
          {quotation.projectName && (
            <>
              <span className="text-gray-400">|</span>
              <p className="text-gray-600">{quotation.projectName}</p>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onProjectPickerOpen}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
            title="בחר פרויקט"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="text-xs">שנה פרויקט</span>
          </Button>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          חזור לרשימה
        </Button>
      </div>
    </div>
  );
}
