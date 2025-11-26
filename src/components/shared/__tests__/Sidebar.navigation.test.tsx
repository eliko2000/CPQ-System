import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';

const mockSetActiveView = vi.fn();
const mockToggleSidebar = vi.fn();
const mockSetCurrentQuotation = vi.fn();

const mockUiState = {
  activeView: 'dashboard' as const,
  sidebarCollapsed: false,
  theme: 'system' as const,
  loading: {
    components: false,
    quotes: false,
    projects: false,
  },
  errors: [],
};

// Mock the individual context hooks that useCPQ depends on
vi.mock('../../../contexts/UIStateContext', () => ({
  useUI: () => ({
    activeView: mockUiState.activeView,
    sidebarCollapsed: mockUiState.sidebarCollapsed,
    theme: mockUiState.theme,
    modalState: { type: null, data: null },
    errors: [],
    setActiveView: mockSetActiveView,
    toggleSidebar: mockToggleSidebar,
    setTheme: vi.fn(),
    setModal: vi.fn(),
    closeModal: vi.fn(),
    addError: vi.fn(),
    clearErrors: vi.fn(),
  }),
}));

vi.mock('../../../contexts/ProjectContext', () => ({
  useProject: () => ({
    projects: [],
    currentProject: null,
    currentProjectBOM: [],
    viewingProjectId: null,
    loading: false,
    error: null,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    setCurrentProject: vi.fn(),
    setViewingProjectId: vi.fn(),
    addBOMItem: vi.fn(),
    updateBOMItem: vi.fn(),
    deleteBOMItem: vi.fn(),
    calculateBOMTotals: vi.fn(),
  }),
}));

vi.mock('../../../contexts/QuotationContext', () => ({
  useQuotation: () => ({
    quotations: [],
    currentQuotation: null,
    supplierQuotes: [],
    pricingRules: [],
    loading: { quotations: false, quotes: false },
    error: null,
    setCurrentQuotation: mockSetCurrentQuotation,
    addQuotation: vi.fn(),
    updateQuotation: vi.fn(),
    addSupplierQuote: vi.fn(),
  }),
}));

vi.mock('../../../contexts/CPQProvider', () => ({
  useProducts: () => ({
    components: [],
    assemblies: [],
    loading: { components: false, assemblies: false },
    error: null,
    addComponent: vi.fn(),
    updateComponent: vi.fn(),
    deleteComponent: vi.fn(),
    addAssembly: vi.fn(),
    updateAssembly: vi.fn(),
    deleteAssembly: vi.fn(),
    checkComponentUsage: vi.fn(),
  }),
}));

describe('Sidebar - Navigation with Quotation Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate normally when no quotation is open', async () => {
    render(<Sidebar />);

    const componentButton = screen.getByRole('button', { name: /ספרייה/i });
    fireEvent.click(componentButton);

    expect(mockSetActiveView).toHaveBeenCalledWith('components');
    expect(screen.queryByText('סגירת הצעת מחיר')).not.toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('בית')).toBeInTheDocument();
    expect(screen.getByText('הצעות ספקים')).toBeInTheDocument();
    expect(screen.getByText('הצעות מחיר')).toBeInTheDocument();
    expect(screen.getByText('ספרייה')).toBeInTheDocument();
    expect(screen.getByText('פרויקטים')).toBeInTheDocument();
    expect(screen.getByText('ניתוחים')).toBeInTheDocument();
  });
});

describe('Sidebar - Quotation Navigation Confirmation', () => {
  const mockQuotation = {
    id: 'test-quote-1',
    name: 'Test Quotation',
    customerName: 'Test Customer',
    status: 'draft' as const,
    systems: [],
    parameters: {},
    items: [],
    calculations: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should close quotation and navigate when confirmed', async () => {
    vi.doMock('../../../contexts/QuotationContext', () => ({
      useQuotation: () => ({
        quotations: [],
        currentQuotation: mockQuotation,
        supplierQuotes: [],
        pricingRules: [],
        loading: { quotations: false, quotes: false },
        error: null,
        setCurrentQuotation: mockSetCurrentQuotation,
        addQuotation: vi.fn(),
        updateQuotation: vi.fn(),
        addSupplierQuote: vi.fn(),
      }),
    }));

    const user = userEvent.setup();
    const { Sidebar: SidebarWithQuote } = await import('../Sidebar');

    render(<SidebarWithQuote />);

    // Click on a navigation item
    const componentsButton = screen.getByText('ספרייה');
    await user.click(componentsButton);

    // Dialog should appear
    expect(screen.getByText('סגירת הצעת מחיר')).toBeInTheDocument();

    // Click confirm
    const confirmButton = screen.getByText('סגור ונווט');
    await user.click(confirmButton);

    // Should close quotation and navigate
    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null);
    expect(mockSetActiveView).toHaveBeenCalledWith('components');
  });

  it('should stay on current view when canceled', async () => {
    vi.doMock('../../../contexts/QuotationContext', () => ({
      useQuotation: () => ({
        quotations: [],
        currentQuotation: mockQuotation,
        supplierQuotes: [],
        pricingRules: [],
        loading: { quotations: false, quotes: false },
        error: null,
        setCurrentQuotation: mockSetCurrentQuotation,
        addQuotation: vi.fn(),
        updateQuotation: vi.fn(),
        addSupplierQuote: vi.fn(),
      }),
    }));

    const user = userEvent.setup();
    const { Sidebar: SidebarWithQuote } = await import('../Sidebar');

    render(<SidebarWithQuote />);

    // Click on a navigation item
    const componentsButton = screen.getByText('ספרייה');
    await user.click(componentsButton);

    // Dialog should appear
    expect(screen.getByText('סגירת הצעת מחיר')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByText('ביטול');
    await user.click(cancelButton);

    // Should not close quotation or navigate
    expect(mockSetCurrentQuotation).not.toHaveBeenCalled();
    expect(mockSetActiveView).not.toHaveBeenCalled();

    // Dialog should be closed
    expect(screen.queryByText('סגירת הצעת מחיר')).not.toBeInTheDocument();
  });
});
