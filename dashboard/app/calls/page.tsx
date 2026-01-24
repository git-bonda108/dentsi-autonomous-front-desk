'use client'

import { useState, useEffect } from 'react'
import { fetchCalls } from '@/lib/api'
import type { Call } from '@/lib/types'
import { Phone, Loader2, AlertCircle } from 'lucide-react'

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchCalls()
      setCalls(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
      <p className="mt-4 text-gray-600">Loading calls...</p>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <AlertCircle className="h-6 w-6 text-red-600" />
      <p className="text-red-700 mt-2">{error}</p>
      <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
    </div>
  )

  if (calls.length === 0) return (
    <div className="text-center py-12">
      <Phone className="h-16 w-16 text-gray-300 mx-auto" />
      <h3 className="mt-4 text-lg font-semibold">No Calls Yet</h3>
      <p className="text-gray-600 mt-2">Call logs will appear here once calls are made</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone className="h-8 w-8 text-purple-600" />
          Calls ({calls.length})
        </h1>
      </div>
      <div className="space-y-4">
        {calls.map(call => (
          <div key={call.id} className="bg-white rounded-xl shadow border p-6">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{call.patient?.phone || 'Unknown'}</p>
                <p className="text-sm text-gray-600">{call.clinic?.name || 'Unknown Clinic'}</p>
              </div>
              <span className="px-3 py-1 text-sm rounded bg-gray-100">{call.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
