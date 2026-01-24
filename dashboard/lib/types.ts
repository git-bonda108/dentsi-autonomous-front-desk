export interface DashboardStats {
  calls: {
    total: number
    completed: number
    failed: number
    escalated: number
    successRate: number
  }
  appointments: {
    total: number
    confirmed: number
    cancelled: number
    confirmationRate: number
  }
  revenue: {
    estimated: number
    currency: string
  }
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string | null
  call_id: string | null
  appointment_date: string
  service_type: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  clinic: {
    id: string
    name: string
  }
  patient: {
    id: string
    name: string
    phone: string
  }
}

export interface Call {
  id: string
  clinic_id: string
  patient_id: string | null
  call_sid: string
  status: string
  duration: number | null
  metadata: string | null
  created_at: string
  updated_at: string
  clinic?: {
    id: string
    name: string
  }
  patient?: {
    id: string
    name: string
    phone: string
  } | null
}

export interface Escalation extends Call {
  // Escalations are calls with status 'callback' or 'escalated'
}

export interface Clinic {
  id: string
  name: string
  phone: string
  address: string
  hours: string
  created_at: string
  updated_at: string
  _count?: {
    appointments: number
    calls: number
  }
}

export interface Patient {
  id: string
  name: string
  phone: string
  email: string | null
  date_of_birth: string
  insurance_info: string | null
  created_at: string
  updated_at: string
  _count?: {
    appointments: number
  }
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  metrics: {
    totalCalls24h: number
    errorRate: number
    escalationRate: number
    avgCallDuration: number
  }
  issues: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
