import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { getLocalComplaints } from '../../lib/mockStore'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { Complaint } from '../../types/database'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    escalated: 0,
    in_progress: 0,
    resolved: 0,
    not_resolved: 0,
  })
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        if (!isSupabaseConfigured) {
          const allComplaints = getLocalComplaints()
          const counts = {
            total: allComplaints.length,
            pending: allComplaints.filter((c) => c.status === 'pending').length,
            escalated: allComplaints.filter((c) => c.status === 'escalated').length,
            in_progress: allComplaints.filter((c) => c.status === 'in_progress').length,
            resolved: allComplaints.filter((c) => c.status === 'resolved').length,
            not_resolved: allComplaints.filter((c) => c.status === 'not_resolved').length,
          }
          setStats(counts)
          setRecentComplaints(allComplaints.slice(0, 6))
          setLoading(false)
          return
        }

        const { data: allComplaints } = await supabase
          .from('complaints')
          .select('*')
          .order('created_at', { ascending: false })

        if (allComplaints) {
          const counts = {
            total: allComplaints.length,
            pending: allComplaints.filter((c) => c.status === 'pending').length,
            escalated: allComplaints.filter((c) => c.status === 'escalated').length,
            in_progress: allComplaints.filter((c) => c.status === 'in_progress').length,
            resolved: allComplaints.filter((c) => c.status === 'resolved').length,
            not_resolved: allComplaints.filter((c) => c.status === 'not_resolved').length,
          }
          setStats(counts)
          setRecentComplaints(allComplaints.slice(0, 6))
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
  const escalationRate = stats.total > 0 ? Math.round((stats.escalated / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="page-title">
            Welcome back, {profile?.full_name || 'Team Member'}
          </h1>
          <p className="page-subtitle">
            Raptee.HV Field Operations & Complaint Management Overview
          </p>
        </div>
        {profile?.role === 'cce' && (
          <Link to="/complaints/new" className="btn-primary self-start md:self-auto">
            + New Complaint
          </Link>
        )}
        {profile?.role === 'field_intelligence' && (
          <Link to="/fi/dashboard" className="btn-primary self-start md:self-auto">
            Open FI Investigation Queue
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total</span>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="stat-card border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold uppercase">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
        </div>

        <div className="stat-card border-l-4 border-l-pink-500">
          <div className="flex items-center justify-between text-pink-700 mb-2">
            <span className="text-xs font-semibold uppercase">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold text-pink-700">{stats.escalated}</div>
        </div>

        <div className="stat-card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-semibold uppercase">In Progress</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.in_progress}</div>
        </div>

        <div className="stat-card border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold uppercase">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.resolved}</div>
        </div>

        <div className="stat-card border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-red-700 mb-2">
            <span className="text-xs font-semibold uppercase">Not Resolved</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.not_resolved}</div>
        </div>
      </div>

      {/* Highlights / Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">Resolution Efficiency</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{resolutionRate}%</div>
            <p className="text-xs text-gray-400 mt-0.5">Complaints closed with verified fixes</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
            {resolutionRate}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">FI Escalation Rate</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{escalationRate}%</div>
            <p className="text-xs text-gray-400 mt-0.5">Complaints requiring Field Intelligence</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 font-bold">
            {escalationRate}%
          </div>
        </div>
      </div>

      {/* Recent Complaints Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Complaints</h2>
            <p className="text-xs text-gray-500 mt-0.5">Authoritative real-time feed across CCE and FI</p>
          </div>
          <Link
            to={profile?.role === 'field_intelligence' ? '/fi/dashboard' : '/complaints'}
            className="text-sm font-medium text-raptee-600 hover:text-raptee-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Date</th>
                <th>Chassis / VIN</th>
                <th>Incident / Problem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentComplaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No complaints registered yet.
                  </td>
                </tr>
              ) : (
                recentComplaints.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-gray-900">{c.incident_id}</td>
                    <td>{c.date_of_report}</td>
                    <td className="font-mono text-xs">{c.chassis_vin}</td>
                    <td>{c.incident_problem}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
