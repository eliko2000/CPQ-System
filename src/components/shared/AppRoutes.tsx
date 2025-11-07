import { useCPQ } from '../../contexts/CPQContext'
import { Dashboard } from '../dashboard/Dashboard'
import { QuoteIngestion } from '../ingestion/QuoteIngestion'
import { ComponentLibrary } from '../library/ComponentLibrary'
import { ProjectList } from '../projects/ProjectList'
import { BOMEditor } from '../projects/BOMEditor'
import { Analytics } from '../analytics/Analytics'
import { QuotationEditor } from '../quotations/QuotationEditor'
import { QuotationList } from '../quotations/QuotationList'
import { SettingsPage } from '../settings/SettingsPage'

export function AppRoutes() {
  const { uiState, currentProject, currentQuotation } = useCPQ()

  // If we have a current quotation, show quotation editor
  if (currentQuotation) {
    return <QuotationEditor />
  }

  // If we have a current project, show BOM editor
  if (currentProject) {
    return <BOMEditor />
  }

  // Otherwise, show view based on active state
  switch (uiState.activeView) {
    case 'dashboard':
      return <Dashboard />
    case 'quotes':
      return <QuoteIngestion />
    case 'quotations':
      return <QuotationList />
    case 'components':
      return <ComponentLibrary />
    case 'projects':
      return <ProjectList />
    case 'analytics':
      return <Analytics />
    case 'settings':
      return <SettingsPage />
    default:
      return <Dashboard />
  }
}
