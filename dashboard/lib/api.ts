import axios from 'axios'
import type { 
  DashboardStats, 
  Appointment, 
  Call, 
  Escalation, 
  Clinic, 
  Patient,
  HealthStatus,
  PaginatedResponse 
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

export async function fetchDashboardStats(clinicId?: string): Promise<DashboardStats> {
  const params = clinicId ? { clinicId } : {}
  const response = await api.get('/api/dashboard/stats', { params })
  return response.data.data
}

export async function fetchAppointments(
  clinicId?: string,
  status?: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Appointment>> {
  const params: any = { page, limit }
  if (clinicId) params.clinicId = clinicId
  if (status) params.status = status
  
  const response = await api.get('/api/dashboard/appointments', { params })
  return {
    data: response.data.data,
    pagination: response.data.pagination
  }
}

export async function fetchCalls(
  clinicId?: string,
  status?: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Call>> {
  const params: any = { page, limit }
  if (clinicId) params.clinicId = clinicId
  if (status) params.status = status
  
  const response = await api.get('/api/dashboard/calls', { params })
  return {
    data: response.data.data,
    pagination: response.data.pagination
  }
}

export async function fetchEscalations(
  clinicId?: string,
  type?: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Escalation>> {
  const params: any = { page, limit }
  if (clinicId) params.clinicId = clinicId
  if (type) params.type = type
  
  const response = await api.get('/api/dashboard/escalations', { params })
  return {
    data: response.data.data,
    pagination: response.data.pagination
  }
}

export async function resolveEscalation(id: string): Promise<void> {
  await api.patch(`/api/dashboard/escalations/${id}/resolve`)
}

export async function fetchHealthStatus(clinicId?: string): Promise<HealthStatus> {
  const params = clinicId ? { clinicId } : {}
  const response = await api.get('/api/dashboard/health', { params })
  return response.data.data
}

export async function fetchClinics(): Promise<Clinic[]> {
  const response = await api.get('/clinics')
  return response.data
}

export async function fetchPatients(): Promise<Patient[]> {
  const response = await api.get('/patients')
  return response.data
}
