import { Assembly, Component } from '../../types';
import { ComponentForm } from '../library/ComponentForm';
import { ProjectPicker } from './ProjectPicker';
import { AssemblyDetailModal } from './AssemblyDetailModal';

interface QuotationModalsProps {
  // Component Form Modal
  modalState: any;
  closeModal: () => void;
  onComponentUpdate?: (component: Component) => void; // Callback when component is saved
  // Project Picker Modal
  showProjectPicker: boolean;
  onProjectPickerClose: () => void;
  onProjectSelect: (project: any) => void;
  currentProjectId?: string;
  // Assembly Detail Modal
  showAssemblyDetail: boolean;
  selectedAssemblyForDetail: Assembly | null;
  onAssemblyDetailClose: () => void;
}

export function QuotationModals({
  modalState,
  closeModal,
  onComponentUpdate,
  showProjectPicker,
  onProjectPickerClose,
  onProjectSelect,
  currentProjectId,
  showAssemblyDetail,
  selectedAssemblyForDetail,
  onAssemblyDetailClose,
}: QuotationModalsProps) {
  return (
    <>
      {/* Component Card Modal */}
      <ComponentForm
        component={
          modalState?.type === 'edit-component' ? modalState.data : null
        }
        isOpen={modalState?.type === 'edit-component'}
        onClose={closeModal}
        onSave={onComponentUpdate} // Sync MSRP back to quotation items
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        isOpen={showProjectPicker}
        onClose={onProjectPickerClose}
        onSelect={onProjectSelect}
        currentProjectId={currentProjectId}
      />

      {/* Assembly Detail Modal */}
      <AssemblyDetailModal
        assembly={selectedAssemblyForDetail}
        isOpen={showAssemblyDetail}
        onClose={onAssemblyDetailClose}
      />
    </>
  );
}
