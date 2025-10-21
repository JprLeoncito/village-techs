import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  name: string
  error?: string
  required?: boolean
  helpText?: string
  children: ReactNode
}

export function FormField({
  label,
  name,
  error,
  required = false,
  helpText,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
