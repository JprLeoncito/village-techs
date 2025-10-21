import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AuthGuard } from '../auth/AuthGuard'

export function RootLayout() {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-default dark:bg-gray-950">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
