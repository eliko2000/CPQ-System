/**
 * Numbering Service Tests
 */

import { describe, it, expect } from 'vitest';
import { validateNumberingConfig, previewNumbers } from '../numberingService';
import {
  NumberingConfig,
  DEFAULT_NUMBERING_CONFIG,
} from '../../types/numbering.types';

describe('numberingService', () => {
  describe('validateNumberingConfig', () => {
    it('should validate default configuration', () => {
      const errors = validateNumberingConfig(DEFAULT_NUMBERING_CONFIG);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty project prefix', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        projectPrefix: '',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain('Project prefix cannot be empty');
    });

    it('should reject empty quotation prefix', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        quotationPrefix: '',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain('Quotation prefix cannot be empty');
    });

    it('should reject padding less than 1', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        padding: 0,
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain('Padding must be between 1 and 10 digits');
    });

    it('should reject padding greater than 10', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        padding: 11,
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain('Padding must be between 1 and 10 digits');
    });

    it('should reject empty separator', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        separator: '',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain('Separator cannot be empty');
    });

    it('should reject invalid characters in project prefix', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        projectPrefix: 'PRJ-',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain(
        'Project prefix can only contain letters and numbers'
      );
    });

    it('should reject invalid characters in quotation prefix', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        quotationPrefix: 'Q@T',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toContain(
        'Quotation prefix can only contain letters and numbers'
      );
    });

    it('should accept valid custom configuration', () => {
      const config: NumberingConfig = {
        projectPrefix: 'PROJ',
        quotationPrefix: 'QUOTE',
        padding: 6,
        separator: '_',
      };
      const errors = validateNumberingConfig(config);
      expect(errors).toHaveLength(0);
    });
  });

  describe('previewNumbers', () => {
    it('should generate preview with default config', () => {
      const preview = previewNumbers(DEFAULT_NUMBERING_CONFIG);
      expect(preview.projectExample).toBe('PRJ-0001');
      expect(preview.quotationExample).toBe('PRJ-0001-QT-0001');
    });

    it('should generate preview with custom padding', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        padding: 6,
      };
      const preview = previewNumbers(config);
      expect(preview.projectExample).toBe('PRJ-000001');
      expect(preview.quotationExample).toBe('PRJ-000001-QT-000001');
    });

    it('should generate preview with custom separator', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        separator: '_',
      };
      const preview = previewNumbers(config);
      expect(preview.projectExample).toBe('PRJ_0001');
      expect(preview.quotationExample).toBe('PRJ_0001_QT_0001');
    });

    it('should generate preview with custom prefixes', () => {
      const config: NumberingConfig = {
        projectPrefix: 'PROJ',
        quotationPrefix: 'QUOTE',
        padding: 4,
        separator: '-',
      };
      const preview = previewNumbers(config);
      expect(preview.projectExample).toBe('PROJ-0001');
      expect(preview.quotationExample).toBe('PROJ-0001-QUOTE-0001');
    });

    it('should generate preview with minimal padding', () => {
      const config: NumberingConfig = {
        ...DEFAULT_NUMBERING_CONFIG,
        padding: 1,
      };
      const preview = previewNumbers(config);
      expect(preview.projectExample).toBe('PRJ-1');
      expect(preview.quotationExample).toBe('PRJ-1-QT-1');
    });

    it('should generate preview with slash separator', () => {
      const config: NumberingConfig = {
        projectPrefix: 'P',
        quotationPrefix: 'Q',
        padding: 3,
        separator: '/',
      };
      const preview = previewNumbers(config);
      expect(preview.projectExample).toBe('P/001');
      expect(preview.quotationExample).toBe('P/001/Q/001');
    });
  });
});
