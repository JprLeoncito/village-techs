import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useBulkCreateResidences } from '@/hooks/useResidences'
import { parseResidenceCSV, downloadCSVTemplate } from '@/lib/csvParser'
import { DocumentArrowDownIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ResidenceCSVImportProps {
  communityId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ResidenceCSVImport({
  communityId,
  onSuccess,
  onCancel,
}: ResidenceCSVImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [parseErrors, setParseErrors] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<any[]>([])

  const bulkCreate = useBulkCreateResidences()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setParseErrors([])
    setImportErrors([])

    // Read and parse CSV
    const text = await selectedFile.text()
    const result = parseResidenceCSV(text)

    if (result.errors.length > 0) {
      setParseErrors(result.errors)
      setPreview([])
      toast.error(`Found ${result.errors.length} errors in CSV file`)
    } else {
      setPreview(result.valid.slice(0, 5)) // Show first 5 rows
      toast.success(`Parsed ${result.valid.length} residences successfully`)
    }
  }

  const handleImport = async () => {
    if (!file) return

    const text = await file.text()
    const result = parseResidenceCSV(text)

    if (result.errors.length > 0) {
      setParseErrors(result.errors)
      return
    }

    try {
      const importResult = await bulkCreate.mutateAsync({
        communityId,
        residences: result.valid,
      })

      if (importResult.failed > 0) {
        setImportErrors(importResult.errors)
        toast.error(
          `Imported ${importResult.success} residences. ${importResult.failed} failed.`
        )
      } else {
        toast.success(`Successfully imported ${importResult.success} residences!`)
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import residences')
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-blue-900">CSV Import Template</h4>
            <p className="mt-1 text-sm text-blue-700">
              Download the template to see the required format
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={downloadCSVTemplate}
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Download Template
          </Button>
        </div>
      </div>

      {/* File Upload */}
      <div>
        {!file ? (
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 hover:bg-gray-100">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400" />
            <span className="mt-2 text-sm text-gray-600">Click to upload CSV file</span>
            <span className="mt-1 text-xs text-gray-500">CSV format only</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DocumentArrowDownIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  setPreview([])
                  setParseErrors([])
                  setImportErrors([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-gray-900">
            Preview (showing first {preview.length} rows)
          </h4>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Unit #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Max Occupancy
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Lot Area
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Floor Area
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.unit_number}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{row.type}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{row.max_occupancy}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {row.lot_area || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{row.floor_area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-4">
          <h4 className="font-medium text-red-900">
            Validation Errors ({parseErrors.length})
          </h4>
          <div className="mt-2 max-h-48 overflow-y-auto">
            {parseErrors.map((error, idx) => (
              <div key={idx} className="mt-1 text-sm text-red-700">
                Row {error.row}: {error.field} - {error.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Errors */}
      {importErrors.length > 0 && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <h4 className="font-medium text-yellow-900">
            Import Errors ({importErrors.length})
          </h4>
          <div className="mt-2 max-h-48 overflow-y-auto">
            {importErrors.map((error, idx) => (
              <div key={idx} className="mt-1 text-sm text-yellow-700">
                Row {error.row} (Unit {error.unit_number}): {error.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleImport}
          disabled={!file || preview.length === 0 || parseErrors.length > 0}
          loading={bulkCreate.isPending}
        >
          Import {preview.length > 0 ? `${preview.length}+` : ''} Residences
        </Button>
      </div>
    </div>
  )
}
