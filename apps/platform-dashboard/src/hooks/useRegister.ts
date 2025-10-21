import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import type { RegisterFormData } from '@/lib/validations/auth'

export function useRegister() {
  // Function to check if email already exists (simplified to avoid admin API issues)
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Only check in pending users table to avoid admin auth API issues
      // The actual duplicate check will happen during registration
      const { data: pendingUser, error: pendingError } = await supabase
        .from('pending_users')
        .select('email')
        .eq('email', email)
        .single()

      if (pendingError && pendingError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Pending user check error:', pendingError)
      }

      return !!pendingUser
    } catch (error) {
      console.error('Email check error:', error)
      return false
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      try {
        // Step 1: Create Supabase Auth user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              phone: data.phone,
            },
          },
        })

        if (signUpError) {
          // Check for specific error types
          if (signUpError.message?.includes('User already registered') ||
              signUpError.message?.includes('already registered') ||
              signUpError.message?.includes('user_already_exists')) {
            throw new Error('A user with this email address has already been registered')
          }
          if (signUpError.message?.includes('Invalid email') ||
              signUpError.message?.includes('invalid_email')) {
            throw new Error('Please enter a valid email address')
          }
          if (signUpError.message?.includes('Password') ||
              signUpError.message?.includes('password') ||
              signUpError.message?.includes('weak_password')) {
            throw new Error('Password does not meet security requirements. Please choose a stronger password')
          }
          if (signUpError.message?.includes('rate limit') ||
              signUpError.message?.includes('too many requests')) {
            throw new Error('Too many registration attempts. Please try again later')
          }
          throw new Error(signUpError.message || 'Registration failed. Please try again')
        }

        if (!authData.user) {
          throw new Error('Registration failed. Please try again.')
        }

        // Step 2: Create pending_users record for admin review
        const { data: pendingUserData, error: pendingError } = await supabase
          .from('pending_users')
          .insert({
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            auth_user_id: authData.user.id,
            status: 'pending',
            registration_data: {
              registered_at: new Date().toISOString(),
              ip_address: window.location.hostname, // We could get real IP with proper setup
            },
          })
          .select()
          .single()

        if (pendingError) {
          // Check for specific database constraint errors
          if (pendingError.message?.includes('duplicate key') ||
              pendingError.message?.includes('unique constraint') ||
              pendingError.message?.includes('already exists') ||
              pendingError.code === '23505') {
            // Clean up the auth user since registration failed
            try {
              await supabase.auth.admin.deleteUser(authData.user.id)
            } catch (cleanupError) {
              console.error('Failed to cleanup auth user after duplicate registration:', cleanupError)
            }
            throw new Error('A user with this email address has already been registered')
          }

          console.error('Failed to create pending user record:', pendingError)
          // Don't fail the registration for other errors, just log them
        }

        return {
          user: authData.user,
          pendingUser: pendingUserData,
          message: 'Registration submitted successfully! Your account is now pending review by our administrators. You will receive an email once your account has been approved.',
        }
      } catch (error) {
        throw error
      }
    },
    onSuccess: (data) => {
      showSuccessToast(
        'Account Created Successfully!',
        data.message
      )
    },
    onError: (error) => {
      showErrorToast(error)
    },
  })

  return {
    ...mutation,
    checkEmailExists,
  }
}