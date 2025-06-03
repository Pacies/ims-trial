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
import { FileText, Download, Edit, Trash2, Eye } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PurchaseOrder } from "@/lib/purchase-orders-utils"

interface PurchaseOrderPreviewProps {
  purchaseOrder: PurchaseOrder | null
  onExportPDF: () => void
  onClose: () => void
  onEdit?: (po: PurchaseOrder) => void
  onDelete?: (poId: number) => void
}

export default function PurchaseOrderPreview({
  purchaseOrder,
  onExportPDF,
  onClose,
  onEdit,
  onDelete,
}: PurchaseOrderPreviewProps) {
  if (!purchaseOrder) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">No purchase order selected</p>
        <p className="text-sm text-gray-400">Select a purchase order to see the preview</p>
      </div>
    )
  }

  const handleDelete = () => {
    if (onDelete && purchaseOrder.id) {
      console.log("🗑️ PurchaseOrderPreview: Triggering delete for PO ID:", purchaseOrder.id)
      onDelete(purchaseOrder.id)
    } else {
      console.log("❌ PurchaseOrderPreview: Cannot delete - missing onDelete or purchaseOrder.id")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Approved
          </Badge>
        )
      case "sent":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Sent
          </Badge>
        )
      case "received":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Received
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Purchase Order Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Purchase Order {purchaseOrder.po_number}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Created by {purchaseOrder.created_by} on {new Date(purchaseOrder.created_at).toLocaleDateString()}
                {purchaseOrder.expected_delivery_date && (
                  <span className="ml-2">
                    | Expected Delivery: {new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={onExportPDF} className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              {onEdit && (
                <Button variant="outline" onClick={() => onEdit(purchaseOrder)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
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
                      <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this purchase order? This action cannot be undone and will
                        permanently remove the purchase order from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Delete Purchase Order
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

      {/* Purchase Order Content */}
      <div className="bg-white p-8 rounded-lg border shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">2K</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Purchase Order</h1>
              <p className="text-gray-600">2K Inventory Management</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">PURCHASE ORDER #:</p>
            <p className="text-lg font-bold">{purchaseOrder.po_number}</p>
            <p className="text-sm text-gray-600 mt-2">DATE:</p>
            <p className="font-semibold">{new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Supplier Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name:</p>
                <p className="font-semibold">{purchaseOrder.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status:</p>
                <div className="mt-1">{getStatusBadge(purchaseOrder.status)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border mb-4">
            <h2 className="text-lg font-bold text-gray-800">Order Information</h2>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold text-gray-800">Material Name</TableHead>
                  <TableHead className="font-bold text-gray-800">Price</TableHead>
                  <TableHead className="font-bold text-gray-800">Quantity</TableHead>
                  <TableHead className="font-bold text-gray-800">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.material_name}</TableCell>
                    <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="font-medium">₱{item.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {/* Empty rows for spacing */}
                {Array.from({ length: Math.max(0, 3 - purchaseOrder.items.length) }).map((_, index) => (
                  <TableRow key={`empty-${index}`}>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-8">
          <div className="bg-gray-50 p-4 rounded-lg border mb-4">
            <h2 className="text-lg font-bold text-gray-800">Payment Summary</h2>
          </div>
          <div className="max-w-md ml-auto bg-gray-50 p-4 rounded-lg border">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₱{purchaseOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium">{(purchaseOrder.discount_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes:</span>
                <span className="font-medium">{(purchaseOrder.tax_rate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">₱{purchaseOrder.shipping_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>TOTAL:</span>
                <span>₱{purchaseOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
