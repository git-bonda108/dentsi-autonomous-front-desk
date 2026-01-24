'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAppointments } from '@/lib/api'
import type { Appointment } from '@/lib/types'
import { formatDateTime, formatPhoneNumber, getStatusColor } from '@/lib/utils'
import { Calendar, User, Phone, ArrowRight } from 'lucide-react'

interface AppointmentsTableProps {
  clinicId?: string
  status?: string
  limit?: number
}

export function AppointmentsTable({ clinicId, status, limit = 20 }: AppointmentsTableProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadAppointments()
  }, [clinicId, status, page])

  async function loadAppointments() {
    try {
      setLoading(true)
      const response = await fetchAppointments(clinicId, status, page, limit)
      setAppointments(response.data)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error('Failed to load appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Recent Appointments</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {appointments.length} appointments
          </p>
        </div>
        {limit && appointments.length > 0 && (
          <Link 
            href="/appointments" 
            className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="text-gray-500 mt-2">No appointments found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateTime(appointment.appointment_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.patient ? (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{formatPhoneNumber(appointment.patient.phone)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Available Slot</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.service_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.clinic && (
                        <div className="text-sm text-gray-900">{appointment.clinic.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
