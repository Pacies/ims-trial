"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createPurchaseOrder, type CreatePurchaseOrderData } from "@/lib/purchase-orders-utils"
import { getRawMaterials, getFixedPrices, type RawMaterial, type FixedPrice } from "@/lib/database"
import { addActivity } from "@/lib/activity-store"

interface ManualPOGenerationModalProps {
  open: boolean
  onClose: () => void
  onPOCreated: () => void
}

interface SelectedItem {
  raw_material_id: number
  material_name: string
  quantity: number
  unit_price: number
}

export default function ManualPOGenerationModal({ open, onClose, onPOCreated }: ManualPOGenerationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([])
  const [fixedPrices, setFixedPrices] = useState<FixedPrice[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceOption, setPriceOption] = useState<"manual" | "fixed">("manual")
  const [manualPrice, setManualPrice] = useState("")
  const [selectedFixedPrice, setSelectedFixedPrice] = useState("")
  const { toast } = useToast()

  const suppliers = ["A&B Textile", "Lucky 8"]

  // Define expected materials for each supplier
  const getExpectedMaterials = (supplier: string) => {
    if (supplier === "A&B Textile") {
      return [
        { name: "Cotton Fabric", category: "Fabric" },
        { name: "Polyester Fabric", category: "Fabric" },
        { name: "Denim Fabric", category: "Fabric" },
      ]
    } else if (supplier === "Lucky 8") {
      return [
        { name: "Buttons", category: "Sewing" },
        { name: "Thread", category: "Sewing" },
        { name: "Zipper", category: "Sewing" },
        { name: "Needle", category: "Sewing" },
        { name: "Scissors", category: "Sewing" },
      ]
    }
    return []
  }

  useEffect(() => {
    if (selectedSupplier) {
      loadMaterialsBySupplier()
      loadFixedPrices()
    }
  }, [selectedSupplier])

  const loadMaterialsBySupplier = async () => {
    try {
      const materials = await getRawMaterials()
      const expectedMaterials = getExpectedMaterials(selectedSupplier)

      // Filter materials by supplier AND category, but also include expected materials
      const supplierMaterials = materials.filter((material) => {
        // Check supplier match
        const supplierMatch = material.supplier === selectedSupplier

        // Check category match based on supplier
        let categoryMatch = false
        if (selectedSupplier === "A&B Textile") {
          categoryMatch = material.category?.toLowerCase() === "fabric"
        } else if (selectedSupplier === "Lucky 8") {
          categoryMatch = material.category?.toLowerCase() === "sewing"
        }

        return supplierMatch && categoryMatch
      })

      // Ensure all expected materials are included (create virtual entries if missing)
      expectedMaterials.forEach((expectedMaterial) => {
        const exists = supplierMaterials.find(
          (m) =>
            m.name.toLowerCase() === expectedMaterial.name.toLowerCase() &&
            m.category?.toLowerCase() === expectedMaterial.category.toLowerCase(),
        )

        if (!exists) {
          // Create a virtual material entry
          const virtualMaterial: RawMaterial = {
            id: Date.now() + Math.random(), // Temporary ID
            name: expectedMaterial.name,
            category: expectedMaterial.category,
            quantity: 0,
            unit: expectedMaterial.category === "Fabric" ? "rolls" : "pcs",
            cost_per_unit: 0,
            supplier: selectedSupplier,
            reorder_level: 20,
            sku: `TEMP-${expectedMaterial.name.replace(/\s+/g, "").toUpperCase()}`,
            status: "out-of-stock",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          supplierMaterials.push(virtualMaterial)
        }
      })

      // Sort materials alphabetically
      supplierMaterials.sort((a, b) => a.name.localeCompare(b.name))

      setAvailableMaterials(supplierMaterials)
      console.log(`Materials for ${selectedSupplier}:`, supplierMaterials)

      // Reset selected material when supplier changes
      setSelectedMaterial("")
    } catch (error) {
      console.error("Error loading materials:", error)
    }
  }

  const loadFixedPrices = async () => {
    try {
      const category = selectedSupplier === "A&B Textile" ? "Fabric" : "Sewing"
      const prices = await getFixedPrices("raw_material", category)
      setFixedPrices(prices)
    } catch (error) {
      console.error("Error loading fixed prices:", error)
    }
  }

  const getCurrentPrice = (): number => {
    if (priceOption === "manual") {
      return Number.parseFloat(manualPrice) || 0
    } else {
      const selectedPrice = fixedPrices.find((p) => p.id.toString() === selectedFixedPrice)
      return selectedPrice?.price || 0
    }
  }

  const handleAddItem = () => {
    if (!selectedMaterial || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please select a material and enter quantity.",
        variant: "destructive",
      })
      return
    }

    const price = getCurrentPrice()
    if (price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      })
      return
    }

    const material = availableMaterials.find((m) => m.id.toString() === selectedMaterial)
    if (!material) {
      toast({
        title: "Error",
        description: "Selected material not found.",
        variant: "destructive",
      })
      return
    }

    // Check if item already exists
    const existingItem = selectedItems.find((item) => item.raw_material_id === material.id)
    if (existingItem) {
      toast({
        title: "Item Already Added",
        description: "This material is already in the purchase order.",
        variant: "destructive",
      })
      return
    }

    const newItem: SelectedItem = {
      raw_material_id: material.id,
      material_name: material.name,
      quantity: Number.parseFloat(quantity),
      unit_price: price,
    }

    setSelectedItems([...selectedItems, newItem])
    setSelectedMaterial("")
    setQuantity("")
    setPriceOption("manual")
    setManualPrice("")
    setSelectedFixedPrice("")

    toast({
      title: "Item Added",
      description: `${material.name} has been added to the purchase order.`,
    })
  }

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index))
  }

  const handleCreatePO = async () => {
    if (!selectedSupplier) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier.",
        variant: "destructive",
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the purchase order.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const orderData: CreatePurchaseOrderData = {
        supplier: selectedSupplier,
        notes: `Manually generated PO. Created on ${new Date().toLocaleDateString()}.`,
        items: selectedItems,
      }

      const createdOrder = await createPurchaseOrder(orderData)
      if (createdOrder) {
        toast({
          title: "Purchase Order Created",
          description: `PO ${createdOrder.po_number} has been created successfully.`,
        })
        addActivity(`Created manual purchase order ${createdOrder.po_number} for ${selectedSupplier}`)
        onPOCreated()
      } else {
        toast({
          title: "Error",
          description: "Failed to create purchase order. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose()
      // Reset form state
      setSelectedSupplier("")
      setAvailableMaterials([])
      setFixedPrices([])
      setSelectedItems([])
      setSelectedMaterial("")
      setQuantity("")
      setPriceOption("manual")
      setManualPrice("")
      setSelectedFixedPrice("")
    }
  }

  const getTotalAmount = () => {
    return selectedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const getSupplierCategory = () => {
    if (selectedSupplier === "A&B Textile") return "Fabric"
    if (selectedSupplier === "Lucky 8") return "Sewing"
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Purchase Order Manually</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Select Supplier</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier} ({supplier === "A&B Textile" ? "Fabric Materials" : "Sewing Materials"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSupplier && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{selectedSupplier}</span> -
                <span className="font-medium"> {getSupplierCategory()} materials only</span>
              </p>
            )}
          </div>

          {/* Add Items Section */}
          {selectedSupplier && (
            <Card>
              <CardHeader>
                <CardTitle>Add {getSupplierCategory()} Materials to Purchase Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableMaterials.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading materials...</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label htmlFor="material">Material ({getSupplierCategory()})</Label>
                        <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="Enter quantity"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceOption">Price Option</Label>
                        <Select
                          value={priceOption}
                          onValueChange={(value) => setPriceOption(value as "manual" | "fixed")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual Price</SelectItem>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        {priceOption === "manual" ? (
                          <>
                            <Label htmlFor="manualPrice">Unit Price (₱)</Label>
                            <Input
                              id="manualPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={manualPrice}
                              onChange={(e) => setManualPrice(e.target.value)}
                              placeholder="Enter unit price"
                            />
                          </>
                        ) : (
                          <>
                            <Label htmlFor="fixedPrice">Fixed Price</Label>
                            <Select value={selectedFixedPrice} onValueChange={setSelectedFixedPrice}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select price" />
                              </SelectTrigger>
                              <SelectContent>
                                {fixedPrices.length === 0 ? (
                                  <SelectItem value="no-prices" disabled>
                                    No fixed prices available
                                  </SelectItem>
                                ) : (
                                  fixedPrices.map((price) => (
                                    <SelectItem key={price.id} value={price.id.toString()}>
                                      {price.item_name} - ₱{price.price.toFixed(2)}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                      <div>
                        <Button onClick={handleAddItem} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Available materials: {availableMaterials.length}</p>
                    </div>
                  </div>
                )}
                {/* Price Preview */}
                {selectedMaterial && quantity && getCurrentPrice() > 0 && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm">
                      <span className="font-medium">Total Cost:</span> ₱
                      {(getCurrentPrice() * Number.parseFloat(quantity || "0")).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₱{getCurrentPrice().toFixed(2)} × {quantity} units
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selected Items Table */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map((item, index) => {
                      const material = availableMaterials.find((m) => m.id === item.raw_material_id)
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.material_name}</TableCell>
                          <TableCell>{material?.category || getSupplierCategory()}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">₱{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={4} className="font-bold text-right">
                        Total Amount:
                      </TableCell>
                      <TableCell className="font-bold">₱{getTotalAmount().toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={isLoading || selectedItems.length === 0 || !selectedSupplier}>
              {isLoading ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
