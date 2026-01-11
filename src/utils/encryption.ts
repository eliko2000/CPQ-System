/**
 * Encryption Utilities
 * Provides AES-256-GCM encryption with PBKDF2 key derivation
 * Uses Web Crypto API for browser-native encryption
 */

import type {
  ExportPackage,
  EncryptedExportFile,
  DecryptionResult,
} from '@/types/import-export.types';
import { logger } from '@/lib/logger';

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations
const TAG_LENGTH = 128; // 128 bits authentication tag

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-GCM key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    logger.error('Key derivation failed:', error);
    throw new Error('Failed to derive encryption key');
  }
}

/**
 * Encrypt export package
 */
export async function encryptExportPackage(
  exportPackage: ExportPackage,
  password: string
): Promise<EncryptedExportFile> {
  try {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    logger.info('Encrypting export package...');

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key
    const key = await deriveKey(password, salt);

    // Convert export package to JSON
    const jsonString = JSON.stringify(exportPackage);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);

    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      dataBuffer
    );

    // Extract authentication tag (last 16 bytes)
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const tagStart = encryptedArray.length - TAG_LENGTH / 8;
    const ciphertext = encryptedArray.slice(0, tagStart);
    const authTag = encryptedArray.slice(tagStart);

    // Convert to base64 for storage
    const encryptedData = btoa(String.fromCharCode(...Array.from(ciphertext)));
    const authTagB64 = btoa(String.fromCharCode(...Array.from(authTag)));
    const saltB64 = btoa(String.fromCharCode(...Array.from(salt)));
    const ivB64 = btoa(String.fromCharCode(...Array.from(iv)));

    logger.info('Export package encrypted successfully');

    return {
      encrypted: true,
      algorithm: `${ALGORITHM}-${KEY_LENGTH}`,
      keyDerivation: `PBKDF2-${ITERATIONS}`,
      salt: saltB64,
      iv: ivB64,
      authTag: authTagB64,
      encryptedData,
    };
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Encryption failed'
    );
  }
}

/**
 * Decrypt export package
 */
export async function decryptExportPackage(
  encryptedFile: EncryptedExportFile,
  password: string
): Promise<DecryptionResult> {
  try {
    if (!password) {
      return {
        success: false,
        error: 'Password is required',
      };
    }

    logger.info('Decrypting export package...');

    // Decode base64 to Uint8Array
    const salt = Uint8Array.from(atob(encryptedFile.salt), c =>
      c.charCodeAt(0)
    );
    const iv = Uint8Array.from(atob(encryptedFile.iv), c => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(encryptedFile.authTag), c =>
      c.charCodeAt(0)
    );
    const ciphertext = Uint8Array.from(atob(encryptedFile.encryptedData), c =>
      c.charCodeAt(0)
    );

    // Combine ciphertext and auth tag for decryption
    const encryptedData = new Uint8Array(ciphertext.length + authTag.length);
    encryptedData.set(ciphertext);
    encryptedData.set(authTag, ciphertext.length);

    // Derive decryption key
    const key = await deriveKey(password, salt);

    // Decrypt data
    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv,
          tagLength: TAG_LENGTH,
        },
        key,
        encryptedData
      );
    } catch (error) {
      return {
        success: false,
        error: 'Invalid password or corrupted data',
      };
    }

    // Convert buffer to string
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);

    // Parse JSON
    const exportPackage = JSON.parse(jsonString) as ExportPackage;

    logger.info('Export package decrypted successfully');

    return {
      success: true,
      data: exportPackage,
    };
  } catch (error) {
    logger.error('Decryption failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed',
    };
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * Check if a file is encrypted
 */
export function isEncryptedFile(data: any): data is EncryptedExportFile {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.encrypted === true &&
    typeof data.algorithm === 'string' &&
    typeof data.keyDerivation === 'string' &&
    typeof data.salt === 'string' &&
    typeof data.iv === 'string' &&
    typeof data.authTag === 'string' &&
    typeof data.encryptedData === 'string'
  );
}

/**
 * Estimate encryption overhead (additional file size)
 */
export function estimateEncryptionOverhead(originalSize: number): number {
  // Base64 encoding adds ~33% overhead
  // Plus fixed overhead for salt, IV, and auth tag
  const base64Overhead = originalSize * 0.33;
  const fixedOverhead = SALT_LENGTH + IV_LENGTH + TAG_LENGTH / 8 + 500; // +500 for JSON structure

  return Math.ceil(base64Overhead + fixedOverhead);
}
