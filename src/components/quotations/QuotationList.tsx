import { useState } from 'react'
import { useCPQ } from '../../contexts/CPQContext'
import { QuotationProject } from '../../types'
import { useQuotations } from '../../hooks/useQuotations'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

export function QuotationList() {
  const { quotations, setCurrentQuotation, addQuotation } = useCPQ()
  const quotationsHook = useQuotations()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [creating, setCreating] = useState(false)

  const filteredQuotations = quotations.filter(quotation =>
    filterStatus === 'all' || quotation.status === filterStatus
  )

  const handleSelectQuotation = (quotation: QuotationProject) => {
    setCurrentQuotation(quotation)
  }

  const handleCreateNew = async () => {
    if (creating) return

    console.log('[QuotationList] Creating new quotation...')
    setCreating(true)

    try {
      // Create quotation in Supabase first
      const dbQuotation = await quotationsHook.addQuotation({
        quotation_number: `Q-${Date.now()}`,
        customer_name: 'לקוח לדוגמה',
        project_name: 'הצעת מחיר חדשה',
        currency: 'ILS',
        exchange_rate: 3.7,
        margin_percentage: 25,
        status: 'draft',
        total_cost: 0,
        total_price: 0
      })

      if (!dbQuotation) {
        throw new Error('Failed to create quotation')
      }

      console.log('[QuotationList] DB Quotation created:', dbQuotation)

      // Create local quotation object
      const newQuotation: QuotationProject = {
        id: dbQuotation.id,
        name: dbQuotation.project_name || 'הצעת מחיר חדשה',
        customerName: dbQuotation.customer_name,
        status: 'draft',
        createdAt: dbQuotation.created_at,
        updatedAt: dbQuotation.updated_at,
        systems: [],
        parameters: {
          usdToIlsRate: dbQuotation.exchange_rate || 3.7,
          eurToIlsRate: 4.0,
          markupPercent: dbQuotation.margin_percentage || 25,
          dayWorkCost: 1200,
          profitPercent: 20,
          riskPercent: 10,
          includeVAT: true,
          vatRate: 18
        },
        items: [],
        calculations: {
          totalHardwareUSD: 0,
          totalHardwareILS: 0,
          totalLaborUSD: 0,
          totalLaborILS: 0,
          subtotalUSD: 0,
          subtotalILS: 0,
          totalCustomerPriceILS: 0,
          riskAdditionILS: 0,
          totalQuoteILS: 0,
          totalVATILS: 0,
          finalTotalILS: 0,
          totalCostILS: 0,
          totalProfitILS: 0,
          profitMarginPercent: 0
        }
      }

      // Add to context and set as current
      addQuotation(newQuotation)
      setCurrentQuotation(newQuotation)

      console.log('[QuotationList] Success! Opening editor...')
    } catch (error) {
      console.error('[QuotationList] ERROR:', error)
      alert(`שגיאה ביצירת הצעת מחיר: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'won': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה'
      case 'sent': return 'נשלחה'
      case 'won': return 'זכייה'
      case 'lost': return 'הפסיד'
      default: return status
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הצעות מחיר</h1>
          <p className="text-gray-600">ניהול ויצירה של הצעות מחיר ללקוחות</p>
        </div>
        <Button
          onClick={handleCreateNew}
          disabled={creating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {creating ? 'יוצר...' : 'הצעת מחיר חדשה'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-reverse space-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="draft">טיוטה</option>
          <option value="sent">נשלחה</option>
          <option value="won">זכייה</option>
          <option value="lost">הפסיד</option>
        </select>
      </div>

      {/* Quotations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuotations.map((quotation) => (
          <Card key={quotation.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {quotation.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {quotation.customerName}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                  {getStatusText(quotation.status)}
                </span>
              </div>

              {/* Description */}
              {quotation.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {quotation.description}
                </p>
              )}

              {/* Stats */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">מספר מערכות:</span>
                  <span className="font-medium">{quotation.systems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">מספר פריטים:</span>
                  <span className="font-medium">{quotation.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">סה"כ סופי:</span>
                  <span className="font-medium">
                    ₪{quotation.calculations.finalTotalILS.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 mb-4">
                <div>נוצר: {formatDate(quotation.createdAt)}</div>
                <div>עודכן: {formatDate(quotation.updatedAt)}</div>
              </div>

              {/* Actions */}
              <div className="flex space-x-reverse space-x-2">
                <Button
                  onClick={() => handleSelectQuotation(quotation)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  פתח הצעה
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                >
                  ערוך פרטים
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredQuotations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {filterStatus === 'all' 
              ? 'אין הצעות מחיר עדיין' 
              : `אין הצעות מחיר עם סטטוס "${getStatusText(filterStatus)}"`
            }
          </div>
          <Button
            onClick={handleCreateNew}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {creating ? 'יוצר...' : 'צור הצעת מחיר ראשונה'}
          </Button>
        </div>
      )}
    </div>
  )
}
