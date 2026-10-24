import type { Complaint, ComplaintHistory, Escalation, CCEResolution, FIInvestigation } from '../types/database'

// Vehicle Registry for auto-mapping when Chassis / VIN is entered
export interface VehicleRegistryRecord {
  chassis_vin: string
  customer_name: string
  customer_contact: string
  vehicle_model: string
  registration_number: string
}

export const KNOWN_VEHICLES: VehicleRegistryRecord[] = [
  {
    chassis_vin: 'P5KTAAACD6MP00011',
    customer_name: 'Anand Sharma',
    customer_contact: '+91 98401 23456',
    vehicle_model: 'Raptee HV-T30 Sport',
    registration_number: 'TN 09 BK 2026',
  },
  {
    chassis_vin: 'P5KTAAACD6MP00062',
    customer_name: 'Kavitha Raman',
    customer_contact: '+91 97910 88776',
    vehicle_model: 'Raptee HV-T30',
    registration_number: 'TN 22 CZ 4401',
  },
  {
    chassis_vin: 'P5KTAAACD6MP00099',
    customer_name: 'Suresh Menon',
    customer_contact: '+91 98412 34567',
    vehicle_model: 'Raptee HV-T30',
    registration_number: 'KL 07 CD 8821',
  },
  {
    chassis_vin: 'P5KTAAACD6MP00051',
    customer_name: 'Praveen Das',
    customer_contact: '+91 94440 11223',
    vehicle_model: 'Raptee HV-T30 Sport',
    registration_number: 'KA 01 MJ 3390',
  },
]

export function lookupVehicle(chassisVin: string): VehicleRegistryRecord | null {
  if (!chassisVin) return null
  const cleaned = chassisVin.trim().toUpperCase()
  const found = KNOWN_VEHICLES.find((v) => v.chassis_vin.toUpperCase() === cleaned)
  if (found) return found

  // Also check if any registered complaint has details for this chassis
  const complaints = getLocalComplaints()
  const match = complaints.find((c) => c.chassis_vin.toUpperCase() === cleaned)
  if (match) {
    return {
      chassis_vin: match.chassis_vin,
      customer_name: match.customer_name || '',
      customer_contact: match.customer_contact || '',
      vehicle_model: match.vehicle_model || 'Raptee.HV',
      registration_number: match.registration_number || '',
    }
  }

  return null
}

// NO pre-built complaints — starts completely clean
const INITIAL_COMPLAINTS: Complaint[] = []

const STORAGE_KEY = 'raptee_complaints_store_v2'
const HISTORY_KEY = 'raptee_history_store_v2'
const ESCALATIONS_KEY = 'raptee_escalations_store_v2'
const INVESTIGATIONS_KEY = 'raptee_investigations_store_v2'

export function getLocalComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COMPLAINTS))
      return INITIAL_COMPLAINTS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_COMPLAINTS
  }
}

export function saveLocalComplaint(complaint: Complaint): Complaint {
  const current = getLocalComplaints()
  const year = new Date().getFullYear()
  const nextSeq = current.length + 1
  const incidentId = complaint.incident_id || `CI-${year}-${String(nextSeq).padStart(4, '0')}`

  const newEntry: Complaint = {
    ...complaint,
    id: complaint.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    incident_id: incidentId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const updated = [newEntry, ...current]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return newEntry
}

export function saveLocalComplaintsBatch(complaints: Complaint[]): Complaint[] {
  const current = getLocalComplaints()
  const year = new Date().getFullYear()
  let nextSeq = current.length + 1

  const newEntries: Complaint[] = complaints.map((c, i) => {
    const seq = nextSeq + i
    const incidentId = c.incident_id || `CI-${year}-${String(seq).padStart(4, '0')}`
    return {
      ...c,
      id: c.id || `c-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      incident_id: incidentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  const updated = [...newEntries, ...current]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return newEntries
}

export function updateLocalComplaint(id: string, updates: Partial<Complaint>): Complaint | null {
  const current = getLocalComplaints()
  const idx = current.findIndex((c) => c.id === id)
  if (idx === -1) return null

  const updatedRecord = {
    ...current[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  current[idx] = updatedRecord
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  return updatedRecord
}

export function getLocalHistory(complaintId: string): ComplaintHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const all: ComplaintHistory[] = raw ? JSON.parse(raw) : []
    return all.filter((h) => h.complaint_id === complaintId)
  } catch {
    return []
  }
}

export function appendLocalHistory(entry: Omit<ComplaintHistory, 'id' | 'created_at'>): ComplaintHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const all: ComplaintHistory[] = raw ? JSON.parse(raw) : []
    const newEntry: ComplaintHistory = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    }
    all.push(newEntry)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all))
    return newEntry
  } catch {
    return { ...entry, id: `hist-${Date.now()}`, created_at: new Date().toISOString() }
  }
}

export function saveLocalEscalation(esc: any) {
  try {
    const raw = localStorage.getItem(ESCALATIONS_KEY)
    const all: Record<string, any> = raw ? JSON.parse(raw) : {}
    all[esc.complaint_id] = { ...esc, id: `esc-${Date.now()}`, escalated_at: new Date().toISOString() }
    localStorage.setItem(ESCALATIONS_KEY, JSON.stringify(all))
  } catch {}
}

export function getLocalEscalation(complaintId: string): Escalation | null {
  try {
    const raw = localStorage.getItem(ESCALATIONS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[complaintId] || null
  } catch {
    return null
  }
}

export function saveLocalInvestigation(inv: any): FIInvestigation {
  try {
    const raw = localStorage.getItem(INVESTIGATIONS_KEY)
    const all: Record<string, any> = raw ? JSON.parse(raw) : {}
    const entry = {
      ...inv,
      id: all[inv.complaint_id]?.id || `inv-${Date.now()}`,
      updated_at: new Date().toISOString(),
      submitted_at: all[inv.complaint_id]?.submitted_at || new Date().toISOString(),
    }
    all[inv.complaint_id] = entry
    localStorage.setItem(INVESTIGATIONS_KEY, JSON.stringify(all))
    return entry
  } catch {
    return inv
  }
}

export function getLocalInvestigation(complaintId: string): FIInvestigation | null {
  try {
    const raw = localStorage.getItem(INVESTIGATIONS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[complaintId] || null
  } catch {
    return null
  }
}
