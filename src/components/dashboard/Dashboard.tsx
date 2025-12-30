// Action-Oriented Dashboard - Helps users know what needs attention
// Redesigned to provide real value instead of vanity metrics

import { useMemo, useState } from 'react';
import { useCPQ } from '../../contexts/CPQContext';
import { useQuotations } from '../../hooks/useQuotations';
import { useComponents } from '../../hooks/useComponents';
import { useProjects } from '../../hooks/useProjects';
import { subDays, addDays, startOfMonth, isWithinInterval } from 'date-fns';
import type { DbQuotation } from '../../types/quotation.types';
import { convertDbQuotationToQuotationProject } from '../../lib/utils';

// Dashboard components
import { QuotePipeline } from './QuotePipeline';
import { NeedsAttention } from './NeedsAttention';
import { ContinueWorking } from './ContinueWorking';
import { PerformanceMetrics } from './PerformanceMetrics';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { DASHBOARD_CONFIG } from './dashboardConfig';

// Dialogs
import { ProjectPicker } from '../quotations/ProjectPicker';
import { ProjectFormModal } from '../projects/ProjectFormModal';
import { ComponentForm } from '../library/ComponentForm';
import { IntelligentDocumentUpload } from '../library/IntelligentDocumentUpload';
import { AIExtractionPreview } from '../library/AIExtractionPreview';
import { useTeam } from '../../contexts/TeamContext';
import {
  generateProjectNumber,
  generateQuotationNumber,
} from '../../services/numberingService';
import { loadDefaultQuotationParameters } from '../../utils/quotationCalculations';
import { logger } from '../../lib/logger';
import type { AIExtractionResult } from '../../services/claudeAI';
import type { ProjectFormData } from '../../types';

