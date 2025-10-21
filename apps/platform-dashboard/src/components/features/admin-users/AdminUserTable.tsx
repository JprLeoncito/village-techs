import { Badge } from '@/components/ui/Badge'
import { AdminUserActions } from './AdminUserActions'
import type { AdminUserWithEmail } from '@/hooks/useAdminUsers'

interface AdminUserTableProps {
  users: AdminUserWithEmail[]
  onEdit: (user: AdminUserWithEmail) => void
  onDelete: (userId: string, name: string, email: string) => void
  onResetPassword: (userId: string, email: string) => void
  onDeactivate: (userId: string, name: string) => void
  onReactivate: (userId: string, name: string) => void
  isLoading?: boolean
}

export function AdminUserTable({
  users,
  onEdit,
  onDelete,
  onResetPassword,
  onDeactivate,
  onReactivate,
  isLoading = false,
}: AdminUserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          No admin users found. Create your first admin user to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              Phone
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
          {users.map((user) => {
            const fullName = `${user.first_name} ${user.last_name}`.trim()
            const isActive = user.status === 'active'

            return (
              <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${!isActive ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{fullName}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant={user.role === 'admin_head' ? 'warning' : 'info'}>
                    {user.role === 'admin_head' ? 'Head Admin' : 'Officer'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge variant={isActive ? 'success' : 'secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {user.phone || 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  <AdminUserActions
                    user={user}
                    onEdit={() => onEdit(user)}
                    onDelete={() => onDelete(user.id, fullName, user.email)}
                    onResetPassword={() => onResetPassword(user.id, user.email)}
                    onDeactivate={() => onDeactivate(user.id, fullName)}
                    onReactivate={() => onReactivate(user.id, fullName)}
                    isLoading={isLoading}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
