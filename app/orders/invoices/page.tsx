"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CreditCard, Plus } from "lucide-react"
import PageHeader from "@/components/page-header"
import MainLayout from "@/components/main-layout"
import { useRouter } from "next/navigation"

export default function InvoicesPage() {
  const router = useRouter()

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Invoice & Payment">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <span className="text-muted-foreground text-base">Handle invoicing and payment processing</span>
          </div>
        </PageHeader>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Invoice & Payment Module</CardTitle>
            <CardDescription>
              This module is currently under development. Invoice & Payment will allow you to manage financial
              transactions and billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">Coming soon features:</p>
              <ul className="text-left max-w-md mx-auto space-y-2 text-sm text-muted-foreground">
                <li>• Create and send invoices</li>
                <li>• Track payment status</li>
                <li>• Process payments</li>
                <li>• Generate financial reports</li>
                <li>• Manage customer billing</li>
              </ul>
              <Button disabled className="mt-6">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
