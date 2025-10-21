/**
 * Centralized Error Handling System
 * Provides user-friendly error messages and recovery suggestions
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorInfo {
  code: ErrorCode
  message: string
  suggestion: string
  technical?: string
}

export const ERROR_MESSAGES: Record<ErrorCode, Omit<ErrorInfo, 'code'>> = {
  NETWORK_ERROR: {
    message: "Connection issue detected",
    suggestion: "Please check your internet connection and try again.",
  },
  SESSION_EXPIRED: {
    message: "Your session has expired",
    suggestion: "Please log in again to continue.",
  },
  AUTH_ERROR: {
    message: "Authentication failed",
    suggestion: "Please log in again to continue.",
  },
  VALIDATION_ERROR: {
    message: "Please check the form fields",
    suggestion: "Make sure all required fields are filled correctly.",
  },
  PERMISSION_DENIED: {
    message: "You don't have permission to perform this action",
    suggestion: "Please contact your administrator if you need access.",
  },
  NOT_FOUND: {
    message: "The requested item was not found",
    suggestion: "Please check the information and try again.",
  },
  SERVER_ERROR: {
    message: "Server error occurred",
    suggestion: "Please try again in a few minutes. If the problem persists, contact support.",
  },
  UNKNOWN_ERROR: {
    message: "An unexpected error occurred",
    suggestion: "Please try again. If the problem continues, contact support.",
  },
}

/**
 * Maps technical error messages to user-friendly error codes
 */
export function mapErrorToCode(error: unknown): ErrorCode {
  if (!error) return 'UNKNOWN_ERROR'

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    return 'NETWORK_ERROR'
  }

  // Auth/Session errors
  if (errorMessage.includes('jwt') || errorMessage.includes('expired') || errorMessage.includes('unauthorized')) {
    return 'SESSION_EXPIRED'
  }

  if (errorMessage.includes('auth') || errorMessage.includes('forbidden')) {
    return 'AUTH_ERROR'
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
    return 'PERMISSION_DENIED'
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return 'NOT_FOUND'
  }

  // Validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('required') || errorMessage.includes('invalid')) {
    return 'VALIDATION_ERROR'
  }

  // Server errors
  if (errorMessage.includes('server') || errorMessage.includes('500') || errorMessage.includes('internal')) {
    return 'SERVER_ERROR'
  }

  return 'UNKNOWN_ERROR'
}

/**
 * Get user-friendly error information
 */
export function getErrorInfo(error: unknown): ErrorInfo {
  const code = mapErrorToCode(error)
  const baseInfo = ERROR_MESSAGES[code]

  return {
    code,
    ...baseInfo,
    technical: error instanceof Error ? error.message : String(error),
  }
}

/**
 * Show user-friendly error toast
 */
export function showErrorToast(error: unknown, toast?: any) {
  // Import toast dynamically if not provided
  if (!toast) {
    import('react-hot-toast').then(({ toast: toastInstance }) => {
      showErrorToast(error, toastInstance)
    }).catch(() => {
      // Fallback to console error if toast module fails
      console.error('Toast Error:', error instanceof Error ? error.message : String(error))
    })
    return
  }

  // Fall back to the general error handling system
  const errorInfo = getErrorInfo(error)
  toast.error(`${errorInfo.message}. ${errorInfo.suggestion}`, {
    duration: 8000,
    id: `error-${errorInfo.code}`, // Prevent duplicate toasts
  })
}

/**
 * Show success toast with action suggestion
 */
export function showSuccessToast(title: string, message?: string, toast?: any) {
  // Import toast dynamically if not provided
  if (!toast) {
    import('react-hot-toast').then(({ toast: toastInstance }) => {
      showSuccessToast(title, message, toastInstance)
    }).catch(() => {
      // Fallback to console log if toast module fails
      console.log('Success:', title, message)
    })
    return
  }

  const fullMessage = message ? `${title}: ${message}` : title
  toast.success(fullMessage, {
    duration: 6000,
  })
}