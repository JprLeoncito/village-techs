import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import {
  HomeIcon,
  UsersIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Households', href: '/households', icon: UsersIcon },
  { name: 'Vehicle Stickers', href: '/stickers', icon: TruckIcon },
  { name: 'Construction Permits', href: '/permits', icon: WrenchScrewdriverIcon },
  { name: 'Association Fees', href: '/fees', icon: CurrencyDollarIcon },
  { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
  { name: 'Gate Monitoring', href: '/gate-entries', icon: ShieldCheckIcon },
  { name: 'Incident Reports', href: '/incidents', icon: ExclamationTriangleIcon },
]

export function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, toggleSidebar } = useAppStore()

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 dark:bg-gray-950 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800 dark:border-gray-900">
          <div>
            <h1 className="text-xl font-bold text-white dark:text-gray-100">HOA Admin</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">Village Tech</p>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-gray-400 hover:text-white dark:hover:text-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-gray-800 dark:bg-gray-900 text-white dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500 hover:bg-gray-800 dark:hover:bg-gray-900 hover:text-white dark:hover:text-gray-200'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
