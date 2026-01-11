import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentForm } from '../ComponentForm';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon">Icon</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock the contexts
const mockAddComponent = vi.fn();
const mockUpdateComponent = vi.fn();

vi.mock('../../../contexts/CPQContext', async () => {
  const actual = await vi.importActual('../../../contexts/CPQContext');
  return {
    ...actual,
    useCPQ: () => ({
      addComponent: mockAddComponent,
      updateComponent: mockUpdateComponent,
    }),
  };
});

vi.mock('../../../contexts/TeamContext', async () => {
  const actual = await vi.importActual('../../../contexts/TeamContext');
  return {
    ...actual,
    useTeam: () => ({
      currentTeam: { id: 'test-team' },
    }),
  };
});

const mockHandleSuccess = vi.fn();
const mockHandleWarning = vi.fn();
const mockHandleError = vi.fn();

vi.mock('../../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
    handleWarning: mockHandleWarning,
    handleSuccess: mockHandleSuccess,
  }),
}));

// Mock currency conversion utilities
vi.mock('../../../utils/currencyConversion', () => ({
  convertToAllCurrencies: vi.fn((value, currency) => ({
    unitCostNIS: currency === 'NIS' ? value : value * 3.7,
    unitCostUSD: currency === 'USD' ? value : value / 3.7,
    unitCostEUR: currency === 'EUR' ? value : value / 4.0,
    originalCost: value,
    currency: currency,
  })),
  getGlobalExchangeRates: vi.fn(() => ({
    usdToIls: 3.7,
    eurToIls: 4.0,
  })),
}));

