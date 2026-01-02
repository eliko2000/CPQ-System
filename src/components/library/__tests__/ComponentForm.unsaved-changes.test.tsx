import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentForm } from '../ComponentForm';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon">Icon</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock the contexts
vi.mock('../../../contexts/CPQContext', async () => {
  const actual = await vi.importActual('../../../contexts/CPQContext');
  return {
    ...actual,
    useCPQ: () => ({
      addComponent: vi.fn(),
      updateComponent: vi.fn(),
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

vi.mock('../../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
    handleWarning: vi.fn(),
    handleSuccess: vi.fn(),
  }),
}));

describe('ComponentForm - Unsaved Changes Protection', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close immediately when no changes have been made', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Click the cancel button
    const cancelButton = screen.getByRole('button', { name: /ביטול/i });
    fireEvent.click(cancelButton);

    // Should close immediately without showing confirmation
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show confirmation dialog when user edits a field and tries to close', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Edit the name field
    const nameInput = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    fireEvent.change(nameInput, { target: { value: 'Test Component' } });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /ביטול/i });
    fireEvent.click(cancelButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('שינויים לא נשמרו')).toBeInTheDocument();
    });

    // Should not close yet
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close when user confirms unsaved changes warning', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Edit a field
    const nameInput = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    fireEvent.change(nameInput, { target: { value: 'Test Component' } });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /ביטול/i });
    fireEvent.click(cancelButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('שינויים לא נשמרו')).toBeInTheDocument();
    });

    // Click confirm button (yes, close)
    const confirmButton = screen.getByRole('button', { name: /כן, סגור/i });
    fireEvent.click(confirmButton);

    // Should close the modal
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should stay open when user cancels unsaved changes warning', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Edit a field
    const supplierInput = screen.getByPlaceholderText(/אלקטרוניקה ישראלית/i);
    fireEvent.change(supplierInput, { target: { value: 'Test Supplier' } });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /ביטול/i });
    fireEvent.click(cancelButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('שינויים לא נשמרו')).toBeInTheDocument();
    });

    // Click the "חזור" (back) button
    const backButton = screen.getByRole('button', { name: /חזור/i });
    fireEvent.click(backButton);

    // Should not close the modal
    expect(mockOnClose).not.toHaveBeenCalled();

    // Confirmation dialog should be hidden
    await waitFor(() => {
      expect(screen.queryByText('שינויים לא נשמרו')).not.toBeInTheDocument();
    });
  });

  it('should show confirmation when multiple fields are changed', async () => {
    render(
      <ComponentForm isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Change multiple fields
    const nameInput = screen.getByPlaceholderText(/לדוגמה: שסתום/i);
    const supplierInput = screen.getByPlaceholderText(/אלקטרוניקה ישראלית/i);

    fireEvent.change(nameInput, { target: { value: 'Test Component' } });
    fireEvent.change(supplierInput, { target: { value: 'Test Supplier' } });

    // Try to close
    const cancelButton = screen.getByRole('button', { name: /ביטול/i });
    fireEvent.click(cancelButton);

    // Should show confirmation
    await waitFor(() => {
      expect(screen.getByText('שינויים לא נשמרו')).toBeInTheDocument();
    });
  });
});
