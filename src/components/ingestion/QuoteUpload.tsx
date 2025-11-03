import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Upload, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface QuoteUploadProps {
  onQuoteProcessed: () => void
}

export function QuoteUpload({ onQuoteProcessed }: QuoteUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    // בדוק סוג קובץ
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('error')
      return
    }

    setUploadedFile(file)
    setUploadStatus('uploading')
    setUploadProgress(0)

    // סימולציה מדומה
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 10
      })
    }, 100)

    // העלאה מדומה
    setTimeout(() => {
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadStatus('processing')

      // הדמיה עיבוד OCR
      setTimeout(() => {
        setUploadStatus('completed')
        onQuoteProcessed()
      }, 2000)
    }, 1000)
  }, [onQuoteProcessed])

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Clock className="h-4 w-4 animate-spin" />
      case 'processing':
        return <Clock className="h-4 w-4 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Upload className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return `מעלה... ${uploadProgress}%`
      case 'processing':
        return 'מעבד OCR...'
      case 'completed':
        return 'העלאה הושלמה'
      case 'error':
        return 'שגיא בהעלאה'
      default:
        return 'גרור קבצים לכאן'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-reverse space-x-2">
          <FileText className="h-5 w-5" />
          <span>העלאת הצעה</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />

          {uploadStatus === 'idle' ? (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                גרור קבצי הצעה כאן
              </h3>
              <p className="text-muted-foreground mb-4">
                תמיכה בקבצי PDF, Word ותמונות
              </p>
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 ml-2" />
                  בחר קבצים
                </label>
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-reverse space-x-2">
                {getStatusIcon()}
                <span className="font-medium">{getStatusText()}</span>
              </div>

              {uploadProgress > 0 && uploadStatus !== 'completed' && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadedFile && (
                <div className="flex items-center justify-center space-x-reverse space-x-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{uploadedFile.name}</span>
                  <span className="text-xs">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {uploadStatus === 'completed' && (
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 ml-1" />
                    ניתן לבדיקת OCR
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    לחץ כדי לצפות ולערוך את הנתונים שחולצו
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}