import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '../Sidebar'

const mockSetActiveView = vi.fn()
const mockToggleSidebar = vi.fn()
const mockSetCurrentQuotation = vi.fn()

const mockUiState = {
  activeView: 'dashboard' as const,
  sidebarCollapsed: false,
  theme: 'system' as const,
  loading: {
    components: false,
    quotes: false,
    projects: false
  },
  errors: []
}

vi.mock('../../../contexts/CPQContext', () => ({
  useCPQ: () => ({
    uiState: mockUiState,
    setActiveView: mockSetActiveView,
    toggleSidebar: mockToggleSidebar,
    currentQuotation: null,
    setCurrentQuotation: mockSetCurrentQuotation
  })
}))

describe('Sidebar - Navigation with Quotation Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should navigate normally when no quotation is open', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    const componentButton = screen.getByText('ספרייה')
    await user.click(componentButton)

    expect(mockSetActiveView).toHaveBeenCalledWith('components')
    expect(screen.queryByText('סגירת הצעת מחיר')).not.toBeInTheDocument()
  })

  it('should show confirmation dialog when navigating with an open quotation', async () => {
    // Re-mock with quotation
    vi.mock('../../../contexts/CPQContext', () => ({
      useCPQ: () => ({
        uiState: mockUiState,
        setActiveView: mockSetActiveView,
        toggleSidebar: mockToggleSidebar,
        currentQuotation: {
          id: 'test-quote',
          name: 'Test Quote',
          customerName: 'Test Customer'
        },
        setCurrentQuotation: mockSetCurrentQuotation
      })
    }))

    const user = userEvent.setup()

    // Need to re-import to get the updated mock
    const { Sidebar: SidebarWithQuotation } = await import('../Sidebar')
    render(<SidebarWithQuotation />)

    const componentsButton = screen.getByText('ספרייה')
    await user.click(componentsButton)

    // Should show confirmation dialog
    expect(screen.getByText('סגירת הצעת מחיר')).toBeInTheDocument()
    expect(screen.getByText(/האם אתה בטוח שברצונך לסגור את הצעת המחיר/)).toBeInTheDocument()
  })

  it('should render all navigation items', () => {
    render(<Sidebar />)

    expect(screen.getByText('לוח בקרה')).toBeInTheDocument()
    expect(screen.getByText('הצעות ספקים')).toBeInTheDocument()
    expect(screen.getByText('הצעות מחיר')).toBeInTheDocument()
    expect(screen.getByText('ספרייה')).toBeInTheDocument()
    expect(screen.getByText('פרויקטים')).toBeInTheDocument()
    expect(screen.getByText('ניתוחים')).toBeInTheDocument()
  })
})

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
    updatedAt: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should close quotation and navigate when confirmed', async () => {
    vi.doMock('../../../contexts/CPQContext', () => ({
      useCPQ: () => ({
        uiState: mockUiState,
        setActiveView: mockSetActiveView,
        toggleSidebar: mockToggleSidebar,
        currentQuotation: mockQuotation,
        setCurrentQuotation: mockSetCurrentQuotation
      })
    }))

    const user = userEvent.setup()
    const { Sidebar: SidebarWithQuote } = await import('../Sidebar')

    render(<SidebarWithQuote />)

    // Click on a navigation item
    const componentsButton = screen.getByText('ספרייה')
    await user.click(componentsButton)

    // Dialog should appear
    expect(screen.getByText('סגירת הצעת מחיר')).toBeInTheDocument()

    // Click confirm
    const confirmButton = screen.getByText('סגור ונווט')
    await user.click(confirmButton)

    // Should close quotation and navigate
    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null)
    expect(mockSetActiveView).toHaveBeenCalledWith('components')
  })

  it('should stay on current view when canceled', async () => {
    vi.doMock('../../../contexts/CPQContext', () => ({
      useCPQ: () => ({
        uiState: mockUiState,
        setActiveView: mockSetActiveView,
        toggleSidebar: mockToggleSidebar,
        currentQuotation: mockQuotation,
        setCurrentQuotation: mockSetCurrentQuotation
      })
    }))

    const user = userEvent.setup()
    const { Sidebar: SidebarWithQuote } = await import('../Sidebar')

    render(<SidebarWithQuote />)

    // Click on a navigation item
    const componentsButton = screen.getByText('ספרייה')
    await user.click(componentsButton)

    // Dialog should appear
    expect(screen.getByText('סגירת הצעת מחיר')).toBeInTheDocument()

    // Click cancel
    const cancelButton = screen.getByText('ביטול')
    await user.click(cancelButton)

    // Should not close quotation or navigate
    expect(mockSetCurrentQuotation).not.toHaveBeenCalled()
    expect(mockSetActiveView).not.toHaveBeenCalled()

    // Dialog should be closed
    expect(screen.queryByText('סגירת הצעת מחיר')).not.toBeInTheDocument()
  })
})
