"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, RefreshCw, Eye, ArrowLeft, Trash2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import {
  getProductOrders,
  getProductOrderById,
  updateProductOrderStatus,
  deleteProductOrder,
  getProductOrderHistory,
} from "@/lib/orders-utils"
import { getRawMaterials } from "@/lib/database"
import { useRouter } from "next/navigation"

export default function WorkOrdersPage() {
  const [productOrders, setProductOrders] = useState([])
  const [productOrderHistory, setProductOrderHistory] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [historySearchTerm, setHistorySearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [orderToComplete, setOrderToComplete] = useState(null)
  const { toast } = useToast()
  const router = useRouter()

  const loadProductOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const orders = await getProductOrders()
      const history = await getProductOrderHistory()
      const materials = await getRawMaterials()
      setProductOrders(orders)
      setProductOrderHistory(history)
      setRawMaterials(materials)
    } catch (error) {
      console.error("Error loading product orders:", error)
      toast({
        title: "Error",
        description: "Failed to load product orders. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadProductOrders()
  }, [loadProductOrders])

  useEffect(() => {
    let filtered = productOrders

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.productName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Sort by created date (newest first)
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredOrders(filtered)
  }, [productOrders, searchTerm, statusFilter])

  useEffect(() => {
    let filtered = productOrderHistory

    if (historySearchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
          order.productName.toLowerCase().includes(historySearchTerm.toLowerCase()),
      )
    }

    // Sort by completed date (newest first)
    filtered = [...filtered].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

    setFilteredHistory(filtered)
  }, [productOrderHistory, historySearchTerm])

  const handleViewOrder = async (orderId) => {
    try {
      const order = await getProductOrderById(orderId)
      setSelectedOrder(order)
      setIsViewModalOpen(true)
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return

    try {
      const success = await deleteProductOrder(orderToDelete)
      if (success) {
        toast({
          title: "Success",
          description: "Product order deleted successfully",
        })
        loadProductOrders()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product order",
          variant: "destructive",
        })
      }
      setIsConfirmDeleteOpen(false)
      setOrderToDelete(null)
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Error",
        description: "Failed to delete product order",
        variant: "destructive",
      })
      setIsConfirmDeleteOpen(false)
      setOrderToDelete(null)
    }
  }

  const handleCompleteOrder = async () => {
    if (!orderToComplete) return

    try {
      const updatedOrder = await updateProductOrderStatus(orderToComplete, "completed")
      if (updatedOrder) {
        toast({
          title: "Success",
          description: "Product order completed successfully and moved to history",
        })
        loadProductOrders()
      } else {
        toast({
          title: "Error",
          description: "Failed to complete product order",
          variant: "destructive",
        })
      }
      setIsConfirmCompleteOpen(false)
      setOrderToComplete(null)
    } catch (error) {
      console.error("Error completing order:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to complete product order",
        variant: "destructive",
      })
      setIsConfirmCompleteOpen(false)
      setOrderToComplete(null)
    }
  }

  const getMaterialName = (materialId) => {
    const material = rawMaterials.find((m) => m.id === materialId)
    return material ? material.name : "Unknown Material"
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        )
      case "in-progress":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading && productOrders.length === 0) {
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
        <PageHeader title="Work Orders">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <span className="text-muted-foreground text-base">Manage your production work orders</span>
          </div>
        </PageHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Orders</CardTitle>
                <CardDescription>View and manage all production orders</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadProductOrders} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="active">Active Orders</TabsTrigger>
                <TabsTrigger value="history">Order History</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                {/* Filters */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search work orders..."
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
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Work Orders Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {productOrders.length === 0
                              ? "No work orders found. Create product orders from the Raw Materials page to get started."
                              : "No work orders match your search criteria."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">{order.id}</TableCell>
                            <TableCell>{order.productName}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setOrderToComplete(order.id)
                                    setIsConfirmCompleteOpen(true)
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setOrderToDelete(order.id)
                                    setIsConfirmDeleteOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
                    Showing {filteredOrders.length} of {productOrders.length} active work orders
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                {/* History Search */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search order history..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Order History Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {productOrderHistory.length === 0
                              ? "No completed orders found."
                              : "No completed orders match your search criteria."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map((order) => (
                          <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">{order.id}</TableCell>
                            <TableCell>{order.productName}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>{new Date(order.completedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* History Summary */}
                <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                  <p>
                    Showing {filteredHistory.length} of {productOrderHistory.length} completed orders
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* View Order Modal */}
        {selectedOrder && (
          <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Work Order {selectedOrder.id}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Product</h3>
                    <p>{selectedOrder.productName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Quantity</h3>
                    <p>{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <div>{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedOrder.status === "completed" ? "Completed" : "Created"}</h3>
                    <p>
                      {new Date(
                        selectedOrder.status === "completed" ? selectedOrder.completedAt : selectedOrder.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Materials Used</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material ID</TableHead>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.materials.map((material, index) => (
                        <TableRow key={index}>
                          <TableCell>{material.materialId}</TableCell>
                          <TableCell>{getMaterialName(material.materialId)}</TableCell>
                          <TableCell>{material.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Confirm Delete Modal */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this work order? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteOrder}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Complete Modal */}
        <Dialog open={isConfirmCompleteOpen} onOpenChange={setIsConfirmCompleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Order</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to mark this order as completed? This will add the produced items to your inventory
              and move the order to history.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmCompleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleCompleteOrder}>
                Complete Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
