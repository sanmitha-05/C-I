import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}

export default function Pagination({ total, page, pageSize, onChange, className = '' }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (total === 0) return null

  const pages: (number | 'ellipsis')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('ellipsis')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages)
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}</span> –{' '}
        <span className="font-medium text-gray-700">{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span> complaints
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-raptee-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
