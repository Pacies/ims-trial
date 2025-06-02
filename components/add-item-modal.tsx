"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, ArrowLeft } from "lucide-react"
import {
  addInventoryItem,
  updateInventoryItem,
  getInventoryItems,
  type InventoryItem,
  getFixedPrices,
  type FixedPrice,
} from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddItemModalProps {
  onItemAdded: (newItem: InventoryItem) => void
  onItemUpdated: (updatedItem: InventoryItem) => void // Add this prop
}

export default function AddItemModal({ onItemAdded, onItemUpdated }: AddItemModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: product type, 2: quantity, 3: price
  const [selectedProduct, setSelectedProduct] = useState("")
  const [customProduct, setCustomProduct] = useState("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const { toast } = useToast()
  const [priceOption, setPriceOption] = useState<"manual" | "fixed">("manual")
  const [manualPrice, setManualPrice] = useState("")
  const [selectedFixedPrice, setSelectedFixedPrice] = useState("")
  const [fixedPrices, setFixedPrices] = useState<FixedPrice[]>([])

  const productTypes = [
    { name: "T-Shirt", category: "Top" },
    { name: "Polo Shirt", category: "Top" },
    { name: "Blouse", category: "Top" },
    { name: "Tank Top", category: "Top" },
    { name: "Pajama", category: "Bottom" },
    { name: "Shorts", category: "Bottom" },
    { name: "Pants", category: "Bottom" },
    { name: "Skirt", category: "Bottom" },
    { name: "Others", category: "" },
  ]

  // Load fixed prices when category is selected
  useEffect(() => {
    if (selectedProduct && step === 3) {
      loadFixedPrices()
    }
  }, [selectedProduct, step])

  const loadFixedPrices = async () => {
    try {
      const category = getProductCategory(selectedProduct)
      const prices = await getFixedPrices("product", category)
      setFixedPrices(prices)
    } catch (error) {
      console.error("Error loading fixed prices:", error)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedProduct("")
    setCustomProduct("")
    setQuantity("")
    setPrice("") // Keep this for backward compatibility
    setPriceOption("manual")
    setManualPrice("")
    setSelectedFixedPrice("")
    setFixedPrices([])
    setShowCustomInput(false)
  }

  const handleProductSelect = (productName: string, category: string) => {
    if (productName === "Others") {
      setShowCustomInput(true)
    } else {
      setSelectedProduct(productName)
      setStep(2) // Go to quantity step
    }
  }

  const handleCustomProductSubmit = () => {
    if (customProduct.trim()) {
      setSelectedProduct(customProduct.trim())
      setStep(2) // Go to quantity step
      setShowCustomInput(false)
    }
  }

  const getProductCategory = (productName: string) => {
    const product = productTypes.find((p) => p.name === productName)
    if (product && product.category) {
      return product.category
    }
    // For custom products, determine category based on common patterns
    const lowerName = productName.toLowerCase()
    if (
      lowerName.includes("shirt") ||
      lowerName.includes("blouse") ||
      lowerName.includes("top") ||
      lowerName.includes("polo")
    ) {
      return "Top"
    } else if (
      lowerName.includes("pant") ||
      lowerName.includes("short") ||
      lowerName.includes("pajama") ||
      lowerName.includes("skirt") ||
      lowerName.includes("bottom")
    ) {
      return "Bottom"
    }
    return "Top" // Default to Top if unclear
  }

  const getCurrentPrice = (): number => {
    if (priceOption === "manual") {
      return Number.parseFloat(manualPrice) || 0
    } else {
      const selectedPrice = fixedPrices.find((p) => p.id.toString() === selectedFixedPrice)
      return selectedPrice?.price || 0
    }
  }

  const handleQuantitySubmit = () => {
    if (quantity && Number.parseFloat(quantity) > 0) {
      setStep(3)
    } else {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity greater than 0.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) {
      toast({
        title: "Validation Error",
        description: "Please complete all steps.",
        variant: "destructive",
      })
      return
    }

    const priceValue = getCurrentPrice()
    if (priceValue <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const category = getProductCategory(selectedProduct)

      // Check if the same product already exists (same name, category, and price)
      const existingItems = await getInventoryItems()
      const existingItem = existingItems.find(
        (item) =>
          item.name.toLowerCase() === selectedProduct.toLowerCase() &&
          item.category.toLowerCase() === category.toLowerCase() &&
          Math.abs(item.price - priceValue) < 0.01, // Compare prices with small tolerance for floating point
      )

      if (existingItem) {
        // Update existing item by adding quantity
        const newStock = existingItem.stock + Number.parseInt(quantity)
        const updatedItem = await updateInventoryItem(existingItem.id, {
          stock: newStock,
        })

        if (updatedItem) {
          toast({
            title: "Product updated",
            description: `Added ${quantity} to existing ${selectedProduct}. Total stock: ${newStock}`,
          })
          onItemUpdated(updatedItem)
        }
      } else {
        // Create new product
        const newItem = await addInventoryItem({
          name: selectedProduct,
          category: category,
          stock: Number.parseInt(quantity),
          price: priceValue,
        })

        if (newItem) {
          toast({
            title: "Product added successfully",
            description: `${newItem.name} has been added to your inventory.`,
          })
          onItemAdded(newItem)
        }
      }

      resetForm()
      setIsOpen(false)
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    setIsOpen(false)
  }

  const handleBack = () => {
    if (step === 3) {
      setStep(2)
      setPriceOption("manual")
      setManualPrice("")
      setSelectedFixedPrice("")
    } else if (step === 2) {
      setStep(1)
      setQuantity("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        {/* Step 1: Product Type Selection */}
        {step === 1 && !showCustomInput && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Product Type</Label>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {productTypes.map((product, index) => (
                <Button
                  key={`${product.name}-${index}`} // Use index to ensure unique keys
                  variant="outline"
                  className="h-12 text-left justify-start"
                  onClick={() => handleProductSelect(product.name, product.category)}
                >
                  {product.name}
                </Button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Custom Product Input */}
        {step === 1 && showCustomInput && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCustomInput(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Label className="text-base font-medium">Enter Custom Product Type</Label>
            </div>
            <Input
              value={customProduct}
              onChange={(e) => setCustomProduct(e.target.value)}
              placeholder="Enter product type name"
              onKeyPress={(e) => e.key === "Enter" && handleCustomProductSubmit()}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleCustomProductSubmit} disabled={!customProduct.trim()}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Quantity Input */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Label className="text-base font-medium">Enter Quantity</Label>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{selectedProduct}</span>
              </p>
              <Label className="text-sm">Quantity (dz)</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity in dz"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleQuantitySubmit} disabled={!quantity || Number.parseFloat(quantity) <= 0}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Price Input */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Label className="text-base font-medium">Set Price</Label>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Item: <span className="font-medium">{selectedProduct}</span> | Quantity:{" "}
                <span className="font-medium">{quantity}</span>
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
                          No fixed prices available for {getProductCategory(selectedProduct)}
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
                    ₱{getCurrentPrice().toFixed(2)} × {quantity} dz
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || getCurrentPrice() <= 0}>
                {isLoading ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
