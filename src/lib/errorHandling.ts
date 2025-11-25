/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling patterns across the CPQ application:
 * - Error classification and formatting
 * - User-friendly error messages
 * - Integration with logger and toast notifications
 * - Error boundary support
 */

import { logger } from './logger'

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  FILE_PROCESSING = 'file_processing',
  CALCULATION = 'calculation',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',       // Minor issues, app continues normally
  MEDIUM = 'medium', // Noticeable issues, some features may not work
  HIGH = 'high',     // Critical issues, major functionality broken
  CRITICAL = 'critical', // App-breaking errors
}

/**
 * Standardized error information
 */
export interface AppError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  userMessage: string // User-friendly message (can be Hebrew)
  technicalDetails?: string
  originalError?: Error | unknown
  timestamp: Date
  context?: Record<string, unknown>
}

/**
 * Error messages mapping
 */
const ERROR_MESSAGES: Record<ErrorCategory, { title: string; message: string }> = {
  [ErrorCategory.VALIDATION]: {
    title: 'שגיאת אימות',
    message: 'הנתונים שהוזנו אינם תקינים. אנא בדוק ונסה שוב.',
  },
  [ErrorCategory.NETWORK]: {
    title: 'שגיאת תקשורת',
    message: 'אין חיבור לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.',
  },
  [ErrorCategory.DATABASE]: {
    title: 'שגיאת מאגר נתונים',
    message: 'אירעה שגיאה בשמירת הנתונים. אנא נסה שוב.',
  },
  [ErrorCategory.AUTHENTICATION]: {
    title: 'שגיאת הזדהות',
    message: 'פג תוקף ההתחברות. אנא התחבר מחדש.',
  },
  [ErrorCategory.AUTHORIZATION]: {
    title: 'אין הרשאה',
    message: 'אין לך הרשאה לבצע פעולה זו.',
  },
  [ErrorCategory.FILE_PROCESSING]: {
    title: 'שגיאה בעיבוד קובץ',
    message: 'לא ניתן לעבד את הקובץ. אנא וודא שהקובץ תקין ונסה שוב.',
  },
  [ErrorCategory.CALCULATION]: {
    title: 'שגיאה בחישוב',
    message: 'אירעה שגיאה בחישוב המחירים. אנא בדוק את הנתונים.',
  },
  [ErrorCategory.UNKNOWN]: {
    title: 'שגיאה כללית',
    message: 'אירעה שגיאה בלתי צפויה. אנא נסה שוב.',
  },
}

/**
 * Classify error based on error object or message
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection')
  ) {
    return ErrorCategory.NETWORK
  }

  // Database errors
  if (
    errorMessage.includes('supabase') ||
    errorMessage.includes('database') ||
    errorMessage.includes('query') ||
    errorMessage.includes('sql')
  ) {
    return ErrorCategory.DATABASE
  }

  // Authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('token') ||
    errorMessage.includes('session')
  ) {
    return ErrorCategory.AUTHENTICATION
  }

  // Authorization errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('access denied')
  ) {
    return ErrorCategory.AUTHORIZATION
  }

  // File processing errors
  if (
    errorMessage.includes('file') ||
    errorMessage.includes('upload') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('invalid format')
  ) {
    return ErrorCategory.FILE_PROCESSING
  }

  // Validation errors
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('format')
  ) {
    return ErrorCategory.VALIDATION
  }

  // Calculation errors
  if (
    errorMessage.includes('calculation') ||
    errorMessage.includes('math') ||
    errorMessage.includes('divide by zero') ||
    errorMessage.includes('overflow')
  ) {
    return ErrorCategory.CALCULATION
  }

  return ErrorCategory.UNKNOWN
}

/**
 * Determine error severity
 */
export function determineErrorSeverity(category: ErrorCategory, error: unknown): ErrorSeverity {
  // Critical categories
  if (category === ErrorCategory.AUTHENTICATION) {
    return ErrorSeverity.CRITICAL
  }

  // High severity categories
  if (
    category === ErrorCategory.DATABASE ||
    category === ErrorCategory.AUTHORIZATION
  ) {
    return ErrorSeverity.HIGH
  }

  // Medium severity categories
  if (
    category === ErrorCategory.NETWORK ||
    category === ErrorCategory.FILE_PROCESSING ||
    category === ErrorCategory.CALCULATION
  ) {
    return ErrorSeverity.MEDIUM
  }

  // Check error message for severity clues
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
    return ErrorSeverity.CRITICAL
  }

  // Default to low severity
  return ErrorSeverity.LOW
}

/**
 * Create a standardized AppError object from any error
 */
export function createAppError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {
  const category = classifyError(error)
  const severity = determineErrorSeverity(category, error)
  const defaultMessages = ERROR_MESSAGES[category]

  // Extract technical message
  const technicalMessage = error instanceof Error
    ? error.message
    : typeof error === 'string'
    ? error
    : 'Unknown error occurred'

  return {
    category,
    severity,
    message: technicalMessage,
    userMessage: defaultMessages.message,
    technicalDetails: error instanceof Error ? error.stack : undefined,
    originalError: error,
    timestamp: new Date(),
    context,
  }
}

/**
 * Get user-friendly error title based on category
 */
export function getErrorTitle(category: ErrorCategory): string {
  return ERROR_MESSAGES[category].title
}

/**
 * Get user-friendly error message based on category
 */
export function getErrorMessage(category: ErrorCategory): string {
  return ERROR_MESSAGES[category].message
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: unknown, customMessage?: string): {
  title: string
  message: string
} {
  const appError = createAppError(error)

  return {
    title: getErrorTitle(appError.category),
    message: customMessage || appError.userMessage,
  }
}

/**
 * Log error with appropriate level
 */
export function logError(appError: AppError): void {
  const logContext = {
    category: appError.category,
    severity: appError.severity,
    timestamp: appError.timestamp.toISOString(),
    ...appError.context,
  }

  switch (appError.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(`[CRITICAL] ${appError.message}`, logContext, appError.originalError)
      break
    case ErrorSeverity.HIGH:
      logger.error(`[HIGH] ${appError.message}`, logContext, appError.originalError)
      break
    case ErrorSeverity.MEDIUM:
      logger.warn(`[MEDIUM] ${appError.message}`, logContext, appError.originalError)
      break
    case ErrorSeverity.LOW:
      logger.info(`[LOW] ${appError.message}`, logContext)
      break
  }
}

/**
 * Handle error with logging and optional user notification
 * Returns the AppError for further processing
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>
): AppError {
  const appError = createAppError(error, context)
  logError(appError)
  return appError
}

/**
 * Extract error message from unknown error type
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unknown error occurred'
}

/**
 * Check if error is of a specific category
 */
export function isErrorCategory(error: unknown, category: ErrorCategory): boolean {
  return classifyError(error) === category
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on validation or authorization errors
      const category = classifyError(error)
      if (
        category === ErrorCategory.VALIDATION ||
        category === ErrorCategory.AUTHORIZATION ||
        category === ErrorCategory.AUTHENTICATION
      ) {
        throw error
      }

      // Last attempt, throw the error
      if (i === maxRetries - 1) {
        throw error
      }

      // Wait with exponential backoff
      const delay = initialDelay * Math.pow(2, i)
      logger.debug(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
