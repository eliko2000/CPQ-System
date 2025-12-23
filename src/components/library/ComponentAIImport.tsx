import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  IntelligentDocumentUpload,
  type MSRPImportOptions,
} from './IntelligentDocumentUpload';
import { AIExtractionPreview } from './AIExtractionPreview';
import type { AIExtractionResult } from '../../services/claudeAI';
import type { Component } from '../../types';
import { logger } from '@/lib/logger';

interface ComponentAIImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (components: Partial<Component>[]) => Promise<void>;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export const ComponentAIImport: React.FC<ComponentAIImportProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [extractionResult, setExtractionResult] =
    useState<AIExtractionResult | null>(null);
  const [msrpOptions, setMsrpOptions] = useState<MSRPImportOptions>({
    mode: 'none',
  });
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const handleExtractionComplete = (
    result: AIExtractionResult,
    __file: File,
    options: MSRPImportOptions
  ) => {
    setExtractionResult(result);
    setMsrpOptions(options);
    setStep('preview');
  };

  const handleConfirm = async (components: Partial<Component>[]) => {
    setStep('importing');
    setImportProgress({ current: 0, total: components.length });

    logger.info('[ComponentAIImport] onImport received components', {
      totalComponents: components.length,
      componentsWithMSRP: components.filter(c => c.msrpPrice).length,
      sampleComponent: components[0],
    });

    try {
      // Import components
      await onImport(components);
      setStep('complete');

      // Close after showing success briefly
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      logger.error('Import failed:', error);
      // Reset to preview to allow retry
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setExtractionResult(null);
    setImportProgress({ current: 0, total: 0 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import Components with AI'}
            {step === 'preview' && 'Review Extracted Components'}
            {step === 'importing' && 'Importing Components...'}
            {step === 'complete' && 'Import Complete!'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <IntelligentDocumentUpload
            onExtractionComplete={handleExtractionComplete}
            onCancel={handleClose}
          />
        )}

        {step === 'preview' && extractionResult && (
          <AIExtractionPreview
            extractionResult={extractionResult}
            msrpOptions={msrpOptions}
            onConfirm={handleConfirm}
            onCancel={() => setStep('upload')}
          />
        )}

        {step === 'importing' && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Importing components...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {importProgress.current} of {importProgress.total} imported
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-12 text-center">
            <div className="text-green-600 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">
              Import completed successfully!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {importProgress.total} components added to library
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
