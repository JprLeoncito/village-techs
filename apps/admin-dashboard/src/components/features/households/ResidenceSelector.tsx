import { useVacantResidences } from '@/hooks/useResidences'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ResidenceSelectorProps {
  value?: string
  onChange: (value: string) => void
  error?: string
}

export function ResidenceSelector({ value, onChange, error }: ResidenceSelectorProps) {
  const { data: vacantResidences, isLoading } = useVacantResidences()

  return (
    <div className="space-y-2">
      <Label htmlFor="residence">Residence *</Label>
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger id="residence" className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={isLoading ? 'Loading residences...' : 'Select a residence'} />
        </SelectTrigger>
        <SelectContent>
          {vacantResidences?.map((residence) => (
            <SelectItem key={residence.id} value={residence.id}>
              {residence.unit_number} ({residence.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
