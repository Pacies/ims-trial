"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  value: string | number
  label: string
  icon: React.ReactNode
  delay?: number
  variant?: "default" | "warning" | "success" | "error"
}

export default function StatCard({ value, label, icon, delay = 0, variant = "default" }: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "success":
        return "border-green-200 bg-green-50"
      case "error":
        return "border-red-200 bg-red-50"
      default:
        return "border-gray-200 bg-white"
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case "warning":
        return "text-yellow-600"
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <Card className={`${getVariantStyles()}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-600">{label}</p>
            </div>
            <div className={`${getIconStyles()}`}>{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
