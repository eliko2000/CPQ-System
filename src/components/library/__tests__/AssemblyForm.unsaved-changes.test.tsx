/**
 * Regression tests for AssemblyForm unsaved changes confirmation
 *
 * Bug: When editing/adding assembly (system), clicking outside the dialog
 * closes it without showing confirmation if there are unsaved changes.
 *
 * Fix: Added unsaved changes detection and confirmation dialog similar to ComponentForm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssemblyForm } from '../AssemblyForm';
import { Assembly, Component } from '../../../types';

// Mock components
const mockComponents: Component[] = [
  {
    id: 'comp-1',
    name: 'PLC',
    manufacturer: 'Siemens',
    manufacturerPN: 'S7-1200',
    category: 'אלקטרוניקה',
    componentType: 'hardware',
    unitCostNIS: 1000,
    unitCostUSD: 270,
    unitCostEUR: 250,
    currency: 'USD',
    originalCost: 270,
    supplier: 'Test Supplier',
    quoteDate: '2024-01-01',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'comp-2',
    name: 'Sensor',
    manufacturer: 'Omron',
    manufacturerPN: 'E3Z',
    category: 'חיישנים',
    componentType: 'hardware',
    unitCostNIS: 500,
    unitCostUSD: 135,
    unitCostEUR: 125,
    currency: 'USD',
    originalCost: 135,
    supplier: 'Test Supplier',
    quoteDate: '2024-01-01',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockAssembly: Assembly = {
  id: 'assembly-1',
  name: 'Test Assembly',
  description: 'Test Description',
  notes: 'Test Notes',
  isComplete: true,
  components: [
    {
      id: 'ac-1',
      assemblyId: 'assembly-1',
      componentId: 'comp-1',
      componentName: 'PLC',
      quantity: 2,
      sortOrder: 1,
      component: mockComponents[0],
    },
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

// Mock the contexts
vi.mock('../../../contexts/CPQContext', () => ({
  useCPQ: () => ({
    components: mockComponents,
    addAssembly: vi.fn(),
    updateAssembly: vi.fn(),
  }),
}));

describe('AssemblyForm - Unsaved Changes Confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New Assembly', () => {
    it('should NOT show confirmation when closing empty form', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AssemblyForm isOpen={true} onClose={onClose} />);

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should close directly without confirmation
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/שינויים לא נשמרו/i)).not.toBeInTheDocument();
    });

    it('should show confirmation when closing form with unsaved name', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AssemblyForm isOpen={true} onClose={onClose} />);

      // Type in name field
      const nameInput = screen.getByLabelText(/שם ההרכבה/i);
      await user.type(nameInput, 'New Assembly');

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/יש שינויים שלא נשמרו/i)).toBeInTheDocument();

      // onClose should NOT be called yet
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should close when user confirms in dialog', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AssemblyForm isOpen={true} onClose={onClose} />);

      // Make a change
      const nameInput = screen.getByLabelText(/שם ההרכבה/i);
      await user.type(nameInput, 'Test');

      // Try to close
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });

      // Click confirm close button
      const confirmButton = screen.getByRole('button', { name: /כן, סגור/i });
      await user.click(confirmButton);

      // Should close now
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should NOT close when user cancels in confirmation dialog', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<AssemblyForm isOpen={true} onClose={onClose} />);

      // Make a change
      const nameInput = screen.getByLabelText(/שם ההרכבה/i);
      await user.type(nameInput, 'Test');

      // Try to close
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });

      // Click cancel in confirmation dialog (stay in form)
      const cancelConfirmButton = screen.getByRole('button', {
        name: /חזור/i,
      });
      await user.click(cancelConfirmButton);

      // Should NOT close
      expect(onClose).not.toHaveBeenCalled();

      // Confirmation dialog should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/שינויים לא נשמרו/i)).not.toBeInTheDocument();
      });

      // Form should still be visible with the changes
      expect(nameInput).toHaveValue('Test');
    });
  });

  describe('Edit Existing Assembly', () => {
    it('should NOT show confirmation when closing without changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <AssemblyForm isOpen={true} onClose={onClose} assembly={mockAssembly} />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Assembly')).toBeInTheDocument();
      });

      // Click cancel without making changes
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should close directly
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/שינויים לא נשמרו/i)).not.toBeInTheDocument();
    });

    it('should show confirmation when modifying name', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <AssemblyForm isOpen={true} onClose={onClose} assembly={mockAssembly} />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Assembly')).toBeInTheDocument();
      });

      // Modify name
      const nameInput = screen.getByLabelText(/שם ההרכבה/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Assembly');

      // Try to close
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should show confirmation when modifying component quantity', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <AssemblyForm isOpen={true} onClose={onClose} assembly={mockAssembly} />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Assembly')).toBeInTheDocument();
      });

      // Find and modify quantity input
      const quantityInput = screen.getByLabelText(/כמות/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Try to close
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should show confirmation when removing component', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <AssemblyForm isOpen={true} onClose={onClose} assembly={mockAssembly} />
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Assembly')).toBeInTheDocument();
      });

      // Find and click remove button for the component
      const componentRow = screen.getByText('PLC').closest('div');
      const removeButton = within(componentRow!).getByRole('button');
      await user.click(removeButton);

      // Try to close
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      await user.click(cancelButton);

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/שינויים לא נשמרו/i)).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
