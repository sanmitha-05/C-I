import { useEffect, useRef } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel()
      }
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [open, onCancel])

  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'btn-danger'
      : variant === 'warning'
      ? 'btn-warning'
      : 'btn-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          {variant !== 'default' && (
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
          )}
          <div className="flex-1 pt-0.5">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={confirmClass} disabled={loading}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
