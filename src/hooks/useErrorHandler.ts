/**
 * Custom hook for consistent error handling across components
 *
 * Integrates error handling utilities with toast notifications
 * and provides a simple API for handling errors in React components.
 */

import { useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import {
  handleError as handleErrorCore,
  formatErrorForUser,
  ErrorCategory,
  ErrorSeverity,
  extractErrorMessage,
  AppError,
} from '../lib/errorHandling'

export interface UseErrorHandlerOptions {
  /**
   * Whether to show toast notification automatically
   * @default true
   */
  showToast?: boolean

  /**
   * Custom toast title (overrides default category-based title)
   */
  toastTitle?: string

  /**
   * Custom toast message (overrides default category-based message)
   */
  toastMessage?: string

  /**
   * Additional context to include in error logs
   */
  context?: Record<string, unknown>

  /**
   * Callback to execute after error is handled
   */
  onError?: (error: AppError) => void
}

/**
 * Hook for handling errors with toast notifications and logging
 */
export function useErrorHandler() {
  const { addToast } = useToast()

  /**
   * Handle error with optional toast notification
   */
  const handleError = useCallback(
    (error: unknown, options: UseErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        toastTitle,
        toastMessage,
        context,
        onError,
      } = options

      // Process error with core error handling
      const appError = handleErrorCore(error, context)

      // Show toast notification if enabled
      if (showToast) {
        const { title, message } = formatErrorForUser(error, toastMessage)

        addToast({
          title: toastTitle || title,
          description: message,
          variant: 'destructive',
          duration: getDurationBySeverity(appError.severity),
        })
      }

      // Call custom error handler if provided
      if (onError) {
        onError(appError)
      }

      return appError
    },
    [addToast]
  )

  /**
   * Handle success message with toast
   */
  const handleSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({
        title,
        description: message,
        variant: 'success',
        duration: 3000,
      })
    },
    [addToast]
  )

  /**
   * Handle warning message with toast
   */
  const handleWarning = useCallback(
    (title: string, message?: string) => {
      addToast({
        title,
        description: message,
        variant: 'warning',
        duration: 5000,
      })
    },
    [addToast]
  )

  /**
   * Handle info message with toast
   */
  const handleInfo = useCallback(
    (title: string, message?: string) => {
      addToast({
        title,
        description: message,
        variant: 'default',
        duration: 4000,
      })
    },
    [addToast]
  )

  /**
   * Wrap an async function with error handling
   */
  const wrapAsync = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      options: UseErrorHandlerOptions = {}
    ): T => {
      return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
          return await fn(...args)
        } catch (error) {
          handleError(error, options)
          throw error // Re-throw so caller can handle if needed
        }
      }) as T
    },
    [handleError]
  )

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    wrapAsync,
  }
}

/**
 * Get toast duration based on error severity
 */
function getDurationBySeverity(severity: ErrorSeverity): number {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 10000 // 10 seconds
    case ErrorSeverity.HIGH:
      return 8000 // 8 seconds
    case ErrorSeverity.MEDIUM:
      return 6000 // 6 seconds
    case ErrorSeverity.LOW:
      return 4000 // 4 seconds
    default:
      return 5000 // 5 seconds
  }
}

/**
 * Hook for handling async operations with loading state and error handling
 */
export function useAsyncHandler() {
  const { handleError, handleSuccess } = useErrorHandler()

  const executeAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: {
        successMessage?: { title: string; message?: string }
        errorMessage?: string
        onSuccess?: (data: T) => void
        onError?: (error: AppError) => void
      } = {}
    ): Promise<{ data?: T; error?: AppError }> => {
      try {
        const data = await asyncFn()

        if (options.successMessage) {
          handleSuccess(options.successMessage.title, options.successMessage.message)
        }

        if (options.onSuccess) {
          options.onSuccess(data)
        }

        return { data }
      } catch (error) {
        const appError = handleError(error, {
          toastMessage: options.errorMessage,
          onError: options.onError,
        })

        return { error: appError }
      }
    },
    [handleError, handleSuccess]
  )

  return { executeAsync }
}
