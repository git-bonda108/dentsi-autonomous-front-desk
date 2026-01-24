'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchEscalations, resolveEscalation } from '@/lib/api'
import type { Escalation } from '@/lib/types'
import { formatRelativeTime, formatPhoneNumber, getStatusColor } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Phone, ArrowRight } from 'lucide-react'

interface EscalationsTableProps {
  clinicId?: string
}

export function EscalationsTable({ clinicId }: EscalationsTableProps) {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    loadEscalations()
  }, [clinicId])

  async function loadEscalations() {
    try {
      setLoading(true)
      const response = await fetchEscalations(clinicId)
      setEscalations(response.data)
    } catch (error) {
      console.error('Failed to load escalations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string) {
    try {
      setResolving(id)
      await resolveEscalation(id)
      // Reload escalations after resolving
      await loadEscalations()
    } catch (error) {
      console.error('Failed to resolve escalation:', error)
      alert('Failed to resolve escalation. Please try again.')
    } finally {
      setResolving(null)
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
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Escalation Queue</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {escalations.length} {escalations.length === 1 ? 'call' : 'calls'} requiring attention
          </p>
        </div>
        {escalations.length > 0 && (
          <Link 
            href="/escalations" 
            className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {escalations.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-gray-500 mt-2 font-medium">All clear!</p>
          <p className="text-sm text-gray-400 mt-1">No escalations at this time</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clinic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {escalations.map((escalation) => (
                <tr key={escalation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatRelativeTime(escalation.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {escalation.clinic && (
                      <div className="text-sm text-gray-900">{escalation.clinic.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {escalation.patient ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {escalation.patient.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{formatPhoneNumber(escalation.patient.phone)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(escalation.status)}`}>
                      {escalation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleResolve(escalation.id)}
                      disabled={resolving === escalation.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {resolving === escalation.id ? (
                        <>
                          <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Resolving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
