"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, Package, AlertTriangle, Loader2 } from "lucide-react"
import MainLayout from "@/components/main-layout"
import PageHeader from "@/components/page-header"
import ReportPreview from "@/components/report-preview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  generateInventorySummary,
  generateLowStockReport,
  saveReport,
  getSavedReports,
  generatePDFContent,
  deleteReport,
  type Report,
} from "@/lib/reports-utils"
import { supabase } from "@/lib/supabaseClient"
import { isAdmin } from "@/lib/database"

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("")
  const [dateRange, setDateRange] = useState<any>(null)
  const [currentReport, setCurrentReport] = useState<Report | null>(null)
  const [savedReports, setSavedReports] = useState<Report[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const reportTypes = [
    {
      id: "inventory-summary",
      title: "Inventory Summary",
      description: "Complete overview of current inventory status",
      icon: <Package className="h-5 w-5" />,
      color: "bg-blue-500",
    },
    {
      id: "low-stock",
      title: "Low Stock Report",
      description: "Items that need restocking",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "bg-orange-500",
    },
  ]

  useEffect(() => {
    loadSavedReports()
  }, [])

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await isAdmin()
      setIsUserAdmin(adminStatus)
    }
    checkAdminStatus()
  }, [])

  const loadSavedReports = async () => {
    try {
      console.log("🔄 Loading saved reports from database...")
      const reports = await getSavedReports()
      console.log("📊 Loaded reports count:", reports.length)
      setSavedReports(reports)
    } catch (error) {
      console.error("❌ Error loading saved reports:", error)
    }
  }

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      let reportData: any
      let reportTitle: string

      switch (selectedReport) {
        case "inventory-summary":
          reportData = await generateInventorySummary()
          reportTitle = "Inventory Summary Report"
          break
        case "low-stock":
          reportData = await generateLowStockReport()
          reportTitle = "Low Stock Report"
          break
        default:
          throw new Error("Invalid report type")
      }

      // Save report to database
      const savedReport = await saveReport(
        reportTitle,
        selectedReport as any,
        reportData,
        dateRange?.from,
        dateRange?.to,
      )

      if (savedReport) {
        setCurrentReport(savedReport)
        setShowPreview(true)
        await loadSavedReports()

        toast({
          title: "Success",
          description: "Report generated successfully",
        })
      } else {
        throw new Error("Failed to save report")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async () => {
    if (!currentReport) return

    setIsExporting(true)
    try {
      // Generate PDF content that matches the preview exactly
      const pdfBlob = await generatePDFContent(currentReport)
      const url = URL.createObjectURL(pdfBlob)

      // Create a temporary link and trigger download
      const link = document.createElement("a")
      link.href = url
      link.download = `${currentReport.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: "Report exported as PDF successfully",
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Error",
        description: "Failed to export report as PDF",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // COMPLETELY REWRITTEN delete handler with multiple fallback approaches
  const handleDeleteReport = async (reportId: number) => {
    if (isDeleting) {
      console.log("🚫 Delete already in progress, skipping...")
      return
    }

    console.log("🗑️ STARTING DELETE PROCESS FOR REPORT ID:", reportId)
    setIsDeleting(true)

    try {
      // First attempt: Use the standard deleteReport function
      let deleteSuccess = await deleteReport(reportId)

      if (!deleteSuccess) {
        console.error("⚠️ Standard deletion failed, trying direct database access...")

        // Second attempt: Try direct database access as fallback
        try {
          const { error } = await supabase.from("reports").delete().eq("id", reportId)

          if (error) {
            console.error("❌ Direct deletion failed:", error)
            throw new Error("Failed to delete report using direct access")
          } else {
            console.log("✅ Direct deletion succeeded")
            deleteSuccess = true
          }
        } catch (directError) {
          console.error("💥 Error in direct deletion:", directError)
        }
      }

      if (deleteSuccess) {
        console.log("✅ Report deleted successfully")

        // FORCE UI UPDATE: Immediately remove the deleted report from state
        setSavedReports((prevReports) => {
          const filteredReports = prevReports.filter((report) => report.id !== reportId)
          console.log("🔄 Updated local state - removed report", reportId)
          console.log("📊 New reports count:", filteredReports.length)
          return filteredReports
        })

        // Close preview if we're viewing the deleted report
        if (currentReport && currentReport.id === reportId) {
          console.log("🚪 Closing preview for deleted report")
          setShowPreview(false)
          setCurrentReport(null)
        }

        toast({
          title: "Success",
          description: "Report deleted successfully",
        })

        // Force refresh from database after a short delay
        setTimeout(async () => {
          console.log("🔄 Force refreshing reports list from database...")
          await loadSavedReports()
        }, 500)
      } else {
        console.error("❌ All deletion attempts failed")
        toast({
          title: "Error",
          description: "Failed to delete report. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("💥 Error in handleDeleteReport:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the report.",
        variant: "destructive",
      })
    } finally {
      console.log("🏁 Delete process completed")
      setIsDeleting(false)
    }
  }

  const handleViewSavedReport = (report: Report) => {
    setCurrentReport(report)
    setShowPreview(true)
  }

  if (showPreview && currentReport) {
    return (
      <MainLayout>
        <PageHeader title="Report Preview" />
        <ReportPreview
          report={currentReport}
          onExportPDF={isExporting ? () => {} : handleExportPDF}
          onClose={() => {
            setShowPreview(false)
            setCurrentReport(null)
          }}
          onDelete={isUserAdmin && !isDeleting ? handleDeleteReport : undefined}
        />
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <PageHeader title="Inventory Reports" />

      <div className="grid grid-cols-1 gap-6">
        {/* Report Types */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Available Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedReport === report.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${report.color} text-white`}>{report.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 whitespace-nowrap">{report.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                        {selectedReport === report.id && (
                          <Badge className="mt-2 bg-blue-100 text-blue-800">Selected</Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Generate Report Button */}
              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerateReport}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isGenerating || !selectedReport}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
                {!selectedReport && (
                  <p className="text-xs text-gray-500 mt-2 text-center">Please select a report type above</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Reports - Now Full Width at Bottom */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Recent Reports</CardTitle>
              <Badge variant="outline" className="text-xs">
                {savedReports.length} reports
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleViewSavedReport(report)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{report.title}</p>
                      <p className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                      {report.type === "inventory-summary" && "inventory"}
                      {report.type === "low-stock" && "low-stock"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate">Generated by {report.generated_by}</p>
                </div>
              ))}
              {savedReports.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No saved reports yet</p>
                  <p className="text-xs text-gray-400">Generate your first report to see it here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </MainLayout>
  )
}
