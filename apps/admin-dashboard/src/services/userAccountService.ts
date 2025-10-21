import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { CreateMemberWithUserInput, UserAccountCredentials } from '@/types/households.types'

/**
 * Service for managing user accounts for household members
 */
export class UserAccountService {
  /**
   * Creates a Supabase user account for a household member
   */
  static async createUserAccount(memberData: CreateMemberWithUserInput): Promise<{
    user: any
    credentials: UserAccountCredentials
    member: any
  }> {
    const { email, password, first_name, last_name, household_id, tenant_id, ...memberFields } = memberData

    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot create user accounts.')
    }

    try {
      // 1. Create Supabase user account using admin client
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          household_id,
          role: 'resident'
        },
        app_metadata: {
          household_id,
          tenant_id,
          role: 'resident'
        }
      })

      if (userError) {
        throw new Error(`Failed to create user account: ${userError.message}`)
      }

      if (!userData.user) {
        throw new Error('Failed to create user account: No user returned')
      }

      // 2. Create household member record linked to the user
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from('household_members')
        .insert({
          user_id: userData.user.id,
          household_id,
          tenant_id,
          first_name,
          last_name,
          contact_email: email,
          status: 'active',
          ...memberFields
        })
        .select()
        .single()

      if (memberError) {
        // If member creation fails, try to clean up the user account
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        throw new Error(`Failed to create member record: ${memberError.message}`)
      }

      // 3. Return credentials to show to admin
      const credentials: UserAccountCredentials = {
        email,
        password,
        user_id: userData.user.id
      }

      return {
        user: userData.user,
        credentials,
        member: memberData
      }
    } catch (error) {
      console.error('User account creation failed:', error)
      throw error
    }
  }

  /**
   * Creates a user account for an existing household member
   */
  static async createAccountForExistingMember(memberId: string, email: string, password?: string): Promise<{
    user: any
    credentials: UserAccountCredentials
    member: any
  }> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot create user accounts.')
    }

    try {
      // 1. Get the existing member data
      const { data: existingMember, error: fetchError } = await supabase
        .from('household_members')
        .select('*')
        .eq('id', memberId)
        .single()

      if (fetchError || !existingMember) {
        throw new Error('Existing member not found: ' + fetchError?.message)
      }

      if (existingMember.user_id) {
        throw new Error('Member already has a user account')
      }

      // 2. Create the Supabase user account with resident role for residence app access
      const actualPassword = password || UserAccountService.generateSecurePassword()
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: actualPassword,
        email_confirm: true,
        user_metadata: {
          first_name: existingMember.first_name,
          last_name: existingMember.last_name,
          member_type: existingMember.member_type,
          household_id: existingMember.household_id,
          tenant_id: existingMember.tenant_id,
          role: 'resident', // Role for residence app access
        },
        app_metadata: {
          household_id: existingMember.household_id,
          tenant_id: existingMember.tenant_id,
          role: 'resident'
        }
      })

      if (userError || !userData.user) {
        console.error('Error creating user account:', userError)
        throw new Error('Failed to create user account: ' + userError?.message)
      }

      // 3. Update the existing household member record with the user_id and email
      const { data: updatedMember, error: updateError } = await supabaseAdmin
        .from('household_members')
        .update({
          user_id: userData.user.id,
          contact_email: email,
        })
        .eq('id', memberId)
        .select()
        .single()

      if (updateError) {
        // If update fails, try to clean up the user account
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        throw new Error('Failed to update member with user account: ' + updateError.message)
      }

      return {
        user: userData.user,
        credentials: {
          email: email,
          password: actualPassword,
          user_id: userData.user.id
        },
        member: updatedMember
      }
    } catch (error) {
      console.error('User account creation for existing member failed:', error)
      throw error
    }
  }

  /**
   * Resets password for a resident user account
   */
  static async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot reset passwords.')
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) {
        throw new Error(`Failed to reset password: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error('Password reset failed:', error)
      throw error
    }
  }

  /**
   * Deactivates a user account (sets status to inactive but doesn't delete)
   */
  static async deactivateUserAccount(userId: string, memberId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot deactivate user accounts.')
    }

    try {
      // Update household member status to inactive
      const { error: memberError } = await supabase
        .from('household_members')
        .update({ status: 'inactive' })
        .eq('id', memberId)

      if (memberError) {
        throw new Error(`Failed to deactivate member: ${memberError.message}`)
      }

      // Disable the user's auth account
      const { error: userError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration_seconds: 31536000 // 1 year ban
      })

      if (userError) {
        console.warn('Failed to ban user account:', userError.message)
        // Don't throw error since member is already deactivated
      }

      return true
    } catch (error) {
      console.error('Account deactivation failed:', error)
      throw error
    }
  }

  /**
   * Activates a previously deactivated user account
   */
  static async activateUserAccount(userId: string, memberId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot activate user accounts.')
    }

    try {
      // Update household member status to active
      const { error: memberError } = await supabase
        .from('household_members')
        .update({ status: 'active' })
        .eq('id', memberId)

      if (memberError) {
        throw new Error(`Failed to activate member: ${memberError.message}`)
      }

      // Remove ban from user account
      const { error: userError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration_seconds: 0
      })

      if (userError) {
        console.warn('Failed to remove user ban:', userError.message)
        // Don't throw error since member is already activated
      }

      return true
    } catch (error) {
      console.error('Account activation failed:', error)
      throw error
    }
  }

  /**
   * Generates a secure random password
   */
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''

    // Ensure at least one character from each category
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'

    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Validates if an email is suitable for user account creation
   */
  static validateEmailForAccount(email: string): { valid: boolean; message?: string } {
    if (!email || email.trim() === '') {
      return { valid: false, message: 'Email is required for account creation' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' }
    }

    return { valid: true }
  }
}