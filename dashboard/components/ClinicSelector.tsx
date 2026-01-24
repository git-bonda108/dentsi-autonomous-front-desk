import type { Clinic } from '@/lib/types'

interface ClinicSelectorProps {
  clinics: Clinic[]
  selectedClinic: string
  onSelectClinic: (clinicId: string) => void
}

export function ClinicSelector({ clinics, selectedClinic, onSelectClinic }: ClinicSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="clinic-select" className="text-sm font-medium text-gray-700">
        Clinic:
      </label>
      <select
        id="clinic-select"
        value={selectedClinic}
        onChange={(e) => onSelectClinic(e.target.value)}
        className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 px-3 py-2 border bg-white"
      >
        <option value="all">All Clinics</option>
        {clinics.map((clinic) => (
          <option key={clinic.id} value={clinic.id}>
            {clinic.name}
          </option>
        ))}
      </select>
    </div>
  )
}
