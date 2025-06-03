"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package, Plus } from "lucide-react"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import { useRouter } from "next/navigation"

export default function WorkOrdersPage() {
  const router = useRouter()

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Work Orders">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <span className="text-muted-foreground text-base">Create and manage production work orders</span>
          </div>
        </PageHeader>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Work Orders Module</CardTitle>
            <CardDescription>
              This module is currently under development. Work orders will allow you to create and manage production
              orders for your products.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">Coming soon features:</p>
              <ul className="text-left max-w-md mx-auto space-y-2 text-sm text-muted-foreground">
                <li>• Create production work orders</li>
                <li>• Track production progress</li>
                <li>• Assign workers and resources</li>
                <li>• Monitor completion status</li>
                <li>• Generate production reports</li>
              </ul>
              <Button disabled className="mt-6">
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
