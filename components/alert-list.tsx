"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Package, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { InventoryItem, RawMaterial } from "@/lib/database"

interface AlertListProps {
  lowStockProducts?: InventoryItem[]
  lowStockRawMaterials?: RawMaterial[]
}

export default function AlertList({ lowStockProducts = [], lowStockRawMaterials = [] }: AlertListProps) {
  const alerts = [
    ...lowStockProducts.map((item) => ({
      id: `low-stock-product-${item.id}`,
      type: "warning" as const,
      title: "Low Stock Alert - Product",
      message: `${item.name} is running low (${item.stock} dz remaining)`,
      time: "Now",
      icon: <Package className="h-4 w-4" />,
    })),
    ...lowStockRawMaterials.map((material) => ({
      id: `low-stock-material-${material.id}`,
      type: "warning" as const,
      title: "Low Stock Alert - Raw Material",
      message: `${material.name} is running low (${material.quantity} ${material.unit} remaining)`,
      time: "Now",
      icon: <Wrench className="h-4 w-4" />,
    })),
  ]

  if (alerts.length === 0) {
    alerts.push({
      id: "no-alerts",
      type: "info" as const,
      title: "All Good!",
      message: "No alerts at this time. Your inventory is well-stocked.",
      time: "Now",
      icon: <Package className="h-4 w-4" />,
    })
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "info":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <AlertTriangle className="h-4 w-4" />
      case "info":
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert, index) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className={`p-2 rounded-full ${getAlertColor(alert.type)}`}>{getAlertIcon(alert.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
              <Badge variant="outline" className="text-xs">
                {alert.time}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          </div>
        </motion.div>
      ))}

      {alerts.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </div>
  )
}
