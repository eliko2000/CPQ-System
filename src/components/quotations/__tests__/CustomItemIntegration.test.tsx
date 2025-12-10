import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotationEditor } from '../QuotationEditor';

// Mock the hooks
const mockSetCurrentQuotation = vi.fn();
const mockUpdateQuotation = vi.fn();
const mockAddCustomItemToSystem = vi.fn();

// Mock CPQ context
vi.mock('../../../contexts/CPQContext', () => ({
  useCPQ: () => ({
    currentQuotation: {
      id: 'test-quote-1',
      systems: [{ id: 'system-1', name: 'System 1', order: 1, quantity: 1 }],
      items: [],
      parameters: { usdToIlsRate: 3.7, eurToIlsRate: 4.0, markupPercent: 0.75 },
    },
    components: [],
    assemblies: [],
    setCurrentQuotation: mockSetCurrentQuotation,
    updateQuotation: mockUpdateQuotation,
    setModal: vi.fn(),
    modalState: null,
    closeModal: vi.fn(),
  }),
}));

// Mock Team context
vi.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => ({
    currentTeam: { id: 'test-team-1', name: 'Test Team' },
    teams: [],
    loading: false,
    createTeam: vi.fn(),
    switchTeam: vi.fn(),
    refreshTeams: vi.fn(),
  }),
}));

// Mock Toast context
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock useQuotationActions
vi.mock('../../../hooks/quotation/useQuotationActions', () => ({
  useQuotationActions: () => ({
    addSystem: vi.fn(),
    addComponentToSystem: vi.fn(),
    addAssemblyToSystem: vi.fn(),
    addCustomItemToSystem: mockAddCustomItemToSystem, // Mock the new action
    deleteItem: vi.fn(),
    updateItem: vi.fn(),
    updateParameters: vi.fn(),
    handleClose: vi.fn(),
  }),
}));

// Mock other components
vi.mock('../QuotationHeader', () => ({
  QuotationHeader: () => <div>Header</div>,
}));
vi.mock('../QuotationParameters', () => ({
  QuotationParameters: () => <div>Parameters</div>,
}));
vi.mock('../QuotationStatisticsPanelSimplified', () => ({
  QuotationStatisticsPanelSimplified: () => <div>Stats</div>,
}));
vi.mock('../QuotationItemsGrid', () => ({
  QuotationItemsGrid: ({ onAddSystem }: any) => (
    <button onClick={onAddSystem}>Add System</button>
  ),
}));
vi.mock('../QuotationSummary', () => ({
  QuotationSummary: () => <div>Summary</div>,
}));

// Mock AddItemDialog to expose the custom item form trigger
vi.mock('../AddItemDialog', () => ({
  AddItemDialog: ({ isOpen, onAddCustomItem, tab, onTabChange }: any) => {
    console.log('Mock AddItemDialog rendered', { isOpen, tab });
    if (!isOpen) return null;
    return (
      <div>
        <button onClick={() => onTabChange('custom')}>Custom Tab</button>
        {tab === 'custom' && (
          <button
            onClick={() => {
              console.log('Button clicked, calling onAddCustomItem');
              onAddCustomItem({
                name: 'Custom Item',
                unitCost: 100,
                currency: 'NIS',
                quantity: 1,
                componentType: 'hardware',
                category: 'General',
              });
            }}
          >
            Add Custom Item
          </button>
        )}
      </div>
    );
  },
}));

describe('QuotationEditor - Custom Items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call addCustomItemToSystem when custom item is added', async () => {
    const user = userEvent.setup();

    // Mock state to show component selector and set tab to custom
    vi.mock('../../../hooks/quotation/useQuotationState', () => ({
      useQuotationState: () => ({
        showComponentSelector: true,
        setShowComponentSelector: vi.fn(),
        selectorTab: 'custom', // Start on custom tab
        setSelectorTab: vi.fn(),
        selectedItems: [],
        showColumnManager: false,
        setShowColumnManager: vi.fn(),
        selectedSystemId: 'system-1',
        setSelectedSystemId: vi.fn(),
        componentSearchText: '',
        setComponentSearchText: vi.fn(),
        showProjectPicker: false,
        setShowProjectPicker: vi.fn(),
        showAssemblyDetail: false,
        setShowAssemblyDetail: vi.fn(),
        selectedAssemblyForDetail: null,
        setSelectedAssemblyForDetail: vi.fn(),
      }),
    }));

    render(<QuotationEditor />);

    // Click the "Add Custom Item" button which is rendered by our mock AddItemDialog
    const addButton = screen.getByText('Add Custom Item');
    console.log('Found button, clicking...');
    await user.click(addButton);

    console.log('Checking expectation...');
    expect(mockAddCustomItemToSystem).toHaveBeenCalled();
    expect(mockAddCustomItemToSystem).toHaveBeenCalledWith({
      name: 'Custom Item',
      unitCost: 100,
      currency: 'NIS',
      quantity: 1,
      componentType: 'hardware',
      category: 'General',
    });
  });
});
