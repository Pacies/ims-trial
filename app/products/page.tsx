"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, Trash2, RefreshCw } from "lucide-react"
import {
  getInventoryItems,
  deleteInventoryItem,
  updateInventoryItem,
  type InventoryItem,
  isAdmin,
} from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import AddItemModal from "@/components/add-item-modal"
import EditItemModal from "@/components/edit-item-modal"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import dynamic from "next/dynamic"
import ItemQRCode from "@/components/ui/item-qr-code"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false })

export default function ProductInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrProduct, setQRProduct] = useState<InventoryItem | null>(null)
  const { toast } = useToast()
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const loadInventoryItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getInventoryItems()
      setInventoryItems(data)
    } catch (error) {
      console.error("Error loading inventory items:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadInventoryItems()
  }, [loadInventoryItems])

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await isAdmin()
      setIsUserAdmin(adminStatus)
    }
    checkAdminStatus()
  }, [])

  const categories = [...new Set(inventoryItems.map((item) => item.category))]

  // Helper function to get status priority for sorting
  const getStatusPriority = (status: string): number => {
    switch (status) {
      case "out-of-stock":
        return 1 // Highest priority
      case "low-stock":
        return 2
      case "in-stock":
        return 3
      default:
        return 4
    }
  }

  useEffect(() => {
    let filtered = inventoryItems

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    // Sort by status priority (out-of-stock first, then low-stock, then in-stock)
    filtered = [...filtered].sort((a, b) => {
      return getStatusPriority(a.status) - getStatusPriority(b.status)
    })

    setFilteredItems(filtered)
  }, [inventoryItems, searchTerm, categoryFilter, statusFilter])

  const handleItemAdded = async (newItem: InventoryItem) => {
    // Reload data from database to ensure consistency
    await loadInventoryItems()
    toast({
      title: "Success",
      description: "Product added and data refreshed.",
    })
  }

  const handleItemUpdated = async (updatedItem: InventoryItem) => {
    // Reload data from database to ensure consistency
    await loadInventoryItems()
    setEditingItem(null) // Close the modal
    toast({
      title: "Success",
      description: "Product updated and data refreshed.",
    })
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const success = await deleteInventoryItem(id)
      if (success) {
        // Reload data from database to ensure consistency
        await loadInventoryItems()
        toast({
          title: "Product deleted",
          description: `${name} has been removed and data refreshed.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-stock":
        return <Badge variant="default">In Stock</Badge>
      case "low-stock":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Low Stock
          </Badge>
        )
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleBarcodeScanned = async (result: { text: string; format: string } | null) => {
    if (!result || isProcessingBarcode) return
    setIsProcessingBarcode(true)
    try {
      const barcode = result.text
      const type = result.format
      let parsed: any = null
      try {
        parsed = JSON.parse(barcode)
      } catch (e) {}
      if (parsed && parsed.type === "item_update" && parsed.itemId) {
        const product = inventoryItems.find(
          (item) => item.id.toString() === parsed.itemId.toString() || item.sku === parsed.itemId,
        )
        if (product) {
          const updatedItem = await updateInventoryItem(product.id, { stock: product.stock + 1 })
          if (updatedItem) {
            toast({
              title: "Stock Incremented",
              description: `Stock for ${product.name} incremented to ${updatedItem.stock}`,
            })
            await loadInventoryItems()
          } else {
            toast({ title: "Error", description: "Failed to update product stock.", variant: "destructive" })
          }
        } else {
          window.alert("QR code does not match any product.")
        }
      } else {
        const product = inventoryItems.find((item) => item.sku === barcode)
        if (product) {
          const updatedItem = await updateInventoryItem(product.id, { stock: product.stock + 1 })
          if (updatedItem) {
            toast({
              title: "Stock Incremented",
              description: `Stock for ${product.name} incremented to ${updatedItem.stock}`,
            })
            await loadInventoryItems()
          } else {
            toast({ title: "Error", description: "Failed to update product stock.", variant: "destructive" })
          }
        } else {
          window.alert("Product Not Found. Would you like to add this product?")
        }
      }
      setShowBarcodeScanner(false)
    } catch (error) {
      window.alert("Error: Failed to process barcode scan")
    } finally {
      setIsProcessingBarcode(false)
    }
  }

  if (isLoading && inventoryItems.length === 0) {
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
        <PageHeader title="Products">
          <span className="text-muted-foreground text-base">Manage your finished products and inventory</span>
        </PageHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>Track and manage your finished products</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadInventoryItems} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <AddItemModal onItemAdded={handleItemAdded} onItemUpdated={handleItemUpdated} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category, index) => (
                    <SelectItem key={`${category}-${index}`} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="bg-blue-600 text-white"
                onClick={() => setShowBarcodeScanner(true)}
                disabled={isProcessingBarcode}
              >
                📱 Scan QR/Barcode
              </Button>
            </div>

            {/* Products Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="pr-8">Stock</TableHead>
                    <TableHead className="pr-8">Price</TableHead>
                    <TableHead className="pl-6">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {inventoryItems.length === 0
                          ? "No products found. Add your first product to get started."
                          : "No products match your search criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="pr-8">{item.stock} dz</TableCell>
                        <TableCell className="pr-8">₱{item.price.toFixed(2)}</TableCell>
                        <TableCell className="pl-6">{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isUserAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDelete(item.id, item.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setQRProduct(item)
                                setShowQRModal(true)
                              }}
                              title="Show QR Code"
                            >
                              Show QR
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
                Showing {filteredItems.length} of {inventoryItems.length} products
              </p>
              <p>
                Total value: ₱{inventoryItems.reduce((sum, item) => sum + item.price * item.stock, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingItem && (
          <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} onItemUpdated={handleItemUpdated} />
        )}

        {/* QR Code Scanner Dialog */}
        <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Scan QR/Barcode</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center">
              {/* @ts-ignore: react-qr-barcode-scanner types may be incorrect */}
              <BarcodeScanner
                // @ts-ignore
                onUpdate={(err, result) => {
                  if (result) {
                    // @ts-ignore
                    const text = result.getText ? result.getText() : result.text
                    handleBarcodeScanned({ text, format: "qr" })
                  }
                }}
                // @ts-ignore
                constraints={{ facingMode: "environment" }}
                style={{ width: "100%" }}
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowBarcodeScanner(false)}
                disabled={isProcessingBarcode}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-xs flex flex-col items-center justify-center">
            <DialogHeader>
              <DialogTitle>QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center w-full h-full">
              {qrProduct && <ItemQRCode itemId={qrProduct.id.toString()} itemName={qrProduct.name} type="item_update" />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
