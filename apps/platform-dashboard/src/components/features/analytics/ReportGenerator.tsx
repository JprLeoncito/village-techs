import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { exportCommunitiesCSV } from '@/hooks/useAnalytics'
import toast from 'react-hot-toast'

export function ReportGenerator() {
  const [isExporting, setIsExporting] = useState(false)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv')

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const csvContent = await exportCommunitiesCSV()

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `platform-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Report exported successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    toast.error('PDF export is not yet implemented. Use CSV export for now.')
  }

  const handleExport = () => {
    if (format === 'csv') {
      handleExportCSV()
    } else {
      handleExportPDF()
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Generate Report</h3>

      <div className="space-y-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
                className="h-4 w-4 text-primary-600"
              />
              <span className="text-sm text-gray-900">CSV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="h-4 w-4 text-primary-600"
              />
              <span className="text-sm text-gray-900">PDF (Coming Soon)</span>
            </label>
          </div>
        </div>

        {/* Report Contents */}
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Report Includes:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• All communities with status and subscription details</li>
            <li>• Contact information and regional settings</li>
            <li>• Creation dates and timestamps</li>
            <li>• Total counts by status and plan type</li>
          </ul>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          loading={isExporting}
          disabled={format === 'pdf'}
          className="w-full"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          Export Report ({format.toUpperCase()})
        </Button>
      </div>
    </div>
  )
}
