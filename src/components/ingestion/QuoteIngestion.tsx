import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { FileText, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { QuoteUpload } from './QuoteUpload'
import { QuoteValidation } from './QuoteValidation'
import { ValidatedComponent } from '@/types'

interface ExtractedData {
  supplier: string;
  quoteDate: string;
  items: Array<{
    name: string;
    description?: string;
    manufacturer?: string;
    manufacturerPN?: string;
    quantity?: number;
    unitPrice?: number;
    confidence: number;
  }>;
  confidence: number;
}

export function QuoteIngestion() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'validation' | 'completed'>('upload')
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [quotes, setQuotes] = useState<Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    status: 'uploaded' | 'processing' | 'completed' | 'error';
    uploadDate: string;
    validatedComponents?: ValidatedComponent[];
    errors?: string[];
  }>>([])

  const handleQuoteProcessed = () => {
    const newExtractedData: ExtractedData = {
      supplier: 'ABC Robotics',
      quoteDate: '2024-01-15',
      items: [
        {
          name: 'רובוט KUKA KR10',
          description: 'רובוט תעשייה 10 ק"ג',
          manufacturer: 'KUKA',
          manufacturerPN: 'KR10-2',
          quantity: 1,
          unitPrice: 75000,
          confidence: 0.95
        },
        {
          name: 'בקרת KRC4',
          description: 'בקרה רובוטית KRC4',
          manufacturer: 'KUKA',
          manufacturerPN: 'KRC4-2',
          quantity: 1,
          unitPrice: 12000,
          confidence: 0.92
        },
        {
          name: 'חיישב מהיר',
          description: 'חיישב בטיחות מהיר',
          manufacturer: 'SICK',
          manufacturerPN: 'SICK-WTB6S',
          quantity: 2,
          unitPrice: 2500,
          confidence: 0.78
        }
      ],
      confidence: 0.88
    }
    setExtractedData(newExtractedData)
    setCurrentStep('validation')
  }

  const handleValidationComplete = (validatedComponents: ValidatedComponent[]) => {
    setCurrentStep('completed')

    if (extractedData) {
      const newQuote = {
        id: `quote_${Date.now()}`,
        fileName: 'demo_quote.pdf',
        fileUrl: '/quotes/demo_quote.pdf',
        status: 'completed' as const,
        uploadDate: new Date().toISOString(),
        validatedComponents
      }

      setQuotes(prev => [...prev, newQuote])
    }
  }

  const startNewQuote = () => {
    setCurrentStep('upload')
    setExtractedData(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-orange-600 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'הועלה'
      case 'processing':
        return 'בעיבוד'
      case 'completed':
        return 'הושלם'
      case 'error':
        return 'שגיא'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">קליטת הצעות</h1>
        <p className="text-muted-foreground">
          העלא הצעות ספקים ועבד אותם עם OCR, ושמור אותם בספריית הרכיבים שלך
        </p>
      </div>

      {currentStep === 'upload' && (
        <QuoteUpload onQuoteProcessed={handleQuoteProcessed} />
      )}

      {currentStep === 'validation' && extractedData && (
        <QuoteValidation
          extractedData={extractedData}
          onComplete={handleValidationComplete}
        />
      )}

      {currentStep === 'completed' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-reverse space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>ההצעה הושלמה בהצלחה!</span>
                </div>
                <Button onClick={startNewQuote} variant="outline">
                  <Upload className="h-4 w-4 ml-2" />
                  העלא הצעה חדשה
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-600 mb-2">
                  {extractedData?.items.length || 0} רכיבים נשמרו בהצלחה
                </h3>
                <p className="text-muted-foreground">
                  הרכיבים נוספו לספרייה ומוכנים לשימוש בפרויקטים
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-reverse space-x-2">
                <FileText className="h-5 w-5" />
                <span>הצעות אחרונות</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p>אין הצעות שהועלו עדיין</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-reverse space-x-3">
                        {getStatusIcon(quote.status)}
                        <div>
                          <div className="font-medium">{quote.fileName}</div>
                          <div className="text-sm text-muted-foreground">
                            {quote.uploadDate} • {quote.validatedComponents?.length || 0} רכיבים
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={quote.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          quote.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : quote.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {getStatusText(quote.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}