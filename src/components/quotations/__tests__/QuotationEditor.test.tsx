import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuotationEditor } from '../QuotationEditor'
import userEvent from '@testing-library/user-event'

// Mock the CPQ context with test data
const mockSetCurrentQuotation = vi.fn()
const mockUpdateQuotation = vi.fn()
const mockAddQuotation = vi.fn()
const mockSetModal = vi.fn()

const mockQuotation = {
  id: 'test-quote-1',
  name: 'Test Quotation',
  customerName: 'Test Customer',
  status: 'draft' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  systems: [
    {
      id: 'system-1',
      name: 'System 1',
      description: 'Test system',
      order: 1,
      quantity: 1,
      createdAt: '2024-01-01T00:00:00Z'
    }
  ],
  parameters: {
    usdToIlsRate: 3.7,
    eurToIlsRate: 4.0,
    markupPercent: 0.75,
    dayWorkCost: 1200,
    profitPercent: 20,
    riskPercent: 10,
    includeVAT: true,
    vatRate: 18
  },
  items: [],
  calculations: {
    totalHardwareUSD: 0,
    totalHardwareILS: 0,
    totalLaborUSD: 0,
    totalLaborILS: 0,
    subtotalUSD: 0,
    subtotalILS: 0,
    totalCustomerPriceILS: 0,
    riskAdditionILS: 0,
    totalQuoteILS: 0,
    totalVATILS: 0,
    finalTotalILS: 0,
    totalCostILS: 0,
    totalProfitILS: 0,
    profitMarginPercent: 0
  }
}

vi.mock('../../../contexts/CPQContext', () => ({
  useCPQ: () => ({
    currentQuotation: mockQuotation,
    components: [],
    setCurrentQuotation: mockSetCurrentQuotation,
    updateQuotation: mockUpdateQuotation,
    addQuotation: mockAddQuotation,
    setModal: mockSetModal,
    loading: false
  }),
  CPQProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('QuotationEditor - Navigation Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Save and Exit button', () => {
    render(<QuotationEditor />)
    expect(screen.getByText('שמור וצא')).toBeInTheDocument()
  })

  it('should render Close button', () => {
    render(<QuotationEditor />)
    expect(screen.getByText('סגור')).toBeInTheDocument()
  })

  it('should call setCurrentQuotation(null) when Save and Exit is clicked without changes', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    const saveExitButton = screen.getByText('שמור וצא')
    await user.click(saveExitButton)

    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null)
  })

  it('should call setCurrentQuotation(null) when Close is clicked without changes', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    const closeButton = screen.getByText('סגור')
    await user.click(closeButton)

    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null)
  })

  it('should show confirmation dialog when Close is clicked with unsaved changes', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    // Make a change by adding a system
    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Now click close
    const closeButton = screen.getByText('סגור')
    await user.click(closeButton)

    // Check for confirmation dialog
    expect(screen.getByText('שינויים שלא נשמרו')).toBeInTheDocument()
    expect(screen.getByText('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת מבלי לשמור?')).toBeInTheDocument()
  })

  it('should cancel exit when Cancel is clicked in confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    // Make a change
    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Click close
    const closeButton = screen.getByText('סגור')
    await user.click(closeButton)

    // Cancel in dialog
    const cancelButton = screen.getByText('ביטול')
    await user.click(cancelButton)

    // Dialog should be closed, setCurrentQuotation should not be called
    expect(screen.queryByText('שינויים שלא נשמרו')).not.toBeInTheDocument()
    expect(mockSetCurrentQuotation).not.toHaveBeenCalledWith(null)
  })

  it('should exit without saving when confirmed in dialog', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    // Make a change
    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Click close
    const closeButton = screen.getByText('סגור')
    await user.click(closeButton)

    // Confirm exit
    const confirmButton = screen.getByText('צא מבלי לשמור')
    await user.click(confirmButton)

    // Should call setCurrentQuotation(null)
    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null)
  })

  it('should show unsaved changes indicator when quotation is modified', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    // Initially no indicator
    expect(screen.queryByText('(שינויים שלא נשמרו)')).not.toBeInTheDocument()

    // Make a change
    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Should show indicator
    expect(screen.getByText('(שינויים שלא נשמרו)')).toBeInTheDocument()
  })

  it('should mark as dirty when adding a system', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Verify isDirty by checking if clicking Close shows confirmation
    const closeButton = screen.getByText('סגור')
    await user.click(closeButton)

    expect(screen.getByText('שינויים שלא נשמרו')).toBeInTheDocument()
  })

  it('should save and exit successfully', async () => {
    const user = userEvent.setup()
    render(<QuotationEditor />)

    // Make a change
    const addSystemButton = screen.getByText('הוסף מערכת')
    await user.click(addSystemButton)

    // Save and exit
    const saveExitButton = screen.getByText('שמור וצא')
    await user.click(saveExitButton)

    // Should call setCurrentQuotation(null) to return to list
    expect(mockSetCurrentQuotation).toHaveBeenCalledWith(null)
  })
})