export function Dashboard() {
  const { setActiveView, setCurrentQuotation } = useCPQ();
  const {
    quotations,
    loading: quotationsLoading,
    getQuotation,
    addQuotation,
  } = useQuotations();
  const { loading: componentsLoading } = useComponents();
  const { loading: projectsLoading, addProject } = useProjects();
  const { currentTeam } = useTeam();

  // State for dialogs
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [extractionResult, setExtractionResult] = useState<{
    result: AIExtractionResult;
    file: File;
  } | null>(null);
  const [_creatingNew, setCreatingNew] = useState(false);

  const isLoading = quotationsLoading || componentsLoading || projectsLoading;

  // Calculate pipeline data (quotes by status with values)
  const pipelineData = useMemo(() => {
    const pipeline = {
      draft: { count: 0, value: 0 },
      sent: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    };

    quotations.forEach(q => {
      const value = q.total_price || 0;
      // Map accepted/rejected to won/lost for pipeline display
      const status =
        q.status === 'accepted'
          ? 'won'
          : q.status === 'rejected'
            ? 'lost'
            : q.status;

      if (status in pipeline) {
        pipeline[status as keyof typeof pipeline].count += 1;
        pipeline[status as keyof typeof pipeline].value += value;
      }
    });

    return pipeline;
  }, [quotations]);

  // Calculate "needs attention" items
  const attentionData = useMemo(() => {
    const now = new Date();
    const staleDaysAgo = subDays(now, DASHBOARD_CONFIG.STALE_DRAFT_DAYS);
    const awaitingDaysAgo = subDays(
      now,
      DASHBOARD_CONFIG.AWAITING_RESPONSE_DAYS
    );
    const expiringWindow = addDays(now, DASHBOARD_CONFIG.EXPIRING_SOON_DAYS);

    // Stale drafts: drafts older than X days
    const staleDrafts = quotations.filter(
      q => q.status === 'draft' && new Date(q.created_at) < staleDaysAgo
    );

    // Expiring soon: quotes with valid_until_date within the window
    const expiringSoon = quotations.filter(q => {
      if (!q.valid_until_date) return false;
      const expiryDate = new Date(q.valid_until_date);
      // Exclude closed quotes (accepted, rejected, expired)
      const isOpen = q.status === 'draft' || q.status === 'sent';
      return (
        isWithinInterval(expiryDate, { start: now, end: expiringWindow }) &&
        isOpen
      );
    });

    // Awaiting response: sent quotes with no update for X days
    const awaitingResponse = quotations.filter(
      q => q.status === 'sent' && new Date(q.updated_at) < awaitingDaysAgo
    );

    // Follow-up due: quotes with follow_up_date <= today
    const followUpDue = quotations.filter(q => {
      if (!q.follow_up_date) return false;
      const followUpDate = new Date(q.follow_up_date);
      // Only show for open quotes (draft or sent)
      const isOpen = q.status === 'draft' || q.status === 'sent';
      return followUpDate <= now && isOpen;
    });

    // High priority: quotes marked as high or urgent
    const highPriority = quotations.filter(q => {
      // Only show for open quotes (draft or sent)
      const isOpen = q.status === 'draft' || q.status === 'sent';
      return (q.priority === 'high' || q.priority === 'urgent') && isOpen;
    });

    return {
      staleDrafts: {
        type: 'stale' as const,
        count: staleDrafts.length,
        quotations: staleDrafts,
      },
      expiringSoon: {
        type: 'expiring' as const,
        count: expiringSoon.length,
        quotations: expiringSoon,
      },
      awaitingResponse: {
        type: 'awaiting' as const,
        count: awaitingResponse.length,
        quotations: awaitingResponse,
      },
      followUpDue: {
        type: 'followup' as const,
        count: followUpDue.length,
        quotations: followUpDue,
      },
      highPriority: {
        type: 'priority' as const,
        count: highPriority.length,
        quotations: highPriority,
      },
    };
  }, [quotations]);

  // Get most recent draft for "Continue Working"
  const recentDraft = useMemo(() => {
    const drafts = quotations.filter(q => q.status === 'draft');
    if (drafts.length === 0) return null;

    return drafts.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
  }, [quotations]);

  // Calculate performance metrics for current month
  const performanceData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subDays(monthStart, 1));

    // This month's data
    const thisMonthQuotes = quotations.filter(
      q => new Date(q.updated_at) >= monthStart
    );
    // 'accepted' = won, 'rejected' = lost
    const thisMonthWon = thisMonthQuotes.filter(q => q.status === 'accepted');
    const thisMonthLost = thisMonthQuotes.filter(q => q.status === 'rejected');

    const wonValue = thisMonthWon.reduce(
      (sum, q) => sum + (q.total_price || 0),
      0
    );
    const wonCount = thisMonthWon.length;
    const lostCount = thisMonthLost.length;
    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

    // Average margin from won quotes
    const quotesWithMargin = thisMonthWon.filter(
      q => q.margin_percentage !== null && q.margin_percentage !== undefined
    );
    const avgMargin =
      quotesWithMargin.length > 0
        ? quotesWithMargin.reduce(
            (sum, q) => sum + (q.margin_percentage || 0),
            0
          ) / quotesWithMargin.length
        : 0;

    // Previous month's data for comparison
    const prevMonthQuotes = quotations.filter(q => {
      const date = new Date(q.updated_at);
      return date >= prevMonthStart && date < monthStart;
    });
    const prevMonthWon = prevMonthQuotes.filter(q => q.status === 'accepted');
    const prevMonthLost = prevMonthQuotes.filter(q => q.status === 'rejected');
    const prevWonValue = prevMonthWon.reduce(
      (sum, q) => sum + (q.total_price || 0),
      0
    );
    const prevTotalClosed = prevMonthWon.length + prevMonthLost.length;
    const prevWinRate =
      prevTotalClosed > 0 ? (prevMonthWon.length / prevTotalClosed) * 100 : 0;
    const prevQuotesWithMargin = prevMonthWon.filter(
      q => q.margin_percentage !== null && q.margin_percentage !== undefined
    );
    const prevAvgMargin =
      prevQuotesWithMargin.length > 0
        ? prevQuotesWithMargin.reduce(
            (sum, q) => sum + (q.margin_percentage || 0),
            0
          ) / prevQuotesWithMargin.length
        : 0;

    return {
      current: {
        wonValue,
        winRate,
        avgMargin,
        wonCount,
        lostCount,
        periodLabel: 'החודש',
      },
      previous: {
        wonValue: prevWonValue,
        winRate: prevWinRate,
        avgMargin: prevAvgMargin,
      },
    };
  }, [quotations]);

  // Handlers
  const handleContinueEditing = async (quotation: DbQuotation) => {
    // Load the full quotation and navigate to quotes view
    const fullQuotation = await getQuotation(quotation.id);
    if (fullQuotation) {
      // Convert DbQuotation to QuotationProject format expected by setCurrentQuotation
      const quotationProject =
        convertDbQuotationToQuotationProject(fullQuotation);
      setCurrentQuotation(quotationProject);
    }
    setActiveView('quotes');
  };

  const handleStatusClick = (status: 'draft' | 'sent' | 'won' | 'lost') => {
    // Map display status to database status
    const dbStatus =
      status === 'won' ? 'accepted' : status === 'lost' ? 'rejected' : status;
    // Navigate to quotations view (user's quotes to customers) with status filter
    setActiveView('quotations', { statusFilter: dbStatus as any });
  };

  const handleAttentionItemClick = async (
    _type: string,
    items: DbQuotation[]
  ) => {
    // For now, navigate to quotations view
    // In the future, could open a filtered view or modal
    if (items.length > 0) {
      const fullQuotation = await getQuotation(items[0].id);
      if (fullQuotation) {
        // Convert DbQuotation to QuotationProject format expected by setCurrentQuotation
        const quotationProject =
          convertDbQuotationToQuotationProject(fullQuotation);
        setCurrentQuotation(quotationProject);
      }
      setActiveView('quotations');
    }
  };

  // Handle new quotation creation - called after project is selected
  const handleProjectSelected = async (project: {
    id: string;
    project_name?: string;
    company_name?: string;
    project_number?: string;
  }) => {
    setShowProjectPicker(false);
    setCreatingNew(true);

    try {
      if (!currentTeam) throw new Error('No active team');

      // Load default pricing settings
      const defaultParams = await loadDefaultQuotationParameters(
        currentTeam.id
      );

      // Generate quotation number
      let quotationNumber = `Q-${Date.now()}`; // Fallback
      let projectNumber = project.project_number;

      if (!projectNumber) {
        try {
          projectNumber = await generateProjectNumber(currentTeam.id);
        } catch (err) {
          logger.warn('Could not generate project number:', err);
        }
      }

      if (projectNumber) {
        try {
          quotationNumber = await generateQuotationNumber(
            currentTeam.id,
            projectNumber
          );
        } catch (err) {
          logger.warn('Could not generate quotation number:', err);
        }
      }

      const newQuotation = await addQuotation({
        quotation_number: quotationNumber,
        version: 1,
        customer_name: project.company_name || '',
        project_name: project.project_name || '',
        project_id: project.id,
        currency: 'ILS',
        exchange_rate: defaultParams.usdToIlsRate,
        eur_to_ils_rate: defaultParams.eurToIlsRate,
        margin_percentage: defaultParams.markupPercent,
        day_work_cost: defaultParams.dayWorkCost,
        risk_percentage: defaultParams.riskPercent,
        status: 'draft',
        total_cost: 0,
        total_price: 0,
      });

      if (newQuotation) {
        const quotationProject =
          convertDbQuotationToQuotationProject(newQuotation);
        setCurrentQuotation(quotationProject);
        setActiveView('quotes');
      }
    } catch (error) {
      logger.error('Failed to create quotation:', error);
      alert('שגיאה ביצירת הצעת מחיר');
    } finally {
      setCreatingNew(false);
    }
  };

  // Handle new project creation
  const handleCreateProject = async (projectData: ProjectFormData) => {
    try {
      await addProject(projectData);
      setShowNewProjectModal(false);
      // Navigate to projects page to see the new project
      setActiveView('projects');
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error; // Let the modal handle the error
    }
  };

  // Handle file extraction complete (from IntelligentDocumentUpload)
  const handleExtractionComplete = (
    result: AIExtractionResult,
    file: File,
    _msrpOptions: any
  ) => {
    setShowUploadDialog(false);
    setExtractionResult({ result, file });
  };

  // Handle extraction preview close
  const handleExtractionPreviewClose = () => {
    setExtractionResult(null);
  };

  return (
    <div className="space-y-6 p-1" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">לוח בקרה</h1>
        <p className="text-sm text-muted-foreground">
          סקירה מהירה של הפעילות והמשימות שלך
        </p>
      </div>

      {/* Quote Pipeline - User's quotations to customers */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          צינור הצעות מחיר
        </h2>
        <QuotePipeline
          data={pipelineData}
          isLoading={isLoading}
          onStatusClick={handleStatusClick}
        />
      </section>

      {/* Needs Attention */}
      <section>
        <NeedsAttention
          staleDrafts={attentionData.staleDrafts}
          expiringSoon={attentionData.expiringSoon}
          awaitingResponse={attentionData.awaitingResponse}
          followUpDue={attentionData.followUpDue}
          highPriority={attentionData.highPriority}
          isLoading={isLoading}
          onItemClick={handleAttentionItemClick}
        />
      </section>

      {/* Two Column Layout: Continue Working + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Continue Working */}
        <section>
          <ContinueWorking
            recentDraft={recentDraft}
            isLoading={isLoading}
            onContinue={handleContinueEditing}
          />
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActions
            onNewQuote={() => setShowProjectPicker(true)}
            onNewProject={() => setShowNewProjectModal(true)}
            onAddComponent={() => setShowComponentForm(true)}
            onUploadFile={() => setShowUploadDialog(true)}
          />
        </section>
      </div>

      {/* Performance Metrics */}
      <section>
        <PerformanceMetrics
          data={performanceData.current}
          previousPeriod={performanceData.previous}
          isLoading={isLoading}
        />
      </section>

      {/* Recent Activity */}
      <section>
        <RecentActivity maxItems={5} />
      </section>

      {/* Project Picker Dialog for New Quotation */}
      {showProjectPicker && (
        <ProjectPicker
          isOpen={showProjectPicker}
          onClose={() => setShowProjectPicker(false)}
          onSelect={handleProjectSelected}
          currentProjectId={null}
        />
      )}

      {/* New Project Modal */}
      <ProjectFormModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSubmit={handleCreateProject}
      />

      {/* Component Form Modal */}
      <ComponentForm
        isOpen={showComponentForm}
        onClose={() => setShowComponentForm(false)}
      />

      {/* File Upload Dialog */}
      {showUploadDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          dir="rtl"
        >
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <IntelligentDocumentUpload
              onExtractionComplete={handleExtractionComplete}
              onCancel={() => setShowUploadDialog(false)}
            />
          </div>
        </div>
      )}

      {/* Extraction Preview Dialog */}
      {extractionResult && (
        <AIExtractionPreview
          extractionResult={extractionResult.result}
          onConfirm={() => handleExtractionPreviewClose()}
          onCancel={handleExtractionPreviewClose}
        />
      )}
    </div>
  );
}
