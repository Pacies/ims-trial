"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, ArrowLeft } from "lucide-react"
import {
  addRawMaterial,
  updateRawMaterial,
  getRawMaterials,
  getFixedPrices,
  type RawMaterial,
  type FixedPrice,
} from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface AddRawItemModalProps {
  onItemAdded: (newItem: RawMaterial) => void
  onItemUpdated: (updatedItem: RawMaterial) => void
}

export default function AddRawItemModal({ onItemAdded, onItemUpdated }: AddRawItemModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: category, 2: type, 3: quantity, 4: price
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [customType, setCustomType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priceOption, setPriceOption] = useState<"manual" | "fixed">("manual")
  const [manualPrice, setManualPrice] = useState("")
  const [selectedFixedPrice, setSelectedFixedPrice] = useState("")
  const [fixedPrices, setFixedPrices] = useState<FixedPrice[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const { toast } = useToast()

  const categories = [
    {
      name: "Fabric",
      types: ["Cotton Fabric", "Polyester Fabric", "Denim Fabric", "Others"],
    },
    {
      name: "Sewing",
      types: ["Buttons", "Thread", "Zipper", "Needle", "Scissors", "Others"],
    },
  ]

  // Load fixed prices when category is selected
  useEffect(() => {
    if (selectedCategory && step === 4) {
      loadFixedPrices()
    }
  }, [selectedCategory, step])

  const loadFixedPrices = async () => {
    try {
      const prices = await getFixedPrices("raw_material", selectedCategory)
      setFixedPrices(prices)
    } catch (error) {
      console.error("Error loading fixed prices:", error)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedCategory("")
    setSelectedType("")
    setCustomType("")
    setQuantity("")
    setPriceOption("manual")
    setManualPrice("")
    setSelectedFixedPrice("")
    setFixedPrices([])
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

  const handleSubmit = async () => {
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

    setIsLoading(true)

    try {
      // Check if the same raw material already exists
      const existingMaterials = await getRawMaterials()
      const existingMaterial = existingMaterials.find(
        (material) =>
          material.name.toLowerCase() === selectedType.toLowerCase() &&
          material.category.toLowerCase() === selectedCategory.toLowerCase(),
      )

      if (existingMaterial) {
        // Update existing material by adding quantity
        const newQuantity = existingMaterial.quantity + Number.parseFloat(quantity)
        const updatedMaterial = await updateRawMaterial(existingMaterial.id, {
          quantity: newQuantity,
          cost_per_unit: price,
        })

        if (updatedMaterial) {
          toast({
            title: "Raw material updated",
            description: `Added ${quantity} ${existingMaterial.unit} to existing ${selectedType}. Total quantity: ${newQuantity} ${existingMaterial.unit}`,
          })
          onItemUpdated(updatedMaterial)
        }
      } else {
        // Create new material
        const newItem = await addRawMaterial({
          name: selectedType,
          quantity: Number.parseFloat(quantity),
          category: selectedCategory,
          cost_per_unit: price,
        })

        if (newItem) {
          toast({
            title: "Raw material added successfully",
            description: `${newItem.name} has been added to your inventory.`,
          })
          onItemAdded(newItem)
        }
      }

      resetForm()
      setIsOpen(false)
    } catch (error) {
      console.error("Error adding raw material:", error)
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Raw Material
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Raw Material</DialogTitle>
        </DialogHeader>

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Category</Label>
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
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
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
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
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
              <Button variant="outline" onClick={handleCancel}>
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
                Selected: <span className="font-medium">{selectedType}</span> ({selectedCategory})
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
              <Button variant="outline" onClick={handleCancel}>
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
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || getCurrentPrice() <= 0}>
                {isLoading ? "Adding..." : "Add Raw Material"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
