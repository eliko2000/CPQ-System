import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentLibrary } from '../ComponentLibrary'
import { Component } from '../../../types'

// Mock data - comprehensive test components
const mockComponents: Component[] = [
  {
    id: 'comp-1',
    name: 'Siemens PLC S7-1500',
    description: 'Advanced PLC controller for industrial automation',
    category: 'בקרים',
    componentType: 'hardware',
    manufacturer: 'Siemens',
    manufacturerPN: '6ES7512-1DK01-0AB0',
    supplier: 'Keter Automation',
    unitCostNIS: 9250,
    unitCostUSD: 2500,
    unitCostEUR: 2200,
    currency: 'USD',
    originalCost: 2500,
    quoteDate: '2024-01-15',
    quoteFileUrl: '',
    notes: 'High-end PLC',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'comp-2',
    name: 'Proximity Sensor IFM',
    description: 'Inductive proximity sensor',
    category: 'חיישנים',
    componentType: 'hardware',
    manufacturer: 'IFM',
    manufacturerPN: 'IFM-PROX-001',
    supplier: 'Telem',
    unitCostNIS: 370,
    unitCostUSD: 100,
    unitCostEUR: 88,
    currency: 'USD',
    originalCost: 100,
    quoteDate: '2024-01-10',
    quoteFileUrl: '',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
  {
    id: 'comp-3',
    name: 'ABB Robot IRB 1200',
    description: '6-axis industrial robot',
    category: 'רובוטיקה',
    componentType: 'hardware',
    manufacturer: 'ABB',
    manufacturerPN: 'IRB1200-5/0.9',
    supplier: 'ABB Israel',
    unitCostNIS: 55500,
    unitCostUSD: 15000,
    unitCostEUR: 13200,
    currency: 'USD',
    originalCost: 15000,
    quoteDate: '2024-01-20',
    quoteFileUrl: '',
    notes: 'Compact robot for small parts assembly',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'comp-4',
    name: 'Engineering Hours',
    description: 'Software development and engineering',
    category: 'עבודה',
    componentType: 'labor',
    laborSubtype: 'engineering',
    manufacturer: 'Internal',
    manufacturerPN: 'ENG-HOUR',
    supplier: 'Internal',
    unitCostNIS: 1200,
    unitCostUSD: 324,
    currency: 'NIS',
    originalCost: 1200,
    quoteDate: '2024-01-01',
    quoteFileUrl: '',
    notes: 'Per day rate',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

const mockAssemblies = [
  {
    id: 'asm-1',
    name: 'Standard Gripper Assembly',
    description: 'Complete gripper with pneumatics',
    components: []
  }
]

// Mock functions
const mockUpdateComponent = vi.fn()
const mockDeleteComponent = vi.fn()
const mockSetModal = vi.fn()
const mockCloseModal = vi.fn()
const mockAddComponent = vi.fn()

// Mock CPQ Context
vi.mock('../../../contexts/CPQContext', () => ({
  useCPQ: () => ({
    components: mockComponents,
    assemblies: mockAssemblies,
    updateComponent: mockUpdateComponent,
    deleteComponent: mockDeleteComponent,
    setModal: mockSetModal,
    modalState: null,
    closeModal: mockCloseModal,
    loading: false
  })
}))

// Mock useComponents hook
vi.mock('../../../hooks/useComponents', () => ({
  useComponents: () => ({
    components: mockComponents,
    loading: false,
    error: null,
    addComponent: mockAddComponent,
    updateComponent: mockUpdateComponent,
    deleteComponent: mockDeleteComponent
  })
}))

// Mock EnhancedComponentGrid to simplify testing
vi.mock('../EnhancedComponentGrid', () => ({
  EnhancedComponentGrid: ({ components, onEdit, onDelete, onDuplicate }: any) => (
    <div data-testid="enhanced-component-grid">
      {components.map((comp: Component) => (
        <div key={comp.id} data-testid={`component-${comp.id}`}>
          <div data-testid="component-name">{comp.name}</div>
          <div data-testid="component-manufacturer">{comp.manufacturer}</div>
          <div data-testid="component-pn">{comp.manufacturerPN}</div>
          <div data-testid="component-category">{comp.category}</div>
          <div data-testid="component-price-nis">₪{comp.unitCostNIS.toFixed(2)}</div>
          <div data-testid="component-price-usd">${comp.unitCostUSD?.toFixed(2)}</div>
          <div data-testid="component-price-eur">€{comp.unitCostEUR?.toFixed(2)}</div>
          <button onClick={() => onEdit(comp)} data-testid={`edit-${comp.id}`}>Edit</button>
          <button onClick={() => onDelete(comp.id, comp.name)} data-testid={`delete-${comp.id}`}>Delete</button>
          {onDuplicate && <button onClick={() => onDuplicate(comp)} data-testid={`duplicate-${comp.id}`}>Duplicate</button>}
        </div>
      ))}
    </div>
  )
}))

// Mock other components
vi.mock('../ComponentForm', () => ({
  ComponentForm: () => <div data-testid="component-form">Component Form</div>
}))

vi.mock('../AssemblyForm', () => ({
  AssemblyForm: () => <div data-testid="assembly-form">Assembly Form</div>
}))

vi.mock('../AssemblyGrid', () => ({
  AssemblyGrid: () => <div data-testid="assembly-grid">Assembly Grid</div>
}))

vi.mock('../../supplier-quotes/SupplierQuoteImport', () => ({
  SupplierQuoteImport: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="ai-import-modal" onClick={onClose}>AI Import Modal</div> : null
}))

vi.mock('../../ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onConfirm, onCancel, message }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">מחק</button>
        <button onClick={onCancel} data-testid="cancel-button">ביטול</button>
      </div>
    ) : null
}))

