import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { isSupabaseConfigured } from '../../lib/supabase'
import { Info } from 'lucide-react'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        {!isSupabaseConfigured && (
          <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 text-xs text-teal-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Offline Demo Mode Active</strong> — All modules, sample data, and actions are fully functional. Connect your Supabase project in <code>.env.local</code> to persist data to the cloud.
              </span>
            </div>
          </div>
        )}
        <div className="flex-1 p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
