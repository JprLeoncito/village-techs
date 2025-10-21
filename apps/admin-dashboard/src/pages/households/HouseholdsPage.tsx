import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { useHouseholds } from '@/hooks/useHouseholds'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { HouseholdForm } from '@/components/features/households/HouseholdForm'
import { ResidenceForm } from '@/components/features/residences/ResidenceForm'
import { HouseholdActivationForm } from '@/components/features/households/HouseholdActivationForm'
import { Home, Plus, Search, Eye, Play } from 'lucide-react'
import { format } from 'date-fns'

export function HouseholdsPage() {
  const navigate = useNavigate()
  const { households, isLoading } = useHouseholds()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false)
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [dialogMode, setDialogMode] = useState<'residence' | 'activation'>('residence')

  const filteredHouseholds = households.filter((household: any) => {
    const search = searchQuery.toLowerCase()
    return (
      household.residence?.unit_number?.toLowerCase().includes(search) ||
      household.household_head?.first_name?.toLowerCase().includes(search) ||
      household.household_head?.last_name?.toLowerCase().includes(search)
    )
  })

  const handleResidenceCreated = () => {
    setIsCreateDialogOpen(false)
    // The household will be created automatically with inactive status
  }

  const handleHouseholdActivated = (householdId: string) => {
    setIsActivationDialogOpen(false)
    setSelectedHousehold(null)
    navigate(`/households/${householdId}`)
  }

  const handleEnableHousehold = (household: any) => {
    setSelectedHousehold(household)
    setDialogMode('activation')
    setIsActivationDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      moved_out: 'destructive',
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )
    }

    if (filteredHouseholds.length === 0) {
      return (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-8 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No households found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? 'No households match your search criteria'
              : 'Get started by registering your first household'}
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-subtle-transparent overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Unit Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Household Head
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Move-in Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHouseholds.map((household: any) => (
                <tr key={household.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {household.residence?.unit_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {household.household_head
                      ? `${household.household_head.first_name} ${household.household_head.last_name}`
                      : 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {format(new Date(household.move_in_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(household.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {household.status === 'inactive' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnableHousehold(household)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Enable
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/households/${household.id}`)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Households</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage household registrations and member information
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Registered Households ({households.length})
            </h2>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Residence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Residence</DialogTitle>
                <DialogDescription>
                  Add a new residence to the community. It will be created with inactive status and can be activated later.
                </DialogDescription>
              </DialogHeader>
              <ResidenceForm onSuccess={handleResidenceCreated} onCancel={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search by unit number or household head name..."
              className="pl-10 border-gray-200 dark:border-subtle-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Activation Dialog */}
      <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enable Residence</DialogTitle>
            <DialogDescription>
              Activate this residence by adding household information and members.
            </DialogDescription>
          </DialogHeader>
          {selectedHousehold && (
            <HouseholdActivationForm
              household={selectedHousehold}
              onSuccess={handleHouseholdActivated}
              onCancel={() => {
                setIsActivationDialogOpen(false)
                setSelectedHousehold(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  )
}