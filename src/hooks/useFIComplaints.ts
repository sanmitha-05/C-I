import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getLocalComplaints } from '../lib/mockStore'
import type { Complaint, ComplaintStatus } from '../types/database'

interface UseFIComplaintsParams {
  search?: string
  status?: ComplaintStatus | ''
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

interface UseFIComplaintsResult {
  complaints: Complaint[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFIComplaints({
  search = '',
  status = '',
  dateFrom = '',
  dateTo = '',
  page = 1,
  pageSize = 10,
  sortBy = 'updated_at',
  sortDir = 'desc',
}: UseFIComplaintsParams = {}): UseFIComplaintsResult {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      setLoading(true)
      setError(null)
      const fiStatuses: ComplaintStatus[] = ['escalated', 'in_progress']

      // 1. Fallback / Demo Mode
      if (!isSupabaseConfigured) {
        let all = getLocalComplaints().filter((c) => fiStatuses.includes(c.status))

        if (status && fiStatuses.includes(status as ComplaintStatus)) {
          all = all.filter((c) => c.status === status)
        }

        if (search) {
          const s = search.toLowerCase()
          all = all.filter(
            (c) =>
              c.incident_id.toLowerCase().includes(s) ||
              c.chassis_vin.toLowerCase().includes(s) ||
              c.incident_problem.toLowerCase().includes(s) ||
              (c.customer_name && c.customer_name.toLowerCase().includes(s))
          )
        }

        if (dateFrom) {
          all = all.filter((c) => c.updated_at >= dateFrom)
        }

        if (dateTo) {
          all = all.filter((c) => c.updated_at <= dateTo)
        }

        const count = all.length
        const from = (page - 1) * pageSize
        const to = from + pageSize
        const paged = all.slice(from, to)

        if (!cancelled) {
          setComplaints(paged)
          setTotal(count)
          setLoading(false)
        }
        return
      }

      // 2. Real Supabase query
      try {
        let query = supabase.from('complaints').select('*', { count: 'exact' })

        if (status && fiStatuses.includes(status as ComplaintStatus)) {
          query = query.eq('status', status)
        } else {
          query = query.in('status', fiStatuses)
        }

        if (search) {
          query = query.or(
            `incident_id.ilike.%${search}%,chassis_vin.ilike.%${search}%,incident_problem.ilike.%${search}%,customer_name.ilike.%${search}%`
          )
        }

        if (dateFrom) {
          query = query.gte('updated_at', dateFrom)
        }

        if (dateTo) {
          query = query.lte('updated_at', dateTo)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to)

        const { data, error: err, count } = await query

        if (cancelled) return

        if (err) {
          console.warn('FI fetch failed, falling back to local store:', err.message)
          const local = getLocalComplaints().filter((c) => fiStatuses.includes(c.status))
          setComplaints(local.slice((page - 1) * pageSize, page * pageSize))
          setTotal(local.length)
        } else {
          setComplaints(data ?? [])
          setTotal(count ?? 0)
        }
      } catch (e) {
        if (!cancelled) {
          const local = getLocalComplaints().filter((c) => fiStatuses.includes(c.status))
          setComplaints(local.slice((page - 1) * pageSize, page * pageSize))
          setTotal(local.length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => {
      cancelled = true
    }
  }, [search, status, dateFrom, dateTo, page, pageSize, sortBy, sortDir, tick])

  return { complaints, total, loading, error, refetch }
}
