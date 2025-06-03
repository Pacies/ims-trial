"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Plus, Eye, ArrowLeft, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import EditPurchaseOrderModal from "@/components/edit-purchase-order-modal"
import ManualPOGenerationModal from "@/components/manual-po-generation-modal"
import { getPurchaseOrders, generatePurchaseOrdersForLowStock, type PurchaseOrder } from "@/lib/purchase-orders-utils"
import { getRawMaterials } from "@/lib/database"
import { addActivity } from "@/lib/activity-store"
import { useRouter } from "next/navigation"

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [showManualPOModal, setShowManualPOModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPurchaseOrders()
      setPurchaseOrders(data)
    } catch (error) {
      console.error("Error loading purchase orders:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadPurchaseOrders()
  }, [loadPurchaseOrders])

  useEffect(() => {
    let filtered = purchaseOrders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.supplier.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Sort by created date (newest first)
    filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFilteredOrders(filtered)
  }, [purchaseOrders, searchTerm, statusFilter])

  const handleOrderUpdated = async (updatedOrder: PurchaseOrder) => {
    await loadPurchaseOrders()
    setEditingOrder(null)
  }

  const handleManualPOCreated = async () => {
    await loadPurchaseOrders()
    setShowManualPOModal(false)
  }

  const handleGeneratePOs = async () => {
    setIsGenerating(true)
    try {
      const rawMaterials = await getRawMaterials()
      const generatedOrders = await generatePurchaseOrdersForLowStock(rawMaterials)

      if (generatedOrders.length > 0) {
        await loadPurchaseOrders()
        addActivity(`Generated ${generatedOrders.length} purchase order(s) for low stock items`)
        toast({
          title: "Purchase orders generated",
          description: `${generatedOrders.length} purchase order(s) created for low stock items.`,
        })
      } else {
        toast({
          title: "No orders needed",
          description: "No low stock items found or purchase orders already exist.",
        })
      }
    } catch (error) {
      console.error("Error generating purchase orders:", error)
      toast({
        title: "Error",
        description: "Failed to generate purchase orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
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

  const handleViewPO = (order: PurchaseOrder) => {
    router.push(`/orders/purchase-orders/${order.id}`)
  }

  if (isLoading && purchaseOrders.length === 0) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Purchase Orders">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <span className="text-muted-foreground text-base">Manage purchase orders and supplier communications</span>
          </div>
        </PageHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>View and manage all purchase orders</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadPurchaseOrders} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualPOModal(true)}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate PO Manually
                </Button>
                <Button onClick={handleGeneratePOs} disabled={isGenerating} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate POs"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search purchase orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Orders Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {purchaseOrders.length === 0
                          ? "No purchase orders found. Generate POs for low stock items to get started."
                          : "No purchase orders match your search criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewPO(order)}
                      >
                        <TableCell className="font-mono text-sm">{order.po_number}</TableCell>
                        <TableCell>{order.supplier}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>₱{order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewPO(order)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {filteredOrders.length} of {purchaseOrders.length} purchase orders
              </p>
              <p>Total value: ₱{purchaseOrders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingOrder && (
          <EditPurchaseOrderModal
            purchaseOrder={editingOrder}
            onClose={() => setEditingOrder(null)}
            onOrderUpdated={handleOrderUpdated}
          />
        )}

        {/* Manual PO Generation Modal */}
        <ManualPOGenerationModal
          open={showManualPOModal}
          onClose={() => setShowManualPOModal(false)}
          onPOCreated={handleManualPOCreated}
        />
      </div>
    </MainLayout>
  )
}
