/**
 * PdfViewer Tests
 *
 * Tests for browser native PDF viewer using iframe.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfViewer } from '../PdfViewer';

describe('PdfViewer', () => {
  let mockFile: File;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock PDF file
    const pdfContent = new Uint8Array([
      0x25,
      0x50,
      0x44,
      0x46, // PDF header
    ]);
    mockFile = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    createObjectURLSpy.mockReturnValue('blob:http://localhost/mock-pdf-url');

    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
    revokeObjectURLSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  describe('Native PDF Viewer', () => {
    it('creates a blob URL for the PDF file', () => {
      render(<PdfViewer file={mockFile} />);

      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('renders an iframe with the PDF blob URL', () => {
      const { container } = render(<PdfViewer file={mockFile} />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toBe('blob:http://localhost/mock-pdf-url');
    });

    it('displays file information', () => {
      render(<PdfViewer file={mockFile} />);

      expect(screen.getByText(/test\.pdf/)).toBeInTheDocument();
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it('sets iframe title to file name', () => {
      const { container } = render(<PdfViewer file={mockFile} />);

      const iframe = container.querySelector('iframe');
      expect(iframe?.title).toBe('test.pdf');
    });

    it('cleans up blob URL on unmount', () => {
      const { unmount } = render(<PdfViewer file={mockFile} />);

      unmount();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        'blob:http://localhost/mock-pdf-url'
      );
    });

    it('recreates blob URL when file changes', () => {
      const { rerender } = render(<PdfViewer file={mockFile} />);

      // Create a new file
      const newFile = new File(['new content'], 'new.pdf', {
        type: 'application/pdf',
      });
      createObjectURLSpy.mockReturnValue('blob:http://localhost/new-pdf-url');

      rerender(<PdfViewer file={newFile} />);

      // Should revoke old URL and create new one
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        'blob:http://localhost/mock-pdf-url'
      );
      expect(URL.createObjectURL).toHaveBeenCalledWith(newFile);
    });
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      // Mock createObjectURL to delay return
      createObjectURLSpy.mockReturnValue('');

      render(<PdfViewer file={mockFile} />);

      expect(screen.getByText(/Loading PDF.../i)).toBeInTheDocument();
    });
  });
});
