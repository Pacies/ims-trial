"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updatePurchaseOrder, type PurchaseOrder } from "@/lib/purchase-orders-utils"
import { getRawMaterials, getFixedPrices, type RawMaterial, type FixedPrice } from "@/lib/database"

interface EditPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder | null
  onClose: () => void
  onOrderUpdated: (updatedOrder: PurchaseOrder) => void
}

interface NewItem {
  raw_material_id: number
  material_name: string
  quantity: number
  unit_price: number
}

export default function EditPurchaseOrderModal({
  purchaseOrder,
  onClose,
  onOrderUpdated,
}: EditPurchaseOrderModalProps) {
  const [formData, setFormData] = useState({
    status: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([])
  const [fixedPrices, setFixedPrices] = useState<FixedPrice[]>([])
  const [newItems, setNewItems] = useState<NewItem[]>([])

  // Add item form state
  const [step, setStep] = useState(1) // 1: category, 2: type, 3: quantity, 4: price
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [customType, setCustomType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceOption, setPriceOption] = useState<"manual" | "fixed">("manual")
  const [manualPrice, setManualPrice] = useState("")
  const [selectedFixedPrice, setSelectedFixedPrice] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const { toast } = useToast()

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

  // Get supplier-specific categories
  const getSupplierCategories = () => {
    if (!purchaseOrder) return []

    if (purchaseOrder.supplier === "A&B Textile") {
      return [
        {
          name: "Fabric",
          types: ["Cotton Fabric", "Polyester Fabric", "Denim Fabric", "Others"],
        },
      ]
    } else if (purchaseOrder.supplier === "Lucky 8") {
      return [
        {
          name: "Sewing",
          types: ["Buttons", "Thread", "Zipper", "Needle", "Scissors", "Others"],
        },
      ]
    }
    return []
  }

  const categories = getSupplierCategories()

  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        status: purchaseOrder.status,
      })
      loadAvailableMaterials()
    }
  }, [purchaseOrder])

  useEffect(() => {
    if (selectedCategory && step === 4) {
      loadFixedPrices()
    }
  }, [selectedCategory, step])

  const loadAvailableMaterials = async () => {
    try {
      const materials = await getRawMaterials()
      const expectedMaterials = getExpectedMaterials(purchaseOrder?.supplier || "")

      // Filter materials by supplier AND category
      const supplierMaterials = materials.filter((material) => {
        // Check supplier match
        const supplierMatch = material.supplier === purchaseOrder?.supplier

        // Check category match based on supplier
        let categoryMatch = false
        if (purchaseOrder?.supplier === "A&B Textile") {
          categoryMatch = material.category?.toLowerCase() === "fabric"
        } else if (purchaseOrder?.supplier === "Lucky 8") {
          categoryMatch = material.category?.toLowerCase() === "sewing"
        }

        return supplierMatch && categoryMatch
      })

      // Ensure all expected materials are included
      expectedMaterials.forEach((expectedMaterial) => {
        const exists = supplierMaterials.find(
          (m) =>
            m.name.toLowerCase() === expectedMaterial.name.toLowerCase() &&
            m.category?.toLowerCase() === expectedMaterial.category.toLowerCase(),
        )

        if (!exists) {
          // Create a virtual material entry
          const virtualMaterial: RawMaterial = {
            id: Date.now() + Math.random(),
            name: expectedMaterial.name,
            category: expectedMaterial.category,
            quantity: 0,
            unit: expectedMaterial.category === "Fabric" ? "rolls" : "pcs",
            cost_per_unit: 0,
            supplier: purchaseOrder?.supplier || "",
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
      console.log("Filtered materials for supplier", purchaseOrder?.supplier, ":", supplierMaterials)
    } catch (error) {
      console.error("Error loading materials:", error)
    }
  }

  const loadFixedPrices = async () => {
    try {
      const prices = await getFixedPrices("raw_material", selectedCategory)
      setFixedPrices(prices)
    } catch (error) {
      console.error("Error loading fixed prices:", error)
    }
  }

  const resetAddItemForm = () => {
    setStep(1)
    setSelectedCategory("")
    setSelectedType("")
    setCustomType("")
    setQuantity("")
    setPriceOption("manual")
    setManualPrice("")
    setSelectedFixedPrice("")
    setShowCustomInput(false)
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setStep(2)
  }

  const handleTypeSelect = (type: string) => {
    if (type === "Others") {
      setShowCustomInput(true)
    } else {
      setSelectedType(type)
      setStep(3)
    }
  }

  const handleCustomTypeSubmit = () => {
    if (customType.trim()) {
      setSelectedType(customType.trim())
      setStep(3)
      setShowCustomInput(false)
    }
  }

  const handleQuantitySubmit = () => {
    if (quantity && Number.parseFloat(quantity) > 0) {
      setStep(4)
    } else {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0.",
        variant: "destructive",
      })
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
    if (!selectedCategory || !selectedType || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please complete all steps.",
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

    // Find matching material from available materials (already filtered by supplier AND category)
    const material = availableMaterials.find(
      (m) =>
        m.name.toLowerCase() === selectedType.toLowerCase() &&
        m.category?.toLowerCase() === selectedCategory.toLowerCase(),
    )

    if (!material) {
      toast({
        title: "Material Not Found",
        description: `This material is not available from ${purchaseOrder?.supplier}.`,
        variant: "destructive",
      })
      return
    }

    const newItem: NewItem = {
      raw_material_id: material.id,
      material_name: selectedType,
      quantity: Number.parseFloat(quantity),
      unit_price: price,
    }

    setNewItems([...newItems, newItem])
    resetAddItemForm()
    setShowAddItem(false)

    toast({
      title: "Item Added",
      description: `${selectedType} has been added to the purchase order.`,
    })
  }

  const handleRemoveNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseOrder) return

    setIsLoading(true)
    try {
      const updateData = {
        status: formData.status as PurchaseOrder["status"],
      }

      const updatedOrder = await updatePurchaseOrder(purchaseOrder.id, updateData)
      if (updatedOrder) {
        onOrderUpdated(updatedOrder)
        onClose()
        toast({
          title: "Purchase order updated",
          description: `PO ${purchaseOrder.po_number} has been updated successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update purchase order. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 4) {
      setStep(3)
      setPriceOption("manual")
      setManualPrice("")
      setSelectedFixedPrice("")
    } else if (step === 3) {
      setStep(2)
      setQuantity("")
    } else if (step === 2) {
      setStep(1)
      setSelectedType("")
      setCustomType("")
      setShowCustomInput(false)
    }
  }

  const selectedCategoryData = categories.find((cat) => cat.name === selectedCategory)

  const getSupplierCategory = () => {
    if (purchaseOrder?.supplier === "A&B Textile") return "Fabric"
    if (purchaseOrder?.supplier === "Lucky 8") return "Sewing"
    return ""
  }

  if (!purchaseOrder) return null

  return (
    <Dialog open={!!purchaseOrder} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Purchase Order {purchaseOrder.po_number} - {purchaseOrder.supplier} ({getSupplierCategory()})
          </DialogTitle>
        </DialogHeader>

        {!showAddItem ? (
          <div className="space-y-6">
            {/* Status Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>

            {/* Add Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Add {getSupplierCategory()} Materials to Purchase Order ({purchaseOrder.supplier})
                  <Button onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Raw Material
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Available materials: <span className="font-medium">{availableMaterials.length}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Expected:{" "}
                    {getExpectedMaterials(purchaseOrder.supplier)
                      .map((m) => m.name)
                      .join(", ")}
                  </p>
                </div>
                {newItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.material_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell>₱{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveNewItem(index)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No new items added. Click "Add Raw Material" to add {getSupplierCategory().toLowerCase()} materials
                    from {purchaseOrder.supplier} to this purchase order.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Add Item Form - Supplier Specific */
          <div className="space-y-4">
            {/* Step 1: Category Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddItem(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Select Category for {purchaseOrder.supplier}</Label>
                </div>
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No categories available for {purchaseOrder.supplier}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        variant="outline"
                        className="h-12 text-left justify-start"
                        onClick={() => handleCategorySelect(category.name)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Type Selection */}
            {step === 2 && !showCustomInput && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Select {selectedCategory} Type</Label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {selectedCategoryData?.types.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      className="h-12 text-left justify-start"
                      onClick={() => handleTypeSelect(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Type Input */}
            {step === 2 && showCustomInput && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Enter Custom {selectedCategory} Type</Label>
                </div>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder={`Enter ${selectedCategory.toLowerCase()} type name`}
                  onKeyPress={(e) => e.key === "Enter" && handleCustomTypeSubmit()}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCustomTypeSubmit} disabled={!customType.trim()}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Quantity Input */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Enter Quantity</Label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{selectedType}</span> ({selectedCategory}) from{" "}
                    {purchaseOrder.supplier}
                  </p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleQuantitySubmit} disabled={!quantity || Number.parseFloat(quantity) <= 0}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Price Input */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Label className="text-base font-medium">Set Price</Label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Item: <span className="font-medium">{selectedType}</span> | Quantity:{" "}
                    <span className="font-medium">{quantity}</span> | Supplier:{" "}
                    <span className="font-medium">{purchaseOrder.supplier}</span>
                  </p>

                  {/* Price Option Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Choose Price Option</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="manual"
                          name="priceOption"
                          value="manual"
                          checked={priceOption === "manual"}
                          onChange={(e) => setPriceOption(e.target.value as "manual" | "fixed")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="manual" className="text-sm">
                          Enter price manually
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="fixed"
                          name="priceOption"
                          value="fixed"
                          checked={priceOption === "fixed"}
                          onChange={(e) => setPriceOption(e.target.value as "manual" | "fixed")}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="fixed" className="text-sm">
                          Use fixed price from database
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Manual Price Input */}
                  {priceOption === "manual" && (
                    <div className="space-y-2">
                      <Label htmlFor="manualPrice" className="text-sm">
                        Price per unit (₱)
                      </Label>
                      <Input
                        id="manualPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* Fixed Price Dropdown */}
                  {priceOption === "fixed" && (
                    <div className="space-y-2">
                      <Label htmlFor="fixedPrice" className="text-sm">
                        Select fixed price
                      </Label>
                      <Select value={selectedFixedPrice} onValueChange={setSelectedFixedPrice}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a fixed price" />
                        </SelectTrigger>
                        <SelectContent>
                          {fixedPrices.length === 0 ? (
                            <SelectItem value="no-prices" disabled>
                              No fixed prices available for {selectedCategory}
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
                    </div>
                  )}

                  {/* Price Preview */}
                  {getCurrentPrice() > 0 && (
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
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} disabled={getCurrentPrice() <= 0}>
                    Add to Purchase Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
