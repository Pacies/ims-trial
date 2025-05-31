"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, Trash2, Package, RefreshCw } from "lucide-react"
import { getRawMaterials, deleteRawMaterial, type RawMaterial } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import AddRawItemModal from "@/components/add-raw-item-modal"
import EditRawItemModal from "@/components/edit-raw-item-modal"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"

export default function RawItemsPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const { toast } = useToast()

  const loadRawMaterials = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRawMaterials()
      // Filter out any undefined or null items
      const validData = data.filter(
        (item): item is RawMaterial => item != null && typeof item === "object" && "id" in item,
      )
      setRawMaterials(validData)
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

  // Get unique categories, filtering out undefined values
  const categories = [
    ...new Set(rawMaterials.filter((material) => material?.category).map((material) => material.category)),
  ]

  useEffect(() => {
    let filtered = rawMaterials.filter((material): material is RawMaterial => material != null)

    if (searchTerm) {
      filtered = filtered.filter(
        (material) =>
          material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (material.sku && material.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
          material.category?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter((material) => material.category === categoryFilter)
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((material) => material.status === statusFilter)
    }
    setFilteredMaterials(filtered)
  }, [rawMaterials, searchTerm, categoryFilter, statusFilter])

  const handleItemAdded = async (newItem: RawMaterial) => {
    if (newItem && newItem.id) {
      // Reload data from database to ensure consistency
      await loadRawMaterials()
      toast({
        title: "Success",
        description: "Raw material added and data refreshed.",
      })
    }
  }

  const handleItemUpdated = async (updatedItem: RawMaterial) => {
    if (updatedItem && updatedItem.id) {
      // Reload data from database to ensure consistency
      await loadRawMaterials()
      toast({
        title: "Success",
        description: "Raw material updated and data refreshed.",
      })
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const success = await deleteRawMaterial(id)
      if (success) {
        // Reload data from database to ensure consistency
        await loadRawMaterials()
        toast({
          title: "Raw material deleted",
          description: `${name} has been removed and data refreshed.`,
        })
      } else {
        toast({ title: "Error", description: "Failed to delete raw material.", variant: "destructive" })
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

  if (isLoading && rawMaterials.length === 0) {
    return (
      <MainLayout>
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Raw Materials" description="Manage your raw materials and components" icon={Package} />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Raw Materials Inventory</CardTitle>
                <CardDescription>Track and manage your raw materials and components</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadRawMaterials} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <AddRawItemModal onItemAdded={handleItemAdded} onItemUpdated={handleItemUpdated} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, category..."
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
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="pr-8">Quantity</TableHead>
                    <TableHead className="pr-8">Price</TableHead>
                    <TableHead className="pl-6">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {rawMaterials.length === 0
                          ? "No raw materials found. Add your first raw material to get started."
                          : "No materials match your search criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material, index) => {
                      // Additional safety check
                      if (!material || !material.id) {
                        return null
                      }

                      return (
                        <TableRow key={`${material.id}-${index}`}>
                          <TableCell className="font-mono text-sm">{material.sku || "N/A"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{material.name || "Unnamed"}</p>
                              {material.description && (
                                <p className="text-sm text-muted-foreground">{material.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{material.category || "Uncategorized"}</TableCell>
                          <TableCell className="pr-8">{material.quantity || 0}</TableCell>
                          <TableCell className="pr-8">₱{(material.cost_per_unit || 0).toFixed(2)}</TableCell>
                          <TableCell className="pl-6">{getStatusBadge(material.status || "unknown")}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingMaterial(material)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDelete(material.id, material.name || "Unknown")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
                Total value: ₱
                {rawMaterials
                  .reduce((sum, material) => sum + (material.cost_per_unit || 0) * (material.quantity || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        {editingMaterial && (
          <EditRawItemModal
            material={editingMaterial}
            onClose={() => setEditingMaterial(null)}
            onItemUpdated={handleItemUpdated}
          />
        )}
      </div>
    </MainLayout>
  )
}
