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

/**
 * Get API URL - works in both development and production
 * In production (static export), uses the current origin
 * In development, uses localhost:3000
 */
function getApiUrl(): string {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In browser, use current origin (works when dashboard served from same backend)
  if (typeof window !== 'undefined') {
    // Remove /dashboard from the pathname to get the API root
    const origin = window.location.origin;
    return origin;
  }
  
  // SSR/Build fallback
  return 'http://localhost:3000';
}

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
})

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message, error.config?.url);
    throw error;
  }
)

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