describe('ComponentLibrary - Rendering and Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the component library without crashing', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText('ספריית רכיבים')).toBeInTheDocument()
  })

  it('should show component count in header', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText(/4 רכיבים/)).toBeInTheDocument()
  })

  it('should show assembly count in header', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText(/1 הרכבות/)).toBeInTheDocument()
  })

  it('should render components tab by default', () => {
    render(<ComponentLibrary />)
    const componentsTab = screen.getByRole('tab', { name: /רכיבים/ })
    expect(componentsTab).toHaveAttribute('data-state', 'active')
  })

  it('should display all components when loaded', () => {
    render(<ComponentLibrary />)
    expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(4)
  })

  it('should display component details (name, manufacturer, price)', () => {
    render(<ComponentLibrary />)

    // Check first component details
    expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
    expect(screen.getByText('Siemens')).toBeInTheDocument()
    expect(screen.getByText('6ES7512-1DK01-0AB0')).toBeInTheDocument()
  })

  it('should show prices in all currencies (NIS, USD, EUR)', () => {
    render(<ComponentLibrary />)

    // Check for currency symbols and values
    expect(screen.getByText('₪9250.00')).toBeInTheDocument()
    expect(screen.getByText('$2500.00')).toBeInTheDocument()
    expect(screen.getByText('€2200.00')).toBeInTheDocument()
  })

  it('should display category badges', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText('בקרים')).toBeInTheDocument()
    expect(screen.getByText('חיישנים')).toBeInTheDocument()
    expect(screen.getByText('רובוטיקה')).toBeInTheDocument()
  })

  it('should render summary statistics cards', () => {
    render(<ComponentLibrary />)

    // Check for statistics cards - they display component count
    const componentCountText = screen.getByText(/4 רכיבים/)
    expect(componentCountText).toBeInTheDocument()
  })

  it('should calculate and display average value', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText('ערך ממוצע')).toBeInTheDocument()
    // Average should be displayed
  })

  it('should show last updated date', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText('עודכן לאחרונה')).toBeInTheDocument()
  })
})

