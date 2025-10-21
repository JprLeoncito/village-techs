import toast from 'react-hot-toast'

/**
 * Show user-friendly error toast
 */
export function showErrorToast(error: unknown) {
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

  // Fall back to a general error message
  toast.error(errorMessage, {
    duration: 8000,
    id: 'general-error',
  })
}

/**
 * Show success toast with action suggestion
 */
export function showSuccessToast(title: string, message?: string) {
  const fullMessage = message ? `${title}. ${message}` : title
  toast.success(fullMessage, {
    duration: 6000,
  })
}