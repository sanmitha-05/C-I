import { useState } from 'react'
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [datasetName, setDatasetName] = useState('Service Logs 2026')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Lightweight CSV parser for in-browser preview & import
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      // Basic comma split respecting quoted strings
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.trim().replace(/^"|"$/g, '')
      )
      const obj: any = {}
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || ''
      })
      rows.push(obj)
    }
    return rows
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    setParsing(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text)
        if (parsed.length === 0) {
          setError('No valid rows found in the CSV.')
        } else {
          setPreviewRows(parsed.slice(0, 5))
        }
      } catch (err: any) {
        setError('Failed to parse CSV: ' + err.message)
      } finally {
        setParsing(false)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvFile || previewRows.length === 0) {
      toast.error('Please select a valid CSV file first.')
      return
    }

    setImporting(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const allRows = parseCSV(text)

        const batchId = `import_${Date.now()}`
        const recordsToInsert = allRows.map((r, idx) => ({
          source_dataset: datasetName,
          source_file: csvFile.name,
          source_row_id: String(idx + 1),
          fault_code: r['Fault Code'] || r['fault_code'] || null,
          issue_description:
            r['Issue Description'] || r['Problem'] || r['Description'] || r['detailed_description'] || '',
          vehicle_model: r['Vehicle Model'] || r['Model'] || 'Raptee.HV',
          component: r['Component'] || r['System'] || null,
          root_cause: r['Root Cause'] || r['root_cause'] || null,
          corrective_action:
            r['Corrective Action'] || r['Solution'] || r['Action Taken'] || null,
          investigation_outcome: r['Outcome'] || 'Imported Reference',
          import_batch: batchId,
        }))

        const { error: insertError } = await supabase
          .from('knowledge_base')
          .insert(recordsToInsert)

        if (insertError) throw insertError

        toast.success(`Successfully imported ${recordsToInsert.length} historical records!`)
        onSuccess()
        onClose()
      } catch (err: any) {
        console.error('Import failed:', err)
        setError(err.message || 'Database insert failed.')
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(csvFile)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold">
              Import Historical Service Records (XLSX/CSV)
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="form-label form-label-required">Dataset Name / Category</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="form-input text-sm"
              placeholder="e.g. Service Logs 2026, Fault Code Guide"
            />
          </div>

          <div>
            <label className="form-label form-label-required">Select File (CSV Format)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm font-semibold text-gray-700 block">
                  {csvFile ? csvFile.name : 'Choose CSV or drag and drop'}
                </span>
                <span className="text-xs text-gray-400 block mt-1">
                  Supports Service Logs, Fault Code Reference Guide, Tracing sheets
                </span>
              </label>
            </div>
          </div>

          {parsing && (
            <div className="flex items-center justify-center py-4 text-xs text-gray-500 gap-2">
              <LoadingSpinner size="sm" />
              <span>Parsing file preview...</span>
            </div>
          )}

          {/* Preview of first few rows */}
          {previewRows.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-700 uppercase">
                Preview (First {previewRows.length} rows)
              </span>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-40">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      {Object.keys(previewRows[0]).slice(0, 5).map((col) => (
                        <th key={col} className="p-1.5 font-medium border-b">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                        {Object.values(row).slice(0, 5).map((val: any, vIdx) => (
                          <td key={vIdx} className="p-1.5 truncate max-w-[120px]">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={importing}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || previewRows.length === 0}
            className="btn-primary btn-sm bg-teal-600 hover:bg-teal-700"
          >
            {importing ? 'Importing Records...' : 'Confirm & Ingest Records'}
          </button>
        </div>
      </div>
    </div>
  )
}
