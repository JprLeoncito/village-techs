/**
 * Centralized Error Handling System
 * Provides user-friendly error messages and recovery suggestions
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'AUTH_ERROR'
  | 'COMMUNITY_CREATE_FAILED'
  | 'ADMIN_CREATE_FAILED'
  | 'PARTIAL_SUCCESS'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'EMAIL_EXISTS'
  | 'SPECIFIC_ERROR'
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
  COMMUNITY_CREATE_FAILED: {
    message: "Failed to create community",
    suggestion: "Please check your information and try again. Contact support if the problem persists.",
  },
  ADMIN_CREATE_FAILED: {
    message: "Community created but admin setup failed",
    suggestion: "The community was created successfully, but we couldn't set up the admin user. Please try creating the admin user manually or contact support.",
  },
  PARTIAL_SUCCESS: {
    message: "Operation partially completed",
    suggestion: "Some parts were successful, but there were issues. Please review and complete any remaining steps.",
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
  EMAIL_EXISTS: {
    message: "Email already registered",
    suggestion: "An account with this email address already exists. Please try logging in or use a different email.",
  },
  SPECIFIC_ERROR: {
    message: "Action failed",
    suggestion: "Please review the error details and try again.",
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

  // Community creation errors
  if (errorMessage.includes('community') && errorMessage.includes('create')) {
    return 'COMMUNITY_CREATE_FAILED'
  }

  // Admin creation errors
  if (errorMessage.includes('admin') && errorMessage.includes('create')) {
    return 'ADMIN_CREATE_FAILED'
  }

  // Email already exists errors
  if (errorMessage.includes('already been registered') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('unique constraint') ||
      errorMessage.includes('user_already_exists')) {
    return 'EMAIL_EXISTS'
  }

  // Check for specific user-friendly error messages that should be preserved
  if (errorMessage.includes('please check that all fields are filled correctly') ||
      errorMessage.includes('you do not have permission') ||
      errorMessage.includes('admin user not found') ||
      errorMessage.includes('session has expired') ||
      errorMessage.includes('valid email address') ||
      errorMessage.includes('password does not meet security requirements') ||
      errorMessage.includes('too many registration attempts')) {
    return 'SPECIFIC_ERROR' // New error type for specific messages
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

  // First, check if the error is already a user-friendly message
  const errorMessage = error instanceof Error ? error.message : String(error)

  // List of specific, user-friendly error messages that should be shown directly
  const specificMessages = [
    'A user with this email address has already been registered',
    'A user with this email address already exists',
    'An admin user with this email already exists',
    'Please check that all fields are filled correctly',
    'You do not have permission to create admin users',
    'You do not have permission to perform this action',
    'You do not have permission to reset this user\'s password',
    'Admin user not found',
    'Your session has expired. Please log in again.',
    'Email already registered. An account with this email address already exists. Please try logging in or use a different email.',
    'Please enter a valid email address',
    'Password does not meet security requirements. Please choose a stronger password',
    'Too many registration attempts. Please try again later',
  ]

  // Check if this is a specific user-friendly message
  const isSpecificMessage = specificMessages.some(msg =>
    errorMessage.toLowerCase().includes(msg.toLowerCase()) ||
    msg.toLowerCase().includes(errorMessage.toLowerCase())
  )

  if (isSpecificMessage) {
    // Show the specific error message directly
    toast.error(errorMessage, {
      duration: 8000,
      id: 'specific-error',
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
export function showSuccessToast(message: string, suggestion?: string, toast?: any) {
  // Import toast dynamically if not provided
  if (!toast) {
    import('react-hot-toast').then(({ toast: toastInstance }) => {
      showSuccessToast(message, suggestion, toastInstance)
    }).catch(() => {
      // Fallback to console log if toast module fails
      console.log('Success:', message, suggestion)
    })
    return
  }

  const fullMessage = suggestion ? `${message}. ${suggestion}` : message
  toast.success(fullMessage, {
    duration: 6000,
  })
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, context: string): ErrorInfo {
  const errorInfo = getErrorInfo(error)

  // Log error for debugging (in development)
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error:`, {
      code: errorInfo.code,
      message: errorInfo.message,
      technical: errorInfo.technical,
      originalError: error,
    })
  }

  return errorInfo
}