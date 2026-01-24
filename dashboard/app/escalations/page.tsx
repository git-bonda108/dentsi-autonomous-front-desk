'use client'

import { useState, useEffect } from 'react'
import { fetchEscalations } from '@/lib/api'
import type { Escalation } from '@/lib/types'
import { TriangleAlert, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchEscalations()
      setEscalations(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      <p className="mt-4 text-gray-600">Loading escalations...</p>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <AlertCircle className="h-6 w-6 text-red-600" />
      <p className="text-red-700 mt-2">{error}</p>
      <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
    </div>
  )

  if (escalations.length === 0) return (
    <div className="text-center py-12">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h3 className="mt-4 text-lg font-semibold">All Clear!</h3>
      <p className="text-gray-600 mt-2">No escalations requiring attention</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TriangleAlert className="h-8 w-8 text-orange-600" />
          Escalations ({escalations.length})
        </h1>
      </div>
      <div className="space-y-4">
        {escalations.map(esc => (
          <div key={esc.id} className="bg-white rounded-xl shadow border-2 border-orange-200 p-6">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">Call requiring attention</p>
                <p className="text-sm text-gray-600">Caller: {esc.patient?.phone || 'Unknown'}</p>
                <p className="text-sm text-gray-600">Clinic: {esc.clinic?.name || 'Unknown'}</p>
              </div>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg">Resolve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
