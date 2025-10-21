import { Badge } from '@/components/ui/Badge'
import type { Database } from '@/types/database.types'

type CommunityStatus = Database['public']['Tables']['communities']['Row']['status']

interface StatusBadgeProps {
  status: CommunityStatus
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_CONFIG = {
  active: {
    variant: 'success' as const,
    label: 'Active',
  },
  suspended: {
    variant: 'warning' as const,
    label: 'Suspended',
  },
  deleted: {
    variant: 'secondary' as const,
    label: 'Deleted',
  },
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