describe('ComponentForm - Decimal Price Input (Bugfix Regression)', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept decimal values in NIS price field', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Find all number inputs and get the first one (NIS field)
    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput =
      numberInputs.find(input => input.className.includes('bg-green-100')) ||
      numberInputs[0];

    // Enter decimal value
    fireEvent.change(nisInput, { target: { value: '23.45' } });

    // Verify the value is preserved as decimal (not converted to 235)
    expect(nisInput).toHaveValue(23.45);
  });

  it('should accept decimal values in USD price field', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Find all number inputs - USD is typically the second currency field (index 1)
    const numberInputs = screen.getAllByRole('spinbutton');
    const usdInput = numberInputs[1];

    // Enter decimal value
    fireEvent.change(usdInput, { target: { value: '99.99' } });

    // Verify the value is preserved as decimal
    expect(usdInput).toHaveValue(99.99);
  });

  it('should accept decimal values in EUR price field', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Find all number inputs - EUR is typically the third currency field (index 2)
    const numberInputs = screen.getAllByRole('spinbutton');
    const eurInput = numberInputs[2];

    // Enter decimal value
    fireEvent.change(eurInput, { target: { value: '150.75' } });

    // Verify the value is preserved as decimal
    expect(eurInput).toHaveValue(150.75);
  });

  it('should accept decimal values in MSRP price field', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Find all number inputs - MSRP comes after the currency fields
    const numberInputs = screen.getAllByRole('spinbutton');
    const msrpInput = numberInputs.find(input =>
      input.className.includes('bg-purple-50')
    );

    // Enter decimal value
    fireEvent.change(msrpInput!, { target: { value: '1234.56' } });

    // Verify the value is preserved as decimal
    expect(msrpInput).toHaveValue(1234.56);
  });

  it('should handle small decimal values correctly (0.01)', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0];

    // Enter very small decimal value
    fireEvent.change(nisInput, { target: { value: '0.01' } });

    expect(nisInput).toHaveValue(0.01);
  });

  it('should handle large decimal values correctly (1000000.99)', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    const usdInput = numberInputs[1];

    // Enter large decimal value
    fireEvent.change(usdInput, { target: { value: '1000000.99' } });

    expect(usdInput).toHaveValue(1000000.99);
  });

  it('should preserve decimal precision when switching between currency fields', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0];
    const usdInput = numberInputs[1];

    // Enter decimal in NIS
    fireEvent.change(nisInput, { target: { value: '370.00' } });
    expect(nisInput).toHaveValue(370);

    // Enter decimal in USD (should convert NIS but preserve USD decimal)
    fireEvent.change(usdInput, { target: { value: '100.50' } });
    expect(usdInput).toHaveValue(100.5);
  });

  it('should save component with decimal prices correctly', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Fill required fields
    const nameInput = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    const supplierInput = screen.getByPlaceholderText(/אלקטרוניקה ישראלית/i);
    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0];

    fireEvent.change(nameInput, { target: { value: 'Test Component' } });
    fireEvent.change(supplierInput, { target: { value: 'Test Supplier' } });
    fireEvent.change(nisInput, { target: { value: '23.45' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /הוסף רכיב/i });
    fireEvent.click(submitButton);

    // Verify addComponent was called with decimal values
    await waitFor(() => {
      expect(mockAddComponent).toHaveBeenCalled();
      const callArgs = mockAddComponent.mock.calls[0][0];
      // The unitCostNIS should be a decimal, not a whole number
      expect(callArgs.unitCostNIS).toBeCloseTo(23.45, 2);
    });
  });

  it('should display prices as raw numbers (browser handles decimal display)', async () => {
    const existingComponent = {
      id: 'test-id',
      name: 'Test Component',
      supplier: 'Test Supplier',
      unitCostNIS: 123.45,
      unitCostUSD: 33.5,
      unitCostEUR: 30.75,
      currency: 'NIS' as const,
      originalCost: 123.45,
      category: 'Test',
      manufacturer: 'Test',
      manufacturerPN: 'TEST-001',
      componentType: 'hardware' as const,
      description: 'Test description',
      quoteDate: '2024-01-01',
      quoteFileUrl: '',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      notes: '',
    };

    render(
      <ComponentForm
        component={existingComponent}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Find inputs
    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0] as HTMLInputElement;
    const usdInput = numberInputs[1] as HTMLInputElement;
    const eurInput = numberInputs[2] as HTMLInputElement;

    // Values should be the raw numbers (browser formats them)
    expect(nisInput.value).toBe('123.45');
    expect(usdInput.value).toBe('33.5');
    expect(eurInput.value).toBe('30.75');
  });

  it('should handle zero and negative edge cases', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0] as HTMLInputElement;

    // Initial state should be empty
    expect(nisInput.value).toBe('');

    // Test zero with decimals - when set to 0, it displays as empty
    fireEvent.change(nisInput, { target: { value: '0.00' } });
    // After onChange, it becomes 0 internally, which displays as empty
    expect(nisInput.value).toBe('');

    // Test negative value (should be allowed by input but validated on submit)
    fireEvent.change(nisInput, { target: { value: '-10.50' } });
    expect(nisInput).toHaveValue(-10.5);
  });

  it('should handle empty and invalid input gracefully', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const numberInputs = screen.getAllByRole('spinbutton');
    const usdInput = numberInputs[1] as HTMLInputElement;

    // Initially empty
    expect(usdInput.value).toBe('');

    // Type a value first
    fireEvent.change(usdInput, { target: { value: '50' } });
    expect(usdInput).toHaveValue(50);

    // Clear the input - becomes 0 which displays as empty
    fireEvent.change(usdInput, { target: { value: '' } });
    expect(usdInput.value).toBe(''); // Displays as empty when 0
  });

  it('should show empty fields instead of leading zero (Bug #1)', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // When opening a new component form, price fields should be empty (not showing "0")
    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0] as HTMLInputElement;
    const usdInput = numberInputs[1] as HTMLInputElement;
    const eurInput = numberInputs[2] as HTMLInputElement;

    // Fields should display empty string when value is 0
    expect(nisInput.value).toBe('');
    expect(usdInput.value).toBe('');
    expect(eurInput.value).toBe('');

    // Now when user types, they shouldn't see "012.34" but "12.34"
    fireEvent.change(nisInput, { target: { value: '12.34' } });
    expect(nisInput.value).not.toBe('012.34'); // Should not have leading zero
    expect(nisInput).toHaveValue(12.34); // Should be the actual value
  });

  it('should reset form state when dialog reopens after cancel (Bug #2)', async () => {
    const { rerender } = render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Fill in some values
    const nameInput = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    const supplierInput = screen.getByPlaceholderText(/אלקטרוניקה ישראלית/i);
    const numberInputs = screen.getAllByRole('spinbutton');
    const nisInput = numberInputs[0];

    fireEvent.change(nameInput, { target: { value: 'Old Component' } });
    fireEvent.change(supplierInput, { target: { value: 'Old Supplier' } });
    fireEvent.change(nisInput, { target: { value: '99.99' } });

    // Verify values were set
    expect(nameInput).toHaveValue('Old Component');
    expect(supplierInput).toHaveValue('Old Supplier');
    expect(nisInput).toHaveValue(99.99);

    // Close the dialog (simulate cancel)
    rerender(
      <ComponentForm isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Reopen the dialog with no component (new component)
    rerender(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Fields should be reset to empty/default values
    const nameInputAfter = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    const supplierInputAfter =
      screen.getByPlaceholderText(/אלקטרוניקה ישראלית/i);
    const numberInputsAfter = screen.getAllByRole('spinbutton');
    const nisInputAfter = numberInputsAfter[0] as HTMLInputElement;

    expect(nameInputAfter).toHaveValue('');
    expect(supplierInputAfter).toHaveValue('');
    expect(nisInputAfter.value).toBe(''); // Should be empty, not 99.99
  });
});
