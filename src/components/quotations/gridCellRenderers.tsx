import { memo } from 'react';
import { ICellRendererParams, ICellEditorParams } from 'ag-grid-community';

// Custom cell renderer for system headers (bold) - Memoized to prevent unnecessary re-renders
export const SystemHeaderRenderer = memo((props: ICellRendererParams) => {
  if (props.data?.isSystemGroup) {
    return (
      <div className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
        {props.value}
      </div>
    );
  }
  return props.value;
});
SystemHeaderRenderer.displayName = 'SystemHeaderRenderer';

// Custom cell renderer for currency values - Memoized for performance
export const CurrencyRenderer = memo((props: ICellRendererParams) => {
  const value = props.value;
  if (value == null) return '-';

  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
  }).format(value);

  return <span className="font-mono text-sm">{formatted}</span>;
});
CurrencyRenderer.displayName = 'CurrencyRenderer';

// Custom cell renderer for USD currency - Memoized for performance
export const USDCurrencyRenderer = memo((props: ICellRendererParams) => {
  const value = props.value;
  if (value == null) return '-';

  return (
    <span className="font-mono text-sm">${value?.toFixed(2) || '0.00'}</span>
  );
});
USDCurrencyRenderer.displayName = 'USDCurrencyRenderer';

// Simple text editor for system names
export class SystemNameEditor {
  private eInput!: HTMLInputElement;
  private params!: ICellEditorParams;
  private value!: string;
  private boundKeyDown!: (event: KeyboardEvent) => void;
  private boundBlur!: () => void;
  private boundInput!: () => void;

  // gets called once before renderer is used
  init(params: ICellEditorParams): void {
    this.params = params;
    this.value = params.value || '';

    // create cell editor
    this.eInput = document.createElement('input');
    this.eInput.type = 'text';
    this.eInput.value = this.value;
    this.eInput.placeholder = 'שם מערכת...';
    this.eInput.className =
      'w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';

    // Create bound references once to avoid memory leaks
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundBlur = this.onBlur.bind(this);
    this.boundInput = this.onInput.bind(this);

    // add event listeners using bound references
    this.eInput.addEventListener('keydown', this.boundKeyDown);
    this.eInput.addEventListener('blur', this.boundBlur);
    this.eInput.addEventListener('input', this.boundInput);
  }

  // gets called once when grid is ready to insert the element
  getGui(): HTMLElement {
    return this.eInput;
  }

  // Called by AG Grid after editor is attached to DOM
  // This ensures focus happens after render is complete
  afterGuiAttached(): void {
    if (this.eInput) {
      this.eInput.focus();
      this.eInput.select();
    }
  }

  // focus and select the text
  focusIn(): void {
    if (this.eInput) {
      this.eInput.focus();
      this.eInput.select();
    }
  }

  // returns the new value after editing
  getValue(): string {
    return this.eInput.value;
  }

  // when user presses Enter or Escape
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.params.api.stopEditing();
    } else if (event.key === 'Escape') {
      this.params.api.stopEditing(true);
    }
  }

  // when user clicks outside
  private onBlur(): void {
    this.params.api.stopEditing();
  }

  // update value on input
  private onInput(): void {
    this.value = this.eInput.value;
  }

  // destroy the editor
  destroy(): void {
    // Remove using same references to properly clean up
    this.eInput.removeEventListener('keydown', this.boundKeyDown);
    this.eInput.removeEventListener('blur', this.boundBlur);
    this.eInput.removeEventListener('input', this.boundInput);
  }

  // returns false if we don't want a popup
  isPopup(): boolean {
    return false;
  }

  // if refresh, update the value
  refresh(params: ICellEditorParams): boolean {
    this.value = params.value || '';
    this.eInput.value = this.value;
    return true;
  }
}
