"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Package, CreditCard, ShoppingCart } from "lucide-react"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import { useRouter } from "next/navigation"

export default function OrdersPage() {
  const router = useRouter()

  const orderModules = [
    {
      title: "Purchase Orders (PO)",
      description: "Manage supplier purchase orders and procurement",
      icon: ShoppingCart,
      color: "bg-blue-500 hover:bg-blue-600",
      route: "/orders/purchase-orders",
    },
    {
      title: "Product Orders (Work Orders)",
      description: "Create and manage production work orders",
      icon: Package,
      color: "bg-green-500 hover:bg-green-600",
      route: "/orders/work-orders",
    },
    {
      title: "Invoice & Payment",
      description: "Handle invoicing and payment processing",
      icon: CreditCard,
      color: "bg-purple-500 hover:bg-purple-600",
      route: "/orders/invoices",
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Orders Management">
          <span className="text-muted-foreground text-base">Manage all order types and financial transactions</span>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderModules.map((module) => {
            const IconComponent = module.icon
            return (
              <Card
                key={module.route}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(module.route)}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 ${module.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-center">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(module.route)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Access Module
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">+1 from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₱45,230</div>
              <p className="text-xs text-muted-foreground">5 invoices pending</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
