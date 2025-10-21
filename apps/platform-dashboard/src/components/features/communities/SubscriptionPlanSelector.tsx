import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CheckIcon } from '@heroicons/react/24/solid'

interface SubscriptionPlanSelectorProps {
  value?: string
  onChange: (planId: string) => void
  currency?: string
  error?: string
}

const getCurrencySymbol = (currency: string = 'USD'): string => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'PHP': '₱',
    'EUR': '€',
    'GBP': '£',
  }
  return symbols[currency] || '$'
}

export function SubscriptionPlanSelector({
  value,
  onChange,
  currency = 'USD',
  error,
}: SubscriptionPlanSelectorProps) {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true })

      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
        No subscription plans available
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = value === plan.id
          const features = (plan.features as string[]) || []

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onChange(plan.id)}
              className={`
                relative rounded-lg border-2 p-6 text-left transition-all
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              {isSelected && (
                <div className="absolute right-4 top-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </div>
                </div>
              )}

              <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>

              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">
                  {getCurrencySymbol(currency)}{plan.price_monthly}
                </span>
                <span className="text-gray-600">/month</span>
              </div>

              {plan.description && (
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              )}

              {features.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {features.length > 3 && (
                    <li className="text-sm text-gray-500">+ {features.length - 3} more</li>
                  )}
                </ul>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
