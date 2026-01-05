/**
 * Regression tests for description field editing in AIExtractionPreview
 * Bug: Description edits were not being saved when importing components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIExtractionPreview } from '../AIExtractionPreview';
import type { AIExtractionResult } from '../../../services/claudeAI';
import type { Component } from '../../../types';

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    // Mock any icons used in the component
    CheckCircle: () => <div data-testid="check-circle-icon" />,
    Edit2: () => <div data-testid="edit2-icon" />,
    Trash2: () => <div data-testid="trash2-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
    TrendingUp: () => <div data-testid="trending-up-icon" />,
    Package: () => <div data-testid="package-icon" />,
    Sparkles: () => <div data-testid="sparkles-icon" />,
    GitMerge: () => <div data-testid="git-merge-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    FileText: () => <div data-testid="file-text-icon" />,
    PanelLeftClose: () => <div data-testid="panel-left-close-icon" />,
    PanelLeft: () => <div data-testid="panel-left-icon" />,
    Maximize2: () => <div data-testid="maximize2-icon" />,
  };
});

// Mock dependencies
vi.mock('../../../contexts/TeamContext', () => ({
  useTeam: () => ({
    currentTeam: { id: 'team-1', name: 'Test Team' },
  }),
}));

vi.mock('../../../constants/settings', () => ({
  getComponentCategories: () => ['רובוטים', 'בקרים', 'חיישנים', 'אחר'],
  CATEGORIES_UPDATED_EVENT: 'categories-updated',
}));

describe('AIExtractionPreview - Description Field Editing', () => {
  const mockExtractionResult: AIExtractionResult = {
    success: true,
    components: [
      {
        name: 'רובוט תעשייתי',
        description: 'תיאור ראשוני',
        manufacturer: 'Dobot',
        manufacturerPN: 'CRA20',
        category: 'רובוטים',
        unitPriceUSD: 5000,
        currency: 'USD',
        confidence: 0.95,
      },
      {
        name: 'בקר PLC',
        description: undefined, // No description initially
        manufacturer: 'Siemens',
        manufacturerPN: 'S7-1200',
        category: 'בקרים',
        unitPriceUSD: 800,
        currency: 'USD',
        confidence: 0.9,
      },
    ],
    metadata: {
      documentType: 'excel',
      totalItems: 2,
      supplier: 'Test Supplier',
    },
    confidence: 0.925,
  };

  it('should preserve existing description from AI extraction', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Initial description should be visible
    expect(screen.getByText('תיאור ראשוני')).toBeInTheDocument();
  });

  it('should allow editing description and preserve changes', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Find and click the edit button for the first component
    const editButtons = screen.getAllByTitle('ערוך');
    fireEvent.click(editButtons[0]);

    // Find the description textarea
    const descriptionTextarea = screen.getByDisplayValue('תיאור ראשוני');
    expect(descriptionTextarea).toBeInTheDocument();

    // Edit the description
    fireEvent.change(descriptionTextarea, {
      target: { value: 'תיאור מעודכן עם פרטים נוספים' },
    });

    // Close edit mode
    fireEvent.click(editButtons[0]);

    // Verify description is displayed after editing
    await waitFor(() => {
      expect(
        screen.getByText('תיאור מעודכן עם פרטים נוספים')
      ).toBeInTheDocument();
    });
  });

  it('should allow adding description to component without one', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Find and click the edit button for the second component (no description)
    const editButtons = screen.getAllByTitle('ערוך');
    fireEvent.click(editButtons[1]);

    // Find all description textareas (there should be one for editing mode)
    const textareas = screen.getAllByPlaceholderText('תיאור הרכיב');
    const descriptionTextarea = textareas[textareas.length - 1]; // Get the one for the second component

    // Add a new description
    fireEvent.change(descriptionTextarea, {
      target: { value: 'בקר לוגי ניתן לתכנות עם 16 כניסות/יציאות' },
    });

    // Close edit mode
    fireEvent.click(editButtons[1]);

    // Verify description is displayed after adding
    await waitFor(() => {
      expect(
        screen.getByText('בקר לוגי ניתן לתכנות עם 16 כניסות/יציאות')
      ).toBeInTheDocument();
    });
  });

  it('should pass edited description to onConfirm when importing', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Edit description of first component
    const editButtons = screen.getAllByTitle('ערוך');
    fireEvent.click(editButtons[0]);

    const descriptionTextarea = screen.getByDisplayValue('תיאור ראשוני');
    fireEvent.change(descriptionTextarea, {
      target: { value: 'תיאור חדש לבדיקה' },
    });

    // Close edit mode
    fireEvent.click(editButtons[0]);

    // Click import button
    const importButton = screen.getByText('ייבא לספרייה');
    fireEvent.click(importButton);

    // Verify onConfirm was called with the edited description
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    const confirmedComponents = onConfirm.mock
      .calls[0][0] as Partial<Component>[];
    expect(confirmedComponents).toHaveLength(2);
    expect(confirmedComponents[0].description).toBe('תיאור חדש לבדיקה');
  });

  it('should preserve description when editing other fields', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Edit the first component
    const editButtons = screen.getAllByTitle('ערוך');
    fireEvent.click(editButtons[0]);

    // Edit manufacturer field (not description)
    const manufacturerInputs = screen.getAllByDisplayValue('Dobot');
    fireEvent.change(manufacturerInputs[0], {
      target: { value: 'Dobot Inc.' },
    });

    // Close edit mode
    fireEvent.click(editButtons[0]);

    // Click import button
    const importButton = screen.getByText('ייבא לספרייה');
    fireEvent.click(importButton);

    // Verify description is still preserved
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    const confirmedComponents = onConfirm.mock
      .calls[0][0] as Partial<Component>[];
    expect(confirmedComponents[0].description).toBe('תיאור ראשוני');
    expect(confirmedComponents[0].manufacturer).toBe('Dobot Inc.');
  });

  it('should mark component as modified when description is edited', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AIExtractionPreview
        extractionResult={mockExtractionResult}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Edit description
    const editButtons = screen.getAllByTitle('ערוך');
    fireEvent.click(editButtons[0]);

    const descriptionTextarea = screen.getByDisplayValue('תיאור ראשוני');
    fireEvent.change(descriptionTextarea, {
      target: { value: 'תיאור מעודכן' },
    });

    // Close edit mode
    fireEvent.click(editButtons[0]);

    // Verify the component is marked as modified (should have yellow background)
    const componentCard = descriptionTextarea.closest('.border-yellow-300');
    expect(componentCard).toBeInTheDocument();
  });
});
