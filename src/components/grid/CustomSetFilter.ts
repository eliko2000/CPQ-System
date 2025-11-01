import { IFilterComp, IFilterParams, IDoesFilterPassParams } from 'ag-grid-community'

export class CustomSetFilter implements IFilterComp {
  private filterValues: string[] = []
  private params!: IFilterParams
  private eGui!: HTMLDivElement

  init(params: IFilterParams): void {
    this.params = params
    this.eGui = document.createElement('div')
    this.eGui.innerHTML = `
      <div style="padding: 10px;">
        <div style="font-size: 12px; color: #666;">
          Custom filter active - use header filter button
        </div>
      </div>
    `
  }

  getGui(): HTMLElement {
    return this.eGui
  }

  doesFilterPass(params: IDoesFilterPassParams): boolean {
    // If no filter values selected, show all rows
    if (this.filterValues.length === 0) {
      return true
    }

    // Get the value from the node - try multiple approaches
    let value: any

    // Try using valueGetter if available
    if (this.params.valueGetter) {
      try {
        value = this.params.valueGetter(params.node)
      } catch (e) {
        console.error('Error getting value:', e)
      }
    }

    // Fallback to direct data access
    if (value === undefined || value === null) {
      const colId = this.params.column?.getColId()
      value = params.node.data?.[colId as string]
    }

    const stringValue = String(value)

    // Check if the value is in the selected filter values
    return this.filterValues.includes(stringValue)
  }

  isFilterActive(): boolean {
    return this.filterValues.length > 0
  }

  getModel(): any {
    if (this.filterValues.length === 0) {
      return null
    }
    return { values: this.filterValues }
  }

  setModel(model: any): void | Promise<void> {
    if (model == null) {
      this.filterValues = []
    } else if (model.values && Array.isArray(model.values)) {
      this.filterValues = model.values.map((v: any) => String(v))
    }
  }

  onNewRowsLoaded(): void {
    // Optional: called when new rows are loaded
  }

  onAnyFilterChanged(): void {
    // Optional: called when any filter changes
  }

  destroy(): void {
    // Cleanup if needed
  }
}
