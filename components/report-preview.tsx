"use client"
import { motion } from "framer-motion"
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
  AlertDialogContent,
} from "@/components/ui/alert-dialog"

import { FileText, Download, Package, AlertTriangle, Eye, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { InventorySummaryData, LowStockData, Report } from "@/lib/reports-utils"

interface ReportPreviewProps {
  report: Report | null
  onExportPDF: () => void
  onClose: () => void
  onDelete?: (reportId: number) => void
}

export default function ReportPreview({ report, onExportPDF, onClose, onDelete }: ReportPreviewProps) {
  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No report selected</p>
        <p className="text-sm text-gray-400">Generate a report to see the preview</p>
      </div>
    )
  }

  const handleDelete = () => {
    if (onDelete && report.id) {
      console.log("🗑️ ReportPreview: Triggering delete for report ID:", report.id)
      onDelete(report.id)
    } else {
      console.log("❌ ReportPreview: Cannot delete - missing onDelete or report.id")
    }
  }

  const renderInventorySummary = (data: InventorySummaryData) => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Products Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-semibold">{data.products.total_items}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Value:</span>
                <span className="font-semibold">₱{data.products.total_value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>In Stock:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {data.products.in_stock}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Low Stock:</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {data.products.low_stock}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Out of Stock:</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {data.products.out_of_stock}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Raw Materials Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-semibold">{data.raw_materials.total_items}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Value:</span>
                <span className="font-semibold">₱{data.raw_materials.total_value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>In Stock:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {data.raw_materials.in_stock}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Low Stock:</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {data.raw_materials.low_stock}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Out of Stock:</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {data.raw_materials.out_of_stock}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.items.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>₱{item.price.toLocaleString()}</TableCell>
                  <TableCell>₱{item.value.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "in-stock"
                          ? "bg-green-100 text-green-800"
                          : item.status === "low-stock"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.products.items.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">Showing 10 of {data.products.items.length} items</p>
          )}
        </CardContent>
      </Card>

      {/* Raw Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.raw_materials.items.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>₱{item.cost_per_unit.toLocaleString()}</TableCell>
                  <TableCell>₱{item.value.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "in-stock"
                          ? "bg-green-100 text-green-800"
                          : item.status === "low-stock"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.raw_materials.items.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">Showing 10 of {data.raw_materials.items.length} items</p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderLowStockReport = (data: LowStockData) => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{data.products.length}</p>
                <p className="text-sm text-gray-600">Low Stock Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{data.raw_materials.length}</p>
                <p className="text-sm text-gray-600">Low Stock Raw Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products */}
      {data.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reorder Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.current_stock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "low-stock" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">{item.reorder_needed} units</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Raw Materials */}
      {data.raw_materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Low Stock Raw Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reorder Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.raw_materials.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.current_quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.reorder_level}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          item.status === "low-stock" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">{item.reorder_needed} units</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderReportContent = () => {
    switch (report.type) {
      case "inventory-summary":
        return renderInventorySummary(report.content as InventorySummaryData)
      case "low-stock":
        return renderLowStockReport(report.content as LowStockData)
      default:
        return <div>Unknown report type</div>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Generated by {report.generated_by} on {new Date(report.created_at).toLocaleDateString()}
                {report.date_range_start && report.date_range_end && (
                  <span className="ml-2">
                    | Period: {new Date(report.date_range_start).toLocaleDateString()} -{" "}
                    {new Date(report.date_range_end).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={onExportPDF} className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-200">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Report</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this report? This action cannot be undone and will permanently
                        remove the report from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Delete Report
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" onClick={onClose}>
                <Eye className="h-4 w-4 mr-2" />
                Close Preview
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      {renderReportContent()}
    </motion.div>
  )
}
