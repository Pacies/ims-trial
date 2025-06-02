"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { updateInventoryItem, type InventoryItem } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface EditItemModalProps {
  item: InventoryItem
  onClose: () => void
  onItemUpdated: (updatedItem: InventoryItem) => void
}

export default function EditItemModal({ item, onClose, onItemUpdated }: EditItemModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock: "",
    price: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price.toString(),
        stock: item.stock.toString(),
      })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await updateInventoryItem(item.id, {
        name: formData.name,
        category: formData.category,
        price: Number.parseFloat(formData.price),
        stock: Number.parseInt(formData.stock),
      })

      if (success) {
        toast({
          title: "Product updated successfully",
          description: `${formData.name} has been updated.`,
        })
        onClose()
        onItemUpdated({
          ...item,
          name: formData.name,
          category: formData.category,
          price: Number.parseFloat(formData.price),
          stock: Number.parseInt(formData.stock),
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update product. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const categories = ["Top", "Bottom"]

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock Quantity (dz) *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
