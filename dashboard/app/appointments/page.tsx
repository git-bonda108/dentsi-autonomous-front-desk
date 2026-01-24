'use client'

import { useState, useEffect } from 'react'
import { fetchAppointments, fetchClinics } from '@/lib/api'
import type { Appointment, Clinic } from '@/lib/types'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchAppointments()
      setAppointments(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      <p className="mt-4 text-gray-600">Loading appointments...</p>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <AlertCircle className="h-6 w-6 text-red-600" />
      <p className="text-red-700 mt-2">{error}</p>
      <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          Appointments ({appointments.length})
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow border p-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Clinic</th>
              <th className="px-4 py-3 text-left">Service</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map(apt => (
              <tr key={apt.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{apt.patient?.name || 'N/A'}</td>
                <td className="px-4 py-3">{apt.clinic.name}</td>
                <td className="px-4 py-3">{apt.service_type}</td>
                <td className="px-4 py-3">{format(new Date(apt.appointment_date), 'MMM dd, yyyy HH:mm')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    apt.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                    apt.status === 'available' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {apt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