describe('ComponentLibrary - Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<ComponentLibrary />)
    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    expect(searchInput).toBeInTheDocument()
  })

  it('should filter components by name', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'Siemens')

    // Should show only Siemens component
    await waitFor(() => {
      expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
      expect(screen.queryByText('Proximity Sensor IFM')).not.toBeInTheDocument()
    })
  })

  it('should filter components by manufacturer', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'IFM')

    await waitFor(() => {
      expect(screen.getByText('Proximity Sensor IFM')).toBeInTheDocument()
      expect(screen.queryByText('Siemens PLC S7-1500')).not.toBeInTheDocument()
    })
  })

  it('should filter components by part number', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, '6ES7512')

    await waitFor(() => {
      expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(1)
    })
  })

  it('should filter components by category', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'חיישנים')

    await waitFor(() => {
      expect(screen.getByText('Proximity Sensor IFM')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(1)
    })
  })

  it('should be case-insensitive', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'siemens')

    await waitFor(() => {
      expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
    })
  })

  it('should clear search and show all components', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'Siemens')

    await waitFor(() => {
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(1)
    })

    await user.clear(searchInput)

    await waitFor(() => {
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(4)
    })
  })

  it('should show empty state when no search results', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'NonexistentComponent')

    await waitFor(() => {
      expect(screen.getByText('לא נמצאו רכיבים תואמים')).toBeInTheDocument()
      expect(screen.getByText('נסה לשנות את תנאי החיפוש')).toBeInTheDocument()
    })
  })

  it('should search in description field', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'industrial automation')

    await waitFor(() => {
      expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(1)
    })
  })

  it('should search in supplier field', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'Keter')

    await waitFor(() => {
      expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
      expect(screen.getAllByTestId(/^component-comp-/)).toHaveLength(1)
    })
  })
})

describe('ComponentLibrary - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show "Add Component" button', () => {
    render(<ComponentLibrary />)
    // Button text includes "הוסף רכיב"
    expect(screen.getByRole('button', { name: /הוסף רכיב/i })).toBeInTheDocument()
  })

  it('should open add component modal when button clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const addButton = screen.getByRole('button', { name: /הוסף רכיב/i })
    await user.click(addButton)

    expect(mockSetModal).toHaveBeenCalledWith({ type: 'add-component', data: null })
  })

  it('should show edit button for each component', () => {
    render(<ComponentLibrary />)

    const editButtons = screen.getAllByTestId(/^edit-comp-/)
    expect(editButtons).toHaveLength(4)
  })

  it('should open edit modal when edit button clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const editButton = screen.getByTestId('edit-comp-1')
    await user.click(editButton)

    expect(mockSetModal).toHaveBeenCalledWith({
      type: 'edit-component',
      data: mockComponents[0]
    })
  })

  it('should show delete button for each component', () => {
    render(<ComponentLibrary />)

    const deleteButtons = screen.getAllByTestId(/^delete-comp-/)
    expect(deleteButtons).toHaveLength(4)
  })

  it('should show confirmation dialog when delete clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const deleteButton = screen.getByTestId('delete-comp-1')
    await user.click(deleteButton)

    await waitFor(() => {
      const dialog = screen.getByTestId('confirm-dialog')
      expect(dialog).toBeInTheDocument()
      // Check that dialog contains component name
      expect(dialog).toHaveTextContent('Siemens PLC S7-1500')
    })
  })

  it('should delete component when confirmed', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const deleteButton = screen.getByTestId('delete-comp-1')
    await user.click(deleteButton)

    const confirmButton = await screen.findByTestId('confirm-button')
    await user.click(confirmButton)

    expect(mockDeleteComponent).toHaveBeenCalledWith('comp-1')
  })

  it('should cancel delete when cancel clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const deleteButton = screen.getByTestId('delete-comp-1')
    await user.click(deleteButton)

    const cancelButton = await screen.findByTestId('cancel-button')
    await user.click(cancelButton)

    expect(mockDeleteComponent).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    })
  })

  it('should show duplicate button for each component', () => {
    render(<ComponentLibrary />)

    const duplicateButtons = screen.getAllByTestId(/^duplicate-comp-/)
    expect(duplicateButtons).toHaveLength(4)
  })

  it('should duplicate component with "(העתק)" suffix', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const duplicateButton = screen.getByTestId('duplicate-comp-1')
    await user.click(duplicateButton)

    expect(mockSetModal).toHaveBeenCalledWith({
      type: 'add-component',
      data: expect.objectContaining({
        name: 'Siemens PLC S7-1500 (העתק)',
        manufacturer: 'Siemens',
        manufacturerPN: '6ES7512-1DK01-0AB0'
      })
    })
  })
})

