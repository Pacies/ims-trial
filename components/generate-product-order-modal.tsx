"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getRawMaterials, getInventoryItems, type RawMaterial, type InventoryItem } from "@/lib/database"
import { createProductOrder } from "@/lib/orders-utils"
import { useToast } from "@/hooks/use-toast"
import { Loader2, X } from "lucide-react"

interface GenerateProductOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onOrderCreated: () => void
}

export default function GenerateProductOrderModal({ isOpen, onClose, onOrderCreated }: GenerateProductOrderModalProps) {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<
    Array<{ materialId: number; name: string; quantity: number; available: number; unit: string }>
  >([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState<string>("1")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const materialsData = await getRawMaterials()
        const productsData = await getInventoryItems()
        setRawMaterials(materialsData)
        setProducts(productsData)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load materials and products",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, toast])

  const handleAddMaterial = (materialId: number) => {
    const material = rawMaterials.find((m) => m.id === materialId)
    if (!material) return

    // Check if material is already selected
    if (selectedMaterials.some((m) => m.materialId === materialId)) {
      toast({
        title: "Material already added",
        description: "This material is already in your selection",
      })
      return
    }

    setSelectedMaterials([
      ...selectedMaterials,
      {
        materialId: material.id,
        name: material.name,
        quantity: 1,
        available: material.quantity || 0,
        unit: material.unit || "",
      },
    ])
  }

  const handleRemoveMaterial = (materialId: number) => {
    setSelectedMaterials(selectedMaterials.filter((m) => m.materialId !== materialId))
  }

  const handleQuantityChange = (materialId: number, value: string) => {
    const quantity = value === "" ? 0 : Number.parseInt(value) || 0
    const material = rawMaterials.find((m) => m.id === materialId)
    if (!material) return

    if (quantity > (material.quantity || 0)) {
      toast({
        title: "Insufficient stock",
        description: `Only ${material.quantity || 0} ${material.unit || "units"} available`,
        variant: "destructive",
      })
      return
    }

    setSelectedMaterials(selectedMaterials.map((m) => (m.materialId === materialId ? { ...m, quantity } : m)))
  }

  const handleSubmit = async () => {
    if (selectedMaterials.length === 0) {
      toast({
        title: "No materials selected",
        description: "Please select at least one material",
        variant: "destructive",
      })
      return
    }

    if (!selectedProduct) {
      toast({
        title: "No product selected",
        description: "Please select a product to produce",
        variant: "destructive",
      })
      return
    }

    const quantity = Number.parseInt(productQuantity) || 0
    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Product quantity must be greater than zero",
        variant: "destructive",
      })
      return
    }

    // Check if any material has invalid quantity
    const invalidMaterial = selectedMaterials.find((m) => m.quantity <= 0)
    if (invalidMaterial) {
      toast({
        title: "Invalid material quantity",
        description: `Please enter a valid quantity for ${invalidMaterial.name}`,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const product = products.find((p) => p.id.toString() === selectedProduct)
      if (!product) throw new Error("Selected product not found")

      const orderData = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        materials: selectedMaterials.map((m) => ({
          materialId: m.materialId,
          quantity: m.quantity,
        })),
        status: "pending",
      }

      await createProductOrder(orderData)
      toast({
        title: "Success",
        description: "Product order created successfully and raw materials have been deducted",
      })
      onOrderCreated()
      onClose()
    } catch (error) {
      console.error("Error creating product order:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create product order",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedMaterials([])
    setSelectedProduct("")
    setProductQuantity("1")
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  // Filter out materials with zero quantity
  const availableMaterials = rawMaterials.filter((m) => (m.quantity || 0) > 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Product Order</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Materials Selection */}
            <div>
              <Label className="text-base font-semibold">Select Raw Materials</Label>
              <div className="flex items-end gap-2 mt-2">
                <div className="flex-1">
                  <Select onValueChange={(value) => handleAddMaterial(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id.toString()}>
                          {material.name} ({material.quantity || 0} {material.unit || "units"} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedMaterials.length > 0 && (
                <div className="mt-4 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMaterials.map((material) => (
                        <TableRow key={material.materialId}>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>
                            {material.available} {material.unit}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={material.quantity === 0 ? "" : material.quantity.toString()}
                              onChange={(e) => handleQuantityChange(material.materialId, e.target.value)}
                              className="w-20 text-center"
                              min="1"
                              max={material.available}
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMaterial(material.materialId)}
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="grid gap-4">
              <div>
                <Label htmlFor="product" className="text-base font-semibold">
                  Select Product to Produce
                </Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product" className="mt-2">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity" className="text-base font-semibold">
                  Quantity to Produce
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={productQuantity === "0" ? "" : productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  min="1"
                  className="mt-2"
                  placeholder="1"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Product Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
