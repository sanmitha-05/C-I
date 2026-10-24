import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  RotateCcw,
  Plus,
  Eye,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useComplaints } from '../../hooks/useComplaints'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import EscalateModal from '../../components/complaints/EscalateModal'
import ComplaintDetailModal from '../../components/complaints/ComplaintDetailModal'
import type { Complaint, ComplaintStatus } from '../../types/database'

export default function ComplaintReportPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Active modals
  const [escalatingComplaint, setEscalatingComplaint] = useState<Complaint | null>(null)
  const [viewingComplaint, setViewingComplaint] = useState<Complaint | null>(null)

  const { complaints, total, loading, refetch } = useComplaints({
    search: searchTerm,
    status: statusFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
  })

  const handleReset = () => {
    setSearchTerm('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      {/* Page Header matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Complaint Report</h1>
          <p className="page-subtitle">
            View, track and take action on all customer complaints
          </p>
        </div>
        {(profile?.role === 'cce' || profile?.role === 'admin') && (
          <Link to="/complaints/new" className="btn-primary self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            <span>Add Complaint</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar matching reference */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Universal Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Incident ID, Chassis / VIN, Problem..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="form-input pl-9 text-xs sm:text-sm"
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setPage(1)
              }}
              className="form-input text-xs sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="escalated">Escalated</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="not_resolved">Not Resolved</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="md:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="form-input text-xs"
              placeholder="From"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="form-input text-xs"
              placeholder="To"
            />
          </div>

          {/* Reset Button */}
          <div className="md:col-span-1">
            <button
              onClick={handleReset}
              className="btn-secondary w-full justify-center btn-sm text-xs py-2.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : complaints.length === 0 ? (
          <EmptyState
            title="No complaints found"
            description="No complaint matches your search criteria or filter selections."
            action={
              <button onClick={handleReset} className="btn-secondary btn-sm mt-3">
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-raptee-500 focus:ring-raptee-500"
                    />
                  </th>
                  <th>Incident ID</th>
                  <th>Date of Report</th>
                  <th>Chassis / VIN</th>
                  <th>Incident / Problem</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => {
                  const isResolved = c.status === 'resolved'
                  return (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-raptee-500 focus:ring-raptee-500"
                        />
                      </td>
                      <td className="font-semibold text-gray-900 font-mono">
                        {c.incident_id}
                      </td>
                      <td className="text-gray-600">{c.date_of_report}</td>
                      <td className="font-mono text-xs text-gray-700">
                        {c.chassis_vin}
                      </td>
                      <td className="text-gray-800">
                        <div className="font-medium">{c.incident_problem}</div>
                        {c.issue_summary && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">
                            {c.issue_summary}
                          </div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'pending' && (
                            <>
                              <button
                                onClick={() => navigate(`/complaints/${c.id}/resolve`)}
                                className="btn-primary btn-sm"
                                title="Resolve directly as CCE"
                              >
                                <span>Resolve</span>
                              </button>
                              <button
                                onClick={() => setEscalatingComplaint(c)}
                                className="btn-outline-danger btn-sm"
                                title="Escalate to Field Intelligence"
                              >
                                <span>Escalate</span>
                              </button>
                            </>
                          )}

                          {c.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                // Direct verification closure
                                setViewingComplaint(c)
                              }}
                              className="btn-primary btn-sm bg-blue-600 hover:bg-blue-700 text-white"
                              title="Complaint under investigation. View details or verify resolution."
                            >
                              <span>View / Verify</span>
                            </button>
                          )}

                          {(c.status === 'escalated' || c.status === 'resolved' || c.status === 'not_resolved') && (
                            <button
                              onClick={() => setViewingComplaint(c)}
                              className="btn-secondary btn-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Count matching reference footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, total)} of {total} complaints
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-raptee-50 text-raptee-700 font-semibold rounded border border-raptee-200">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Escalation Modal */}
      {escalatingComplaint && (
        <EscalateModal
          complaint={escalatingComplaint}
          isOpen={!!escalatingComplaint}
          onClose={() => setEscalatingComplaint(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Complaint Detail Modal */}
      {viewingComplaint && (
        <ComplaintDetailModal
          complaint={viewingComplaint}
          isOpen={!!viewingComplaint}
          onClose={() => setViewingComplaint(null)}
        />
      )}
    </div>
  )
}
