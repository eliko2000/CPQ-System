import { Assembly } from '../../types';
import { ComponentForm } from '../library/ComponentForm';
import { ProjectPicker } from './ProjectPicker';
import { AssemblyDetailModal } from './AssemblyDetailModal';

interface QuotationModalsProps {
  // Component Form Modal
  modalState: any;
  closeModal: () => void;
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
