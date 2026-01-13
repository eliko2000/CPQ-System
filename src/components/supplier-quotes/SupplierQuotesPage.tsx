/**
 * Supplier Quotes Page
 *
 * Main page for managing supplier quotes with:
 * - List view of all quotes
 * - Upload modal for new quotes
 * - Search and filters
 * - Quote details drawer
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { useSupplierQuotes } from '../../hooks/useSupplierQuotes';
import { SupplierQuote } from '../../types';
import { SmartImportWizard } from '../shared/SmartImportWizard';
import { SupplierQuoteDetailsDrawer } from './SupplierQuoteDetailsDrawer';
import { downloadFile } from '../../utils/storageHelpers';
import { toast } from 'sonner';
import {
  Upload,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  Calendar,
  Building2,
  Package,
  TrendingUp,
  Filter,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { logger } from '@/lib/logger';

export function SupplierQuotesPage() {
  const { quotes, loading, error, deleteQuote } = useSupplierQuotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter quotes based on search
  const filteredQuotes = quotes.filter(quote => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      quote.fileName.toLowerCase().includes(query) ||
      quote.supplierName?.toLowerCase().includes(query) ||
      quote.quoteNumber?.toLowerCase().includes(query)
    );
  });

  // Stats
  const totalQuotes = quotes.length;
  const totalComponents = quotes.reduce((sum, q) => sum + q.totalComponents, 0);
  const completedQuotes = quotes.filter(q => q.status === 'completed').length;

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">הושלם</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">בעיבוד</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">שגיאה</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // File type icon
  const getFileTypeIcon = (fileType?: string) => {
    const className = 'h-4 w-4';
    switch (fileType) {
      case 'excel':
        return <FileText className={`${className} text-green-600`} />;
      case 'pdf':
        return <FileText className={`${className} text-red-600`} />;
      case 'csv':
        return <FileText className={`${className} text-blue-600`} />;
      case 'image':
        return <FileText className={`${className} text-purple-600`} />;
      default:
        return <FileText className={className} />;
    }
  };

  // Handle delete
  const handleDelete = async (quoteId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הצעה זו?')) return;

    const success = await deleteQuote(quoteId);
    if (!success) {
      toast.error('שגיאה במחיקת ההצעה');
    } else {
      toast.success('ההצעה נמחקה בהצלחה');
    }
  };

  // Handle download
  const handleDownload = async (quote: SupplierQuote) => {
    try {
      await downloadFile(quote.fileUrl, quote.fileName);
      toast.success('הקובץ הורד בהצלחה');
    } catch (error) {
      logger.error('Download error:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  // Handle view details
  const handleViewDetails = (quote: SupplierQuote) => {
    setSelectedQuoteId(quote.id);
    setShowDetailsDrawer(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">הצעות ספקים</h1>
          <p className="text-muted-foreground">
            נהל ועקוב אחר כל הצעות המחיר מהספקים שלך
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-5 w-5" />
          העלה הצעת ספק
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סך הצעות</p>
                <p className="text-2xl font-bold">{totalQuotes}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">סך רכיבים</p>
                <p className="text-2xl font-bold">{totalComponents}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">הצעות מעובדות</p>
                <p className="text-2xl font-bold">{completedQuotes}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם קובץ, ספק או מספר הצעה..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              סינון
            </Button>
          </div>

          {/* GitHub Issue #TBD: Add filters component when showFilters is true */}
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            הצעות אחרונות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>שגיאה בטעינת הצעות: {error}</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">אין הצעות להצגה</p>
              <p className="text-sm mt-2">
                {searchQuery ? 'נסה לשנות את החיפוש' : 'העלה הצעת ספק ראשונה'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map(quote => (
                <div
                  key={quote.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  {/* Left side - File info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent flex-shrink-0">
                      {getFileTypeIcon(quote.fileType)}
                    </div>

                    <div className="flex-1 min-w-0 max-w-full">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium truncate max-w-full">
                          {quote.fileName}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {quote.supplierName && (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            <span>{quote.supplierName}</span>
                          </div>
                        )}

                        {quote.quoteDate && (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {new Date(quote.quoteDate).toLocaleDateString(
                                'he-IL'
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Package className="h-3 w-3 flex-shrink-0" />
                          <span>{quote.totalComponents} רכיבים</span>
                        </div>

                        {quote.confidenceScore && (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <span
                              className={`font-medium ${
                                quote.confidenceScore >= 0.8
                                  ? 'text-green-600'
                                  : quote.confidenceScore >= 0.6
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {(quote.confidenceScore * 100).toFixed(0)}% דיוק
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        הועלה{' '}
                        {formatDistanceToNow(new Date(quote.uploadDate), {
                          addSuffix: true,
                          locale: he,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(quote)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      פרטים
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(quote)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      הורד
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(quote.id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Import Wizard - Unified import with duplicate detection */}
      <SmartImportWizard
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={quote => {
          logger.debug('Quote uploaded successfully:', quote);
          setShowUploadModal(false);
        }}
      />

      {/* Quote Details Drawer */}
      <SupplierQuoteDetailsDrawer
        quoteId={selectedQuoteId}
        isOpen={showDetailsDrawer}
        onClose={() => {
          setShowDetailsDrawer(false);
          setSelectedQuoteId(null);
        }}
      />
    </div>
  );
}
