"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, TrendingUp, AlertTriangle, Wrench } from "lucide-react"
import {
  getInventoryItems,
  getRawMaterials,
  getActivities,
  type InventoryItem,
  type RawMaterial,
  type Activity,
} from "@/lib/database"
import StatCard from "@/components/stat-card"
import ActivityList from "@/components/activity-list"
import AlertList from "@/components/alert-list"
import MainLayout from "@/components/main-layout"

export default function Dashboard() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsData, materialsData, activitiesData] = await Promise.all([
          getInventoryItems(),
          getRawMaterials(),
          getActivities(),
        ])

        setInventoryItems(itemsData)
        setRawMaterials(materialsData)
        setActivities(activitiesData)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate statistics
  const totalProducts = inventoryItems.length
  const totalRawMaterials = rawMaterials.length
  const lowStockProducts = inventoryItems.filter((item) => item.status === "low-stock").length
  const lowStockRawMaterials = rawMaterials.filter((material) => material.status === "low-stock").length
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.price * item.stock, 0)
  const totalRawMaterialsValue = rawMaterials.reduce(
    (sum, material) => sum + material.cost_per_unit * material.quantity,
    0,
  )

  if (isLoading) {
    return (
      <MainLayout>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your inventory management system</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value={totalProducts.toString()}
            label="Total Products"
            icon={<Package className="w-6 h-6" />}
            variant={totalProducts > 0 ? "success" : "default"}
          />
          <StatCard
            value={totalRawMaterials.toString()}
            label="Raw Materials"
            icon={<Wrench className="w-6 h-6" />}
            variant={totalRawMaterials > 0 ? "success" : "default"}
          />
          <StatCard
            value={`₱${totalValue.toLocaleString()}`}
            label="Products Value"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            value={`₱${totalRawMaterialsValue.toLocaleString()}`}
            label="Materials Value"
            icon={<TrendingUp className="w-6 h-6" />}
            variant="success"
          />
        </div>

        {/* Alerts */}
        {(lowStockProducts > 0 || lowStockRawMaterials > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Inventory Alerts
              </CardTitle>
              <CardDescription>Items that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertList
                lowStockProducts={inventoryItems.filter((item) => item.status === "low-stock")}
                lowStockRawMaterials={rawMaterials.filter((material) => material.status === "low-stock")}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6">
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="inventory">Inventory Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest actions in your inventory system</CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityList activities={activities} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                    <CardDescription>Products with highest stock quantity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inventoryItems
                        .sort((a, b) => b.stock - a.stock)
                        .slice(0, 5)
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{item.stock} units</p>
                              <Badge
                                variant={
                                  item.status === "in-stock"
                                    ? "default"
                                    : item.status === "low-stock"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Raw Materials Status</CardTitle>
                    <CardDescription>Current raw materials inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rawMaterials.slice(0, 5).map((material) => (
                        <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{material.name}</p>
                            <p className="text-sm text-muted-foreground">{material.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {material.quantity} {material.unit}
                            </p>
                            <Badge
                              variant={
                                material.status === "in-stock"
                                  ? "default"
                                  : material.status === "low-stock"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {material.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}
