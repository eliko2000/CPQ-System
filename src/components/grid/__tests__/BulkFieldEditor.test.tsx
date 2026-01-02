/**
 * BulkFieldEditor Tests
 *
 * Tests for the ClickUp-style bulk field editor component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent as __fireEvent,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkFieldEditor, BulkFieldConfig } from '../BulkFieldEditor';

describe('BulkFieldEditor', () => {
  const mockOnSave = vi.fn();

  const defaultFields: BulkFieldConfig[] = [
    { key: 'supplier', label: 'ספק', type: 'text', clearable: false },
    { key: 'manufacturer', label: 'יצרן', type: 'text' },
    {
      key: 'category',
      label: 'קטגוריה',
      type: 'select',
      options: ['Electronics', 'Mechanical', 'Software'],
      clearable: false,
    },
    { key: 'description', label: 'תיאור', type: 'text' },
    { key: 'notes', label: 'הערות', type: 'text' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the שדות button', () => {
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);
      expect(screen.getByRole('button', { name: /שדות/i })).toBeInTheDocument();
    });

    it('disables button when disabled prop is true', () => {
      render(
        <BulkFieldEditor fields={defaultFields} onSave={mockOnSave} disabled />
      );
      expect(screen.getByRole('button', { name: /שדות/i })).toBeDisabled();
    });
  });

  describe('Dropdown Menu', () => {
    it('shows field options when clicking the button', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));

      await waitFor(() => {
        expect(screen.getByText('ספק')).toBeInTheDocument();
        expect(screen.getByText('יצרן')).toBeInTheDocument();
        expect(screen.getByText('קטגוריה')).toBeInTheDocument();
        expect(screen.getByText('תיאור')).toBeInTheDocument();
        expect(screen.getByText('הערות')).toBeInTheDocument();
      });
    });
  });

  describe('Editor Panel', () => {
    it('shows editor panel when selecting a text field', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן תיאור/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /שמור/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /ביטול/i })
        ).toBeInTheDocument();
      });
    });

    it('shows clear checkbox for clearable fields', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור')); // clearable: true (default)

      await waitFor(() => {
        expect(screen.getByText('נקה')).toBeInTheDocument();
      });
    });

    it('hides clear checkbox for non-clearable fields', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('ספק')); // clearable: false

      await waitFor(() => {
        expect(screen.queryByText('נקה')).not.toBeInTheDocument();
      });
    });

    it('closes editor panel when clicking cancel', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן תיאור/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /ביטול/i }));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText(/הזן תיאור/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave with field value when saving text field', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן תיאור/i)).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/הזן תיאור/i),
        'New description'
      );
      await user.click(screen.getByRole('button', { name: /שמור/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          field: 'description',
          value: 'New description',
          clear: false,
        });
      });
    });

    it('calls onSave with clear flag when clear checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('הערות'));

      await waitFor(() => {
        expect(screen.getByText('נקה')).toBeInTheDocument();
      });

      // Click the clear checkbox
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: /שמור/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          field: 'notes',
          value: '',
          clear: true,
        });
      });
    });

    it('disables save button when no changes made', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /שמור/i })).toBeDisabled();
      });
    });

    it('enables save button when text is entered', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן תיאור/i)).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/הזן תיאור/i), 'test');

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /שמור/i })
        ).not.toBeDisabled();
      });
    });

    it('closes editor and resets state after successful save', async () => {
      mockOnSave.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('תיאור'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן תיאור/i)).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/הזן תיאור/i), 'test');
      await user.click(screen.getByRole('button', { name: /שמור/i }));

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText(/הזן תיאור/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Select Field Type', () => {
    it('renders select dropdown for select type fields', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('קטגוריה'));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });
  });

  describe('Clear Checkbox Behavior', () => {
    it('clears input value when clear checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('הערות'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן הערות/i)).toBeInTheDocument();
      });

      // Type something first
      const input = screen.getByPlaceholderText(/הזן הערות/i);
      await user.type(input, 'Some notes');
      expect(input).toHaveValue('Some notes');

      // Check the clear checkbox
      await user.click(screen.getByRole('checkbox'));

      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('disables input when clear checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<BulkFieldEditor fields={defaultFields} onSave={mockOnSave} />);

      await user.click(screen.getByRole('button', { name: /שדות/i }));
      await user.click(screen.getByText('הערות'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/הזן הערות/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('checkbox'));

      expect(screen.getByPlaceholderText(/השדה יימחק/i)).toBeDisabled();
    });
  });
});
