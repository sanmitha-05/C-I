import type { ComplaintStatus } from '../../types/database'

const config: Record<ComplaintStatus, { label: string; className: string }> = {
  pending:      { label: 'Pending',      className: 'badge-pending' },
  escalated:    { label: 'Escalated',    className: 'badge-escalated' },
  in_progress:  { label: 'In Progress',  className: 'badge-in-progress' },
  resolved:     { label: 'Resolved',     className: 'badge-resolved' },
  not_resolved: { label: 'Not Resolved', className: 'badge-not-resolved' },
  reopened:     { label: 'Reopened',     className: 'badge-reopened' },
}

export default function StatusBadge({ status }: { status: ComplaintStatus }) {
  const { label, className } = config[status] ?? { label: status, className: 'badge bg-gray-100 text-gray-600' }
  return <span className={className}>{label}</span>
}
