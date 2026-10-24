import { useState, useEffect } from 'react'
import {
  BookOpen,
  Search,
  Upload,
  RotateCcw,
  Sparkles,
  FileText,
  Tag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import ImportModal from '../../components/knowledge/ImportModal'
import type { KnowledgeBaseRecord } from '../../types/database'

export default function KnowledgeBasePage() {
  const { profile } = useAuth()
  const [records, setRecords] = useState<KnowledgeBaseRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [faultCodeFilter, setFaultCodeFilter] = useState('')
  const [datasetFilter, setDatasetFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [isImportOpen, setIsImportOpen] = useState(false)

  // AI-Assisted Query Drawer / State
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchKnowledgeBase = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchTerm.trim()) {
        query = query.or(
          `issue_description.ilike.%${searchTerm}%,root_cause.ilike.%${searchTerm}%,corrective_action.ilike.%${searchTerm}%,fault_code.ilike.%${searchTerm}%`
        )
      }

      if (faultCodeFilter.trim()) {
        query = query.ilike('fault_code', `%${faultCodeFilter}%`)
      }

      if (datasetFilter.trim()) {
        query = query.eq('source_dataset', datasetFilter)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error

      setRecords(data || [])
      setTotal(count || 0)
    } catch (err) {
      console.error('KB fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKnowledgeBase()
  }, [searchTerm, faultCodeFilter, datasetFilter, page])

  const handleReset = () => {
    setSearchTerm('')
    setFaultCodeFilter('')
    setDatasetFilter('')
    setPage(1)
  }

  // AI-assisted technical inquiry (Module 9 grounded prompt simulation)
  const handleAskAI = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResponse(null)

    // Match relevant grounded records from the local knowledge base
    const matchingRecords = records.filter(
      (r) =>
        (r.fault_code && r.fault_code.toLowerCase().includes(aiQuery.toLowerCase())) ||
        (r.issue_description && r.issue_description.toLowerCase().includes(aiQuery.toLowerCase()))
    )

    setTimeout(() => {
      if (matchingRecords.length > 0) {
        const top = matchingRecords[0]
        setAiResponse(
          `**Documented Grounding Source**: [${top.source_dataset}] (Ref: ${top.fault_code || top.id.slice(0, 8)})\n\n` +
            `• **Observed Issue**: ${top.issue_description}\n` +
            `• **Documented Root Cause**: ${top.root_cause || 'Under investigation in reference guide'}\n` +
            `• **Recommended Corrective Action**: ${top.corrective_action || 'Inspect high-voltage harness & re-flash BMS'}\n\n` +
            `*Disclaimer: Human verification required. AI output must be reviewed before applying to vehicle.*`
        )
      } else {
        setAiResponse(
          `**No direct historical match found in authorized knowledge base** for "${aiQuery}".\n\n` +
            `Recommended next step: Log complaint for Field Intelligence on-site diagnosis and R&D consultation.`
        )
      }
      setAiLoading(false)
    }, 600)
  }

  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Historical Knowledge Base & Reference Guide</h1>
          <p className="page-subtitle">
            Module 8 & 9: Search historical service logs, occurrence tracing & fault codes
          </p>
        </div>
        {(profile?.role === 'field_intelligence' || profile?.role === 'admin') && (
          <button
            onClick={() => setIsImportOpen(true)}
            className="btn-primary self-start sm:self-auto bg-teal-600 hover:bg-teal-700"
          >
            <Upload className="w-4 h-4" />
            <span>Import Service Records</span>
          </button>
        )}
      </div>

      {/* AI Assistance Assistant Card (Module 9) */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">
            AI-Assisted Technical Diagnostic Grounding
          </h2>
        </div>
        <p className="text-xs text-gray-300">
          Enter a fault code or symptom to retrieve grounded historical evidence with source citations.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
            placeholder="e.g. P0A1F, BMS isolation warning, charging timeout..."
            className="form-input bg-white/10 text-white placeholder-gray-400 border-white/20 focus:ring-teal-400"
          />
          <button
            onClick={handleAskAI}
            disabled={aiLoading}
            className="btn-primary shrink-0 bg-teal-500 hover:bg-teal-600"
          >
            {aiLoading ? 'Querying...' : 'Consult Knowledge'}
          </button>
        </div>

        {aiResponse && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/15 text-xs text-gray-200 whitespace-pre-line leading-relaxed">
            {aiResponse}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search descriptions, root causes, solutions..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="form-input pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="Filter Fault Code (e.g. P0A1F)"
              value={faultCodeFilter}
              onChange={(e) => {
                setFaultCodeFilter(e.target.value)
                setPage(1)
              }}
              className="form-input text-xs sm:text-sm uppercase font-mono"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              placeholder="Dataset (e.g. Service Logs)"
              value={datasetFilter}
              onChange={(e) => {
                setDatasetFilter(e.target.value)
                setPage(1)
              }}
              className="form-input text-xs sm:text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={handleReset}
              className="btn-secondary w-full justify-center btn-sm text-xs py-2.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No knowledge records found"
            description="Use 'Import Service Records' above to ingest CSV/XLSX logs from the service center."
            action={
              <button
                onClick={() => setIsImportOpen(true)}
                className="btn-primary btn-sm mt-3 bg-teal-600"
              >
                Import Historical Data
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fault Code</th>
                  <th>Dataset / Source</th>
                  <th>Issue Description</th>
                  <th>Root Cause</th>
                  <th>Corrective Action</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-bold text-teal-700">
                      {r.fault_code || '—'}
                    </td>
                    <td className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700 block">
                        {r.source_dataset}
                      </span>
                      {r.source_file && (
                        <span className="truncate max-w-[120px] block">{r.source_file}</span>
                      )}
                    </td>
                    <td className="text-gray-800 text-xs max-w-xs">{r.issue_description}</td>
                    <td className="text-gray-700 text-xs max-w-xs">
                      {r.root_cause || <span className="text-gray-400 italic">Not documented</span>}
                    </td>
                    <td className="text-gray-700 text-xs max-w-xs">
                      {r.corrective_action || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {r.investigation_outcome || 'Recorded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, total)} of {total} historical records
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 font-semibold rounded border border-teal-200">
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

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => fetchKnowledgeBase()}
      />
    </div>
  )
}
