import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface NumberingSchemeFormProps {
  onApply: (pattern: string) => void
  onCancel: () => void
}

const COMMON_PATTERNS = [
  { value: '###', label: 'Sequential Numbers (101, 102, 103...)', example: '101' },
  { value: 'A-###', label: 'Letter + Numbers (A-101, A-102...)', example: 'A-101' },
  { value: 'Bldg#-Unit###', label: 'Building-Unit (Bldg1-Unit101...)', example: 'Bldg1-Unit101' },
  { value: '##-##', label: 'Floor-Unit (01-01, 01-02...)', example: '01-01' },
]

export function NumberingSchemeForm({ onApply, onCancel }: NumberingSchemeFormProps) {
  const [selectedPattern, setSelectedPattern] = useState(COMMON_PATTERNS[0].value)
  const [customPattern, setCustomPattern] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const handleApply = () => {
    const pattern = useCustom ? customPattern : selectedPattern
    onApply(pattern)
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-900">Common Patterns</h4>
        <div className="mt-3 space-y-2">
          {COMMON_PATTERNS.map((pattern) => (
            <label
              key={pattern.value}
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="pattern"
                value={pattern.value}
                checked={!useCustom && selectedPattern === pattern.value}
                onChange={(e) => {
                  setSelectedPattern(e.target.value)
                  setUseCustom(false)
                }}
                className="h-4 w-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{pattern.label}</p>
                <p className="text-xs text-gray-500">Example: {pattern.example}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            className="h-4 w-4 rounded text-primary-600"
          />
          <span className="text-sm font-medium text-gray-900">Use custom pattern</span>
        </label>

        {useCustom && (
          <div className="mt-3">
            <Input
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              placeholder="e.g., Tower#-Floor##-Unit###"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use # for numbers. Example: A-### becomes A-001, A-002...
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This pattern will help you maintain consistent unit numbering.
          You can still manually enter unit numbers that don't follow this pattern.
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleApply}
          disabled={useCustom && !customPattern}
        >
          Apply Pattern
        </Button>
      </div>
    </div>
  )
}
