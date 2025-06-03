"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getRawMaterials, getInventoryItems, type RawMaterial, type InventoryItem } from "@/lib/database"
import { updateProductOrder, type ProductOrder } from "@/lib/orders-utils"
import { useToast } from "@/hooks/use-toast"

interface EditProductOrderModalProps {
  order: ProductOrder
  onClose: () => void
  onOrderUpdated: () => void
}

export default function EditProductOrderModal({ order, onClose, onOrderUpdated }: EditProductOrderModalProps) {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<
    Array<{ materialId: number; name: string; quantity: number; available: number; unit: string }>
  >([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState<number>(1)
  const [status, setStatus] = useState<string>("pending")
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

        // Initialize form with order data
        setSelectedProduct(order.productId.toString())
        setProductQuantity(order.quantity)
        setStatus(order.status)

        // Initialize selected materials
        const materialsList = await Promise.all(
          order.materials.map(async (material) => {
            const rawMaterial = materialsData.find((m) => m.id === material.materialId)
            if (!rawMaterial) return null

            return {
              materialId: material.materialId,
              name: rawMaterial.name,
              quantity: material.quantity,
              available: rawMaterial.quantity,
              unit: rawMaterial.unit,
            }
          }),
        )

        setSelectedMaterials(materialsList.filter(Boolean) as any[])
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

    loadData()
  }, [order, toast])

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
        available: material.quantity,
        unit: material.unit,
      },
    ])
  }

  const handleRemoveMaterial = (materialId: number) => {
    setSelectedMaterials(selectedMaterials.filter((m) => m.materialId !== materialId))
  }

  const handleQuantityChange = (materialId: number, quantity: number) => {
    const material = rawMaterials.find((m) => m.id === materialId)
    if (!material) return

    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than zero",
      })
      return
    }

    if (quantity > material.quantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${material.quantity} ${material.unit} available`,
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

    if (productQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Product quantity must be greater than zero",
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
        quantity: productQuantity,
        materials: selectedMaterials.map((m) => ({
          materialId: m.materialId,
          quantity: m.quantity,
        })),
        status: status as "pending" | "in-progress" | "completed" | "cancelled",
      }

      await updateProductOrder(order.id, orderData)
      toast({
        title: "Success",
        description: "Product order updated successfully",
      })
      onOrderUpdated()
      onClose()
    } catch (error) {
      console.error("Error updating product order:", error)
      toast({
        title: "Error",
        description: "Failed to update product order",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Product Order</DialogTitle>
        </DialogHeader>
        {/* Rest of the code here */}
      </DialogContent>
    </Dialog>
  )
}
