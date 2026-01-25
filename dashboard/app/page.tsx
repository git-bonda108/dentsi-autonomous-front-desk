'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/StatsCard'
import { AppointmentsTable } from '@/components/AppointmentsTable'
import { EscalationsTable } from '@/components/EscalationsTable'
import { SystemHealth } from '@/components/SystemHealth'
import { ClinicSelector } from '@/components/ClinicSelector'
import { fetchDashboardStats, fetchClinics } from '@/lib/api'
import type { DashboardStats, Clinic } from '@/lib/types'
import { Phone, Calendar, AlertTriangle, DollarSign, Activity, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [selectedClinic])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const clinicId = selectedClinic === 'all' ? undefined : selectedClinic
      const [statsData, clinicsData] = await Promise.all([
        fetchDashboardStats(clinicId),
        fetchClinics()
      ])

      setStats(statsData)
      setClinics(clinicsData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg">
          <p className="font-semibold text-lg">Dashboard Loading Error</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Retry Connection
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-lg">
          <p className="font-semibold">Alternative: Use API Directly</p>
          <p className="text-sm mt-2">
            The backend API is fully functional. You can access it directly:
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <a href="/api-docs" target="_blank" className="underline hover:no-underline">
                API Documentation (Swagger)
              </a>
            </li>
            <li>
              <a href="/health" target="_blank" className="underline hover:no-underline">
                Health Check
              </a>
            </li>
            <li>
              <a href="/clinics" target="_blank" className="underline hover:no-underline">
                Clinics Data
              </a>
            </li>
            <li>
              <a href="/api/dashboard/stats" target="_blank" className="underline hover:no-underline">
                Dashboard Stats API
              </a>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your dental clinic operations in real-time
          </p>
        </div>
        <ClinicSelector
          clinics={clinics}
          selectedClinic={selectedClinic}
          onSelectClinic={setSelectedClinic}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Calls"
          value={stats.calls.total}
          icon={Phone}
          description={`${stats.calls.completed} completed, ${stats.calls.failed} failed`}
          trend={stats.calls.successRate > 0 ? { value: stats.calls.successRate, label: 'success rate' } : undefined}
          href="/calls"
        />
        <StatsCard
          title="Appointments"
          value={stats.appointments.total}
          icon={Calendar}
          description={`${stats.appointments.confirmed} confirmed, ${stats.appointments.cancelled} cancelled`}
          trend={stats.appointments.confirmationRate > 0 ? { value: stats.appointments.confirmationRate, label: 'confirmation rate' } : undefined}
          href="/appointments"
        />
        <StatsCard
          title="Escalations"
          value={stats.calls.escalated}
          icon={AlertTriangle}
          description="Calls requiring attention"
          variant={stats.calls.escalated > 0 ? 'warning' : 'default'}
          href="/escalations"
        />
        <StatsCard
          title="Estimated Revenue"
          value={`$${stats.revenue.estimated.toLocaleString()}`}
          icon={DollarSign}
          description={stats.revenue.currency}
          variant="success"
        />
        <StatsCard
          title="Success Rate"
          value={`${stats.calls.successRate.toFixed(1)}%`}
          icon={CheckCircle}
          description="Call completion rate"
          variant={stats.calls.successRate >= 80 ? 'success' : 'default'}
        />
        <StatsCard
          title="Clinics"
          value={clinics.length}
          icon={Activity}
          description="View all clinics"
          href="/clinics"
        />
      </div>

      {/* System Health */}
      <SystemHealth clinicId={selectedClinic === 'all' ? undefined : selectedClinic} />

      {/* Escalations Table */}
      <EscalationsTable clinicId={selectedClinic === 'all' ? undefined : selectedClinic} />

      {/* Recent Appointments */}
      <AppointmentsTable 
        clinicId={selectedClinic === 'all' ? undefined : selectedClinic}
        limit={10}
      />
    </div>
  )
}
