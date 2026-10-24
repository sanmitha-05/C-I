import { useState, useEffect } from 'react'
import { ShieldCheck, UserPlus, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { UserProfile, UserRole } from '../../types/database'

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured) {
        setUsers([
          {
            id: 'demo-radhika-001',
            email: 'radhika@raptee.com',
            full_name: 'Radhika S',
            role: 'cce',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-sanmitha-002',
            email: 'sanmitha@raptee.com',
            full_name: 'Sanmitha V',
            role: 'field_intelligence',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-admin-003',
            email: 'admin@raptee.com',
            full_name: 'Admin User',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching user profiles:', err)
      toast.error('Failed to load user administration list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error
      toast.success('User role updated successfully!')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role.')
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status.')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-raptee-500" />
          Administration & User Governance
        </h1>
        <p className="page-subtitle">
          Manage employee roles, access permissions, and account statuses
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Configured Employees</h2>
            <p className="text-xs text-gray-500">
              Role permissions strictly enforced via PostgreSQL Row Level Security (RLS)
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No employee profiles loaded. Ensure <code>user_profiles</code> rows are populated after creating Supabase Auth users.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold text-gray-900">{u.full_name}</td>
                    <td className="text-gray-600 text-xs">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="form-input text-xs py-1 px-2 capitalize max-w-[170px]"
                      >
                        <option value="cce">CCE (Customer Care)</option>
                        <option value="field_intelligence">Field Intelligence (FI)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.is_active ? 'badge-resolved' : 'badge-not-resolved'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className="btn-secondary btn-sm text-xs"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
