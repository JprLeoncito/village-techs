import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { AssociationFee, CreateFeeInput } from '@/types/fees.types'
import toast from 'react-hot-toast'

export function useFees(status?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['fees', tenant_id, status],
    queryFn: async () => {
      let query = supabase
        .from('association_fees')
        .select(`
          *,
          household:households(
            id,
            residence:residences(unit_number),
            household_head:household_members!household_head_id(first_name, last_name)
          )
        `)
        .eq('tenant_id', tenant_id!)
        .order('due_date', { ascending: false })

      if (status) {
        query = query.eq('payment_status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AssociationFee[]
    },
    enabled: !!tenant_id,
  })
}

export function useFeeActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const createFeeMutation = useMutation({
    mutationFn: async (input: CreateFeeInput) => {
      const { data, error } = await supabase
        .from('association_fees')
        .insert({
          ...input,
          tenant_id: tenant_id!,
          payment_status: 'unpaid',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tenant_id] })
      toast.success('Fee created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create fee')
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async ({
      fee_id,
      amount,
      payment_date,
      payment_method,
      payment_reference,
    }: {
      fee_id: string
      amount: number
      payment_date: string
      payment_method: string
      payment_reference?: string
    }) => {
      const { data, error } = await supabase.rpc('record_fee_payment', {
        p_fee_id: fee_id,
        p_amount: amount,
        p_payment_date: payment_date,
        p_payment_method: payment_method,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tenant_id] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record payment')
    },
  })

  const waiveFeeMutation = useMutation({
    mutationFn: async ({ fee_id, waiver_reason }: { fee_id: string; waiver_reason: string }) => {
      const { data, error } = await supabase
        .from('association_fees')
        .update({
          payment_status: 'waived',
          waiver_reason,
        })
        .eq('id', fee_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', tenant_id] })
      toast.success('Fee waived successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to waive fee')
    },
  })

  return {
    createFee: createFeeMutation.mutate,
    recordPayment: recordPaymentMutation.mutate,
    waiveFee: waiveFeeMutation.mutate,
    isCreating: createFeeMutation.isPending,
    isRecordingPayment: recordPaymentMutation.isPending,
    isWaiving: waiveFeeMutation.isPending,
  }
}

export function useFeeStats() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['fee-stats', tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_summary')
        .select('*')
        .eq('tenant_id', tenant_id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!tenant_id,
  })
}
