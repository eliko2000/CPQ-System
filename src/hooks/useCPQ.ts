import { useUI } from '../contexts/UIStateContext';
import { useProject } from '../contexts/ProjectContext';
import { useQuotation } from '../contexts/QuotationContext';
import { useProducts } from '../contexts/CPQProvider';

export function useCPQ() {
  const ui = useUI();
  const project = useProject();
  const quotation = useQuotation();
  const products = useProducts();

  // Combine all contexts into the legacy CPQContext shape
  return {
    // Product State (Components & Assemblies)
    components: products.components,
    assemblies: products.assemblies,
    loading: {
      components: products.loading.components,
      assemblies: products.loading.assemblies,
      projects: project.loading,
      quotes: quotation.loading.quotes,
      quotations: quotation.loading.quotations,
    },
    errors: [
      ...ui.errors,
      ...(products.error ? [products.error] : []),
      ...(project.error ? [project.error] : []),
      ...(quotation.error ? [quotation.error] : []),
    ],

    // Project State
    projects: project.projects,
    currentProject: project.currentProject,
    currentProjectBOM: project.currentProjectBOM,
    viewingProjectId: project.viewingProjectId,

    // Quotation State
    quotations: quotation.quotations,
    currentQuotation: quotation.currentQuotation,
    supplierQuotes: quotation.supplierQuotes,
    pricingRules: quotation.pricingRules,

    // UI State
    uiState: {
      activeView: ui.activeView,
      sidebarCollapsed: ui.sidebarCollapsed,
      theme: ui.theme,
      loading: {
        components: products.loading.components,
        quotes: quotation.loading.quotes,
        projects: project.loading,
      },
      errors: ui.errors,
    },
    modalState: ui.modalState,

    // Actions - UI
    setLoading: (key: string, _value: boolean) => {
      // This is a bit tricky as loading is split. We'll map to the most likely one or ignore if not supported directly
      // In the new architecture, loading is handled by specific actions
      console.warn(
        'setLoading called via legacy useCPQ - this may not work as expected for all keys',
        key
      );
    },
    setError: ui.addError,
    clearErrors: ui.clearErrors,
    setActiveView: ui.setActiveView,
    toggleSidebar: ui.toggleSidebar,
    setModal: ui.setModal,
    closeModal: ui.closeModal,

    // Actions - Products
    addComponent: products.addComponent,
    updateComponent: products.updateComponent,
    deleteComponent: products.deleteComponent,
    addAssembly: products.addAssembly,
    updateAssembly: products.updateAssembly,
    deleteAssembly: products.deleteAssembly,
    checkComponentUsage: products.checkComponentUsage,

    // Actions - Projects
    createProject: project.createProject,
    updateProject: project.updateProject,
    deleteProject: project.deleteProject,
    setCurrentProject: project.setCurrentProject,
    setViewingProjectId: project.setViewingProjectId,
    addBOMItem: project.addBOMItem,
    updateBOMItem: project.updateBOMItem,
    deleteBOMItem: project.deleteBOMItem,
    calculateBOMTotals: project.calculateBOMTotals,

    // Actions - Quotations
    setCurrentQuotation: quotation.setCurrentQuotation,
    addQuotation: quotation.addQuotation,
    updateQuotation: quotation.updateQuotation,
    addSupplierQuote: quotation.addSupplierQuote,
  };
}
