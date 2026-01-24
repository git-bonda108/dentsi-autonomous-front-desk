'use client'

import { useState, useEffect } from 'react'
import { fetchClinics } from '@/lib/api'
import type { Clinic } from '@/lib/types'
import { Building2, MapPin, Phone, Loader2, AlertCircle } from 'lucide-react'

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchClinics()
      setClinics(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
      <p className="mt-4 text-gray-600">Loading clinics...</p>
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
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="h-8 w-8 text-green-600" />
          Dental Clinics ({clinics.length})
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map(clinic => (
          <div key={clinic.id} className="bg-white rounded-xl shadow border p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-8 w-8 text-green-600" />
              <h3 className="font-bold text-lg">{clinic.name}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                <span>{clinic.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" />
                <span>{clinic.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