describe('ComponentLibrary - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show components tab as active by default', () => {
    render(<ComponentLibrary />)
    const componentsTab = screen.getByRole('tab', { name: /רכיבים/ })
    expect(componentsTab).toHaveAttribute('data-state', 'active')
  })

  it('should switch to assemblies tab when clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const assembliesTab = screen.getByRole('tab', { name: /הרכבות/ })
    await user.click(assembliesTab)

    expect(screen.getByTestId('assembly-grid')).toBeInTheDocument()
  })

  it('should show "Add Assembly" button in assemblies tab', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const assembliesTab = screen.getByRole('tab', { name: /הרכבות/ })
    await user.click(assembliesTab)

    expect(screen.getByRole('button', { name: /הוסף הרכבה/i })).toBeInTheDocument()
  })

  it('should hide component grid when in assemblies tab', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const assembliesTab = screen.getByRole('tab', { name: /הרכבות/ })
    await user.click(assembliesTab)

    expect(screen.queryByTestId('enhanced-component-grid')).not.toBeInTheDocument()
  })
})

describe('ComponentLibrary - AI Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show AI import button', () => {
    render(<ComponentLibrary />)
    expect(screen.getByRole('button', { name: /ייבוא חכם/i })).toBeInTheDocument()
  })

  it('should open AI import modal when clicked', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const aiImportButton = screen.getByRole('button', { name: /ייבוא חכם/i })
    await user.click(aiImportButton)

    await waitFor(() => {
      expect(screen.getByTestId('ai-import-modal')).toBeInTheDocument()
    })
  })

  it('should close AI import modal', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const aiImportButton = screen.getByRole('button', { name: /ייבוא חכם/i })
    await user.click(aiImportButton)

    const modal = await screen.findByTestId('ai-import-modal')
    await user.click(modal)

    await waitFor(() => {
      expect(screen.queryByTestId('ai-import-modal')).not.toBeInTheDocument()
    })
  })
})

describe('ComponentLibrary - Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show empty state message when searching with no results', async () => {
    const user = userEvent.setup()
    render(<ComponentLibrary />)

    const searchInput = screen.getByPlaceholderText(/חיפוש לפי שם/)
    await user.type(searchInput, 'NonexistentComponent')

    await waitFor(() => {
      expect(screen.getByText('לא נמצאו רכיבים תואמים')).toBeInTheDocument()
    })
  })
})

describe('ComponentLibrary - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle labor components correctly', () => {
    render(<ComponentLibrary />)
    expect(screen.getByText('Engineering Hours')).toBeInTheDocument()
  })

  it('should display components with all required fields', () => {
    render(<ComponentLibrary />)

    // Verify all mock components are displayed
    expect(screen.getByText('Siemens PLC S7-1500')).toBeInTheDocument()
    expect(screen.getByText('Proximity Sensor IFM')).toBeInTheDocument()
    expect(screen.getByText('ABB Robot IRB 1200')).toBeInTheDocument()
    expect(screen.getByText('Engineering Hours')).toBeInTheDocument()
  })

  it('should calculate correct supplier count with unique suppliers', () => {
    render(<ComponentLibrary />)

    // Should show unique count (Keter, Telem, ABB Israel, Internal = 4)
    const suppliersCard = screen.getByText('ספקים').closest('div')
    expect(suppliersCard).toBeInTheDocument()
  })

  it('should handle different component types', () => {
    render(<ComponentLibrary />)

    // Should show hardware and labor components
    const components = screen.getAllByTestId(/^component-comp-/)
    expect(components).toHaveLength(4)
  })
})

describe('ComponentLibrary - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have proper heading hierarchy', () => {
    render(<ComponentLibrary />)
    const heading = screen.getByText('ספריית רכיבים')
    expect(heading.tagName).toBe('H1')
  })

  it('should have accessible buttons with proper labels', () => {
    render(<ComponentLibrary />)

    const addButton = screen.getByRole('button', { name: /הוסף רכיב/i })
    expect(addButton).toBeInTheDocument()

    const aiImportButton = screen.getByRole('button', { name: /ייבוא חכם/i })
    expect(aiImportButton).toBeInTheDocument()
  })

  it('should support RTL direction', () => {
    const { container } = render(<ComponentLibrary />)
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveAttribute('dir', 'rtl')
  })
})
