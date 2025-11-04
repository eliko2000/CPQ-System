import { useCPQ } from '../../contexts/CPQContext'
import { convertDbQuotationToQuotationProject } from '../../lib/utils'
import { QuotationDataGrid } from './QuotationDataGrid'

export function QuotationList() {
  const { setCurrentQuotation } = useCPQ()

  const handleSelectQuotation = (quotation: any) => {
    // Convert DbQuotation to QuotationProject if needed
    const quotationProject = quotation.quotation_systems
      ? convertDbQuotationToQuotationProject(quotation)
      : quotation
    setCurrentQuotation(quotationProject)
  }

  return (
    <QuotationDataGrid
      onQuotationSelect={handleSelectQuotation}
      onQuotationEdit={handleSelectQuotation}
    />
  )
}
