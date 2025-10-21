import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { daysOfWeek, type OperatingHours } from '@/lib/validations/gate'

interface OperatingHoursInputProps {
  value: OperatingHours[]
  onChange: (hours: OperatingHours[]) => void
}

export function OperatingHoursInput({ value, onChange }: OperatingHoursInputProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAdd = () => {
    const newHour: OperatingHours = {
      day_of_week: 1, // Monday
      open_time: '08:00',
      close_time: '18:00',
      is_24_hours: false,
    }
    onChange([...value, newHour])
    setEditingIndex(value.length)
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const handleUpdate = (index: number, field: keyof OperatingHours, newValue: any) => {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: newValue }
    onChange(updated)
  }

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getDayLabel = (dayOfWeek: number) => {
    return daysOfWeek.find((d) => d.value === dayOfWeek)?.label || 'Unknown'
  }

  const getDayShort = (dayOfWeek: number) => {
    return daysOfWeek.find((d) => d.value === dayOfWeek)?.short || '?'
  }

  // Group by day for display
  const groupedHours = value.reduce((acc, hour, index) => {
    const existing = acc.find((g) => g.day_of_week === hour.day_of_week)
    if (existing) {
      existing.slots.push({ hour, index })
    } else {
      acc.push({
        day_of_week: hour.day_of_week,
        slots: [{ hour, index }],
      })
    }
    return acc
  }, [] as Array<{ day_of_week: number; slots: Array<{ hour: OperatingHours; index: number }> }>)

  // Sort by day of week
  groupedHours.sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600 mb-4">
            No operating hours defined. Add hours to specify when this gate is open.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd}>
            <PlusIcon className="h-4 w-4" />
            Add Operating Hours
          </Button>
        </div>
      ) : (
        <>
          {/* Display grouped hours */}
          <div className="space-y-2">
            {groupedHours.map((group) => (
              <div key={group.day_of_week} className="rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <span className="font-medium text-gray-900">
                    {getDayLabel(group.day_of_week)}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.slots.map(({ hour, index }) => (
                    <div key={index} className="px-4 py-3">
                      {editingIndex === index ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Day of Week
                              </label>
                              <select
                                value={hour.day_of_week}
                                onChange={(e) =>
                                  handleUpdate(index, 'day_of_week', parseInt(e.target.value))
                                }
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                              >
                                {daysOfWeek.map((day) => (
                                  <option key={day.value} value={day.value}>
                                    {day.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={hour.is_24_hours}
                                  onChange={(e) =>
                                    handleUpdate(index, 'is_24_hours', e.target.checked)
                                  }
                                  className="h-4 w-4 rounded text-primary-600"
                                />
                                <span className="text-sm font-medium text-gray-900">24 Hours</span>
                              </label>
                            </div>
                          </div>

                          {!hour.is_24_hours && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Open Time
                                </label>
                                <input
                                  type="time"
                                  value={hour.open_time}
                                  onChange={(e) => handleUpdate(index, 'open_time', e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Close Time
                                </label>
                                <input
                                  type="time"
                                  value={hour.close_time}
                                  onChange={(e) => handleUpdate(index, 'close_time', e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingIndex(null)}
                            >
                              Done
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemove(index)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                              {getDayShort(hour.day_of_week)}
                            </div>
                            <div>
                              {hour.is_24_hours ? (
                                <span className="text-sm font-medium text-gray-900">24 Hours</span>
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {formatTimeDisplay(hour.open_time)} -{' '}
                                  {formatTimeDisplay(hour.close_time)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(index)}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(index)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={handleAdd}>
            <PlusIcon className="h-4 w-4" />
            Add More Hours
          </Button>
        </>
      )}

      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> You can add multiple time slots per day. For example, if a gate is
          open 6 AM-10 AM and 4 PM-8 PM on weekdays, add two entries for each day.
        </p>
      </div>
    </div>
  )
}
