import { csvResidenceSchema, type CSVResidenceRow } from './validations/residence'
import type { ResidenceFormData } from './validations/residence'

interface ParseResult {
  valid: Omit<ResidenceFormData, 'tenant_id'>[]
  errors: Array<{ row: number; field: string; error: string }>
}

export function parseResidenceCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split('\n')
  const result: ParseResult = {
    valid: [],
    errors: [],
  }

  if (lines.length < 2) {
    result.errors.push({
      row: 0,
      field: 'file',
      error: 'CSV file is empty or has no data rows',
    })
    return result
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const requiredColumns = ['unit_number', 'type', 'max_occupancy', 'floor_area']

  // Validate header
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      result.errors.push({
        row: 0,
        field: 'header',
        error: `Missing required column: ${col}`,
      })
    }
  }

  if (result.errors.length > 0) {
    return result
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = line.split(',').map((v) => v.trim())
    const row: Record<string, string> = {}

    header.forEach((col, idx) => {
      row[col] = values[idx] || ''
    })

    try {
      // Validate with Zod
      const validated = csvResidenceSchema.parse(row)

      // Convert to ResidenceFormData format
      result.valid.push({
        unit_number: validated.unit_number,
        type: validated.type,
        max_occupancy: parseInt(validated.max_occupancy),
        lot_area: validated.lot_area ? parseFloat(validated.lot_area) : null,
        floor_area: parseFloat(validated.floor_area),
      })
    } catch (error: any) {
      const zodError = error.errors?.[0]
      result.errors.push({
        row: i + 1,
        field: zodError?.path?.[0] || 'unknown',
        error: zodError?.message || 'Invalid data',
      })
    }
  }

  return result
}

export function generateCSVTemplate(): string {
  const header = 'unit_number,type,max_occupancy,lot_area,floor_area'
  const example1 = '101,condo,4,0,120.5'
  const example2 = '102,condo,2,0,85.3'
  const example3 = '201,townhouse,6,150.0,180.0'

  return [header, example1, example2, example3].join('\n')
}

export function downloadCSVTemplate() {
  const csvContent = generateCSVTemplate()
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', 'residence_import_template.csv')
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
