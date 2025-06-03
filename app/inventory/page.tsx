"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, Trash2, RefreshCw, Factory } from "lucide-react"
import { getRawMaterials, deleteRawMaterial, updateRawMaterial, type RawMaterial, isAdmin } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import AddRawItemModal from "@/components/add-raw-item-modal"
import EditRawItemModal from "@/components/edit-raw-item-modal"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import dynamic from "next/dynamic"
import ItemQRCode from "@/components/ui/item-qr-code"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import GenerateProductOrderModal from "@/components/generate-product-order-modal"

const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), { ssr: false })

export default function RawMaterialInventoryPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrMaterial, setQRMaterial] = useState<RawMaterial | null>(null)
  const [showProductOrderModal, setShowProductOrderModal] = useState(false)
  const { toast } = useToast()
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  const loadRawMaterials = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRawMaterials()
      setRawMaterials(data)
    } catch (error) {
      console.error("Error loading raw materials:", error)
      toast({
        title: "Error",
        description: "Failed to load raw materials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadRawMaterials()
  }, [loadRawMaterials])

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await isAdmin()
      setIsUserAdmin(adminStatus)
    }
    checkAdminStatus()
  }, [])

  const categories = [...new Set(rawMaterials.map((item) => item.category))]

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
    let filtered = rawMaterials

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.category || "").toLowerCase().includes(searchTerm.toLowerCase()),
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

    setFilteredMaterials(filtered)
  }, [rawMaterials, searchTerm, categoryFilter, statusFilter])

  const handleItemAdded = async (newItem: RawMaterial) => {
    // Reload data from database to ensure consistency
    await loadRawMaterials()
    toast({ title: "Success", description: "Raw material added and data refreshed." })
  }

  const handleItemUpdated = async (updatedItem: RawMaterial) => {
    // Reload data from database to ensure consistency
    await loadRawMaterials()
    toast({ title: "Success", description: "Raw material updated and data refreshed." })
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const success = await deleteRawMaterial(id)
      if (success) {
        // Reload data from database to ensure consistency
        await loadRawMaterials()
        toast({ title: "Raw material deleted", description: `${name} has been removed and data refreshed.` })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete raw material. Please try again.",
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
      if (parsed && parsed.type === "raw_material_update" && parsed.itemId) {
        const material = rawMaterials.find(
          (item) => item.id.toString() === parsed.itemId.toString() || item.sku === parsed.itemId,
        )
        if (material) {
          const updatedMaterial = await updateRawMaterial(material.id, { quantity: material.quantity + 1 })
          if (updatedMaterial) {
            toast({
              title: "Quantity Incremented",
              description: `Quantity for ${material.name} incremented to ${updatedMaterial.quantity}`,
            })
            await loadRawMaterials()
          } else {
            toast({ title: "Error", description: "Failed to update material quantity.", variant: "destructive" })
          }
        } else {
          window.alert("QR code does not match any raw material.")
        }
      } else {
        const material = rawMaterials.find((item) => item.sku === barcode)
        if (material) {
          const updatedMaterial = await updateRawMaterial(material.id, { quantity: material.quantity + 1 })
          if (updatedMaterial) {
            toast({
              title: "Quantity Incremented",
              description: `Quantity for ${material.name} incremented to ${updatedMaterial.quantity}`,
            })
            await loadRawMaterials()
          } else {
            toast({ title: "Error", description: "Failed to update material quantity.", variant: "destructive" })
          }
        } else {
          window.alert("Raw Material Not Found. Would you like to add this material?")
        }
      }
      setShowBarcodeScanner(false)
    } catch (error) {
      window.alert("Error: Failed to process barcode scan")
    } finally {
      setIsProcessingBarcode(false)
    }
  }

  const handleProductOrderCreated = () => {
    toast({
      title: "Product Order Created",
      description: "The product order has been created successfully.",
    })
    // In a real app, we might want to refresh raw materials here
    loadRawMaterials()
  }

  // Helper function to safely format currency
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return "₱0.00"
    }
    return `₱${Number(value).toFixed(2)}`
  }

  if (isLoading && rawMaterials.length === 0) {
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
        <PageHeader title="Raw Materials">
          <span className="text-muted-foreground text-base">Manage your raw materials and inventory</span>
        </PageHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Raw Material Inventory</CardTitle>
                <CardDescription>Track and manage your raw materials</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadRawMaterials} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowProductOrderModal(true)}
                >
                  <Factory className="h-4 w-4 mr-2" />
                  Generate Product Order
                </Button>
                <AddRawItemModal onItemAdded={handleItemAdded} onItemUpdated={handleItemUpdated} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search raw materials..."
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
                  {categories.map(
                    (category, index) =>
                      category && (
                        <SelectItem key={`${category}-${index}`} value={category}>
                          {category}
                        </SelectItem>
                      ),
                  )}
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

            {/* Raw Materials Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Raw Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="pr-8">Quantity</TableHead>
                    <TableHead className="pr-8">Unit</TableHead>
                    <TableHead className="pr-8">Cost/Unit</TableHead>
                    <TableHead className="pr-8">Supplier</TableHead>
                    <TableHead className="pl-6">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {rawMaterials.length === 0
                          ? "No raw materials found. Add your first material to get started."
                          : "No raw materials match your search criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((item, index) => (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell className="font-mono text-sm">{item.sku || "N/A"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{item.category || "N/A"}</TableCell>
                        <TableCell className="pr-8">{item.quantity || 0}</TableCell>
                        <TableCell className="pr-8">{item.unit || "N/A"}</TableCell>
                        <TableCell className="pr-8">{formatCurrency(item.cost_per_unit)}</TableCell>
                        <TableCell className="pr-8">{item.supplier || "N/A"}</TableCell>
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
                                setQRMaterial(item)
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
                Showing {filteredMaterials.length} of {rawMaterials.length} raw materials
              </p>
              <p>
                Total value:{" "}
                {formatCurrency(
                  rawMaterials.reduce((sum, item) => {
                    const cost = item.cost_per_unit || 0
                    const quantity = item.quantity || 0
                    return sum + cost * quantity
                  }, 0),
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingItem && (
          <EditRawItemModal
            material={editingItem}
            onClose={() => setEditingItem(null)}
            onItemUpdated={handleItemUpdated}
          />
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
              {qrMaterial && <ItemQRCode itemId={qrMaterial.id.toString()} itemName={qrMaterial.name} />}
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Product Order Modal */}
        <GenerateProductOrderModal
          isOpen={showProductOrderModal}
          onClose={() => setShowProductOrderModal(false)}
          onOrderCreated={handleProductOrderCreated}
        />
      </div>
    </MainLayout>
  )
}
