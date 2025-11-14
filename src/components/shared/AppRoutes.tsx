import { useCPQ } from '../../contexts/CPQContext'
import { Dashboard } from '../dashboard/Dashboard'
import { QuoteIngestion } from '../ingestion/QuoteIngestion'
import { ComponentLibrary } from '../library/ComponentLibrary'
import { ProjectList } from '../projects/ProjectList'
import { ProjectDetailPage } from '../projects/ProjectDetailPage'
import { BOMEditor } from '../projects/BOMEditor'
import { Analytics } from '../analytics/Analytics'
import { QuotationEditor } from '../quotations/QuotationEditor'
import { QuotationList } from '../quotations/QuotationList'
import { SettingsPage } from '../settings/SettingsPage'
import { useQuotations } from '../../hooks/useQuotations'
import { useProjects } from '../../hooks/useProjects'
import { convertDbQuotationToQuotationProject } from '../../lib/utils'
import { loadDefaultQuotationParameters } from '../../utils/quotationCalculations'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'

export function AppRoutes() {
  const {
    uiState,
    currentProject,
    currentQuotation,
    setCurrentQuotation,
    viewingProjectId,
    setViewingProjectId
  } = useCPQ()
  const { getQuotation } = useQuotations()
  const { getProject } = useProjects()

  // If we have a current quotation, show quotation editor
  if (currentQuotation) {
    return <QuotationEditor />
  }

  // If we have a current project, show BOM editor
  if (currentProject) {
    return <BOMEditor />
  }

  // Handle quotation viewing
  const handleViewQuotation = async (quotationId: string) => {
    const quotation = await getQuotation(quotationId)
    if (quotation) {
      const quotationProject = convertDbQuotationToQuotationProject(quotation)
      setCurrentQuotation(quotationProject)
    }
  }

  // Handle quotation creation
  const handleCreateQuotation = async (projectId: string) => {
    try {
      // Get project data to populate quotation
      const project = await getProject(projectId)

      if (!project) {
        toast.error('לא ניתן למצוא את הפרויקט')
        return
      }

      // Load default parameters
      const defaultParams = await loadDefaultQuotationParameters()

      // Create new quotation with project data
      const { data: newQuotation, error } = await supabase
        .from('quotations')
        .insert([{
          quotation_number: `Q-${Date.now()}`,
          customer_name: project.company_name,
          project_name: project.project_name,
          project_id: projectId,
          currency: 'ILS',
          exchange_rate: defaultParams.usdToIlsRate,
          margin_percentage: defaultParams.markupPercent,
          status: 'draft',
          total_cost: 0,
          total_price: 0
        }])
        .select(`
          *,
          quotation_systems (
            *,
            quotation_items (
              *,
              component:components (*)
            )
          )
        `)
        .single()

      if (error) throw error

      if (newQuotation) {
        const quotationProject = convertDbQuotationToQuotationProject(newQuotation)
        setCurrentQuotation(quotationProject)
        setViewingProjectId(null)
      }
    } catch (error) {
      console.error('Failed to create quotation:', error)
      toast.error('שגיאה ביצירת הצעת מחיר')
    }
  }

  // If viewing a project detail page
  if (viewingProjectId && uiState.activeView === 'projects') {
    return (
      <ProjectDetailPage
        projectId={viewingProjectId}
        onBack={() => setViewingProjectId(null)}
        onViewQuotation={handleViewQuotation}
        onCreateQuotation={handleCreateQuotation}
      />
    )
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
      return <ProjectList onViewProject={(projectId) => setViewingProjectId(projectId)} />
    case 'analytics':
      return <Analytics />
    case 'settings':
      return <SettingsPage />
    default:
      return <Dashboard />
  }
}
