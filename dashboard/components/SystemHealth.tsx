'use client'

import { useEffect, useState } from 'react'
import { fetchHealthStatus } from '@/lib/api'
import type { HealthStatus } from '@/lib/types'
import { getHealthStatusColor } from '@/lib/utils'
import { Activity, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

interface SystemHealthProps {
  clinicId?: string
}

export function SystemHealth({ clinicId }: SystemHealthProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHealth()
    // Refresh every 30 seconds
    const interval = setInterval(loadHealth, 30000)
    return () => clearInterval(interval)
  }, [clinicId])

  async function loadHealth() {
    try {
      const data = await fetchHealthStatus(clinicId)
      setHealth(data)
    } catch (error) {
      console.error('Failed to load health status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !health) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const StatusIcon = health.status === 'healthy' ? CheckCircle : health.status === 'degraded' ? AlertTriangle : AlertCircle

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>System Health</span>
        </h2>
      </div>

      <div className="p-6">
        <div className={`border rounded-lg p-4 ${getHealthStatusColor(health.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIcon className="h-6 w-6" />
              <div>
                <p className="font-semibold text-lg capitalize">{health.status}</p>
                <p className="text-sm opacity-90">System is operating {health.status === 'healthy' ? 'normally' : 'with issues'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Last updated</p>
              <p className="text-sm font-medium">{new Date(health.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Calls (24h)</p>
            <p className="text-2xl font-bold mt-1">{health.metrics.totalCalls24h}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Error Rate</p>
            <p className="text-2xl font-bold mt-1">{health.metrics.errorRate.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Escalation Rate</p>
            <p className="text-2xl font-bold mt-1">{health.metrics.escalationRate.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Duration</p>
            <p className="text-2xl font-bold mt-1">{Math.round(health.metrics.avgCallDuration)}s</p>
          </div>
        </div>

        {health.issues && health.issues.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium text-yellow-800 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Issues Detected</span>
            </p>
            <ul className="mt-2 space-y-1">
              {health.issues.map((issue, index) => (
                <li key={index} className="text-sm text-yellow-700">• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
