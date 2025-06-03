import { supabase } from "./supabaseClient"
import { getCurrentUser, logActivity, type RawMaterial } from "./database"

export interface PurchaseOrder {
  id: number
  po_number: string
  supplier: string
  status: "pending" | "approved" | "sent" | "received" | "cancelled"
  order_date: string
  expected_delivery_date?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  shipping_cost: number
  discount_rate: number
  discount_amount: number
  total_amount: number
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: number
  po_id: number
  raw_material_id: number
  material_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface CreatePurchaseOrderData {
  supplier: string
  expected_delivery_date?: string
  notes?: string
  items: {
    raw_material_id: number
    material_name: string
    quantity: number
    unit_price: number
  }[]
}

// Get all purchase orders
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const { data: orders, error: ordersError } = await supabase!
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("Error fetching purchase orders:", ordersError)
      return []
    }

    // Get items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items, error: itemsError } = await supabase!
          .from("purchase_order_items")
          .select("*")
          .eq("po_id", order.id)
          .order("id", { ascending: true })

        if (itemsError) {
          console.error("Error fetching PO items:", itemsError)
          return { ...order, items: [] }
        }

        return { ...order, items: items || [] }
      }),
    )

    return ordersWithItems
  } catch (error) {
    console.error("Unexpected error fetching purchase orders:", error)
    return []
  }
}

// Get single purchase order by ID
export async function getPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
  try {
    const { data: order, error: orderError } = await supabase!.from("purchase_orders").select("*").eq("id", id).single()

    if (orderError) {
      console.error("Error fetching purchase order:", orderError)
      return null
    }

    const { data: items, error: itemsError } = await supabase!
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", id)
      .order("id", { ascending: true })

    if (itemsError) {
      console.error("Error fetching PO items:", itemsError)
      return null
    }

    return { ...order, items: items || [] }
  } catch (error) {
    console.error("Unexpected error fetching purchase order:", error)
    return null
  }
}

// Create new purchase order
export async function createPurchaseOrder(orderData: CreatePurchaseOrderData): Promise<PurchaseOrder | null> {
  try {
    const user = await getCurrentUser()

    // Generate PO number
    let po_number: string
    try {
      // Get existing PO numbers to generate next number
      const { data: existingPOs, error: fetchError } = await supabase!
        .from("purchase_orders")
        .select("po_number")
        .order("created_at", { ascending: false })
        .limit(1)

      if (fetchError) {
        console.error("Error fetching existing POs:", fetchError)
        return null
      }

      let nextNumber = 1
      if (existingPOs && existingPOs.length > 0) {
        const lastPO = existingPOs[0].po_number
        const match = lastPO.match(/PO-(\d+)/)
        if (match) {
          nextNumber = Number.parseInt(match[1]) + 1
        }
      }

      po_number = `PO-${nextNumber.toString().padStart(4, "0")}`
    } catch (error) {
      console.error("Error generating PO number:", error)
      // Fallback to timestamp-based PO number
      po_number = `PO-${Date.now().toString().slice(-6)}`
    }

    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const tax_rate = 0.1 // 10%
    const tax_amount = subtotal * tax_rate
    const shipping_cost = 75.0
    const discount_rate = 0
    const discount_amount = 0
    const total_amount = subtotal + tax_amount + shipping_cost - discount_amount

    // Create purchase order
    const { data: order, error: orderError } = await supabase!
      .from("purchase_orders")
      .insert({
        po_number,
        supplier: orderData.supplier,
        expected_delivery_date: orderData.expected_delivery_date,
        subtotal,
        tax_rate,
        tax_amount,
        shipping_cost,
        discount_rate,
        discount_amount,
        total_amount,
        notes: orderData.notes,
        created_by: user?.username || "System",
      })
      .select()
      .single()

    if (orderError) {
      console.error("Error creating purchase order:", orderError)
      return null
    }

    // Create purchase order items
    const itemsToInsert = orderData.items.map((item) => ({
      po_id: order.id,
      raw_material_id: item.raw_material_id,
      material_name: item.material_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }))

    const { data: items, error: itemsError } = await supabase!
      .from("purchase_order_items")
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      console.error("Error creating PO items:", itemsError)
      // Rollback order creation
      await supabase!.from("purchase_orders").delete().eq("id", order.id)
      return null
    }

    await logActivity("create", `Created purchase order ${po_number} for ${orderData.supplier}`)

    return { ...order, items: items || [] }
  } catch (error) {
    console.error("Unexpected error creating purchase order:", error)
    return null
  }
}

// Update purchase order
export async function updatePurchaseOrder(
  id: number,
  updates: Partial<Omit<PurchaseOrder, "id" | "po_number" | "created_at" | "updated_at" | "items">>,
): Promise<PurchaseOrder | null> {
  try {
    const { data: order, error: orderError } = await supabase!
      .from("purchase_orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (orderError) {
      console.error("Error updating purchase order:", orderError)
      return null
    }

    const { data: items, error: itemsError } = await supabase!.from("purchase_order_items").select("*").eq("po_id", id)

    if (itemsError) {
      console.error("Error fetching updated PO items:", itemsError)
      return null
    }

    await logActivity("update", `Updated purchase order ${order.po_number}`)

    return { ...order, items: items || [] }
  } catch (error) {
    console.error("Unexpected error updating purchase order:", error)
    return null
  }
}

// Delete purchase order
export async function deletePurchaseOrder(id: number): Promise<boolean> {
  try {
    const { data: order } = await supabase!.from("purchase_orders").select("po_number").eq("id", id).single()

    const { error } = await supabase!.from("purchase_orders").delete().eq("id", id)

    if (error) {
      console.error("Error deleting purchase order:", error)
      return false
    }

    await logActivity("delete", `Deleted purchase order ${order?.po_number || id}`)
    return true
  } catch (error) {
    console.error("Unexpected error deleting purchase order:", error)
    return false
  }
}

// Generate purchase orders for low stock items
export async function generatePurchaseOrdersForLowStock(rawMaterials: RawMaterial[]): Promise<PurchaseOrder[]> {
  try {
    const lowStockItems = rawMaterials.filter((item) => item.status === "low-stock" || item.status === "out-of-stock")

    if (lowStockItems.length === 0) {
      return []
    }

    // Group by supplier
    const itemsBySupplier = lowStockItems.reduce(
      (acc, item) => {
        const supplier = item.supplier || "Unknown Supplier"
        if (!acc[supplier]) {
          acc[supplier] = []
        }
        acc[supplier].push(item)
        return acc
      },
      {} as Record<string, RawMaterial[]>,
    )

    const createdOrders: PurchaseOrder[] = []

    // Create PO for each supplier
    for (const [supplier, items] of Object.entries(itemsBySupplier)) {
      // Check if there's already a pending PO for this supplier
      const { data: existingPO } = await supabase!
        .from("purchase_orders")
        .select("id")
        .eq("supplier", supplier)
        .eq("status", "pending")
        .limit(1)

      if (existingPO && existingPO.length > 0) {
        console.log(`Skipping PO creation for ${supplier} - pending PO already exists`)
        continue
      }

      const orderItems = items.map((item) => {
        // Calculate quantity needed (reorder level * 2 - current quantity)
        const reorderLevel = item.reorder_level || 20
        const currentQuantity = item.quantity || 0
        const quantityNeeded = Math.max(reorderLevel * 2 - currentQuantity, reorderLevel)

        return {
          raw_material_id: item.id,
          material_name: item.name,
          quantity: quantityNeeded,
          unit_price: item.cost_per_unit,
        }
      })

      const orderData: CreatePurchaseOrderData = {
        supplier,
        notes: `Auto-generated PO for low stock items. Generated on ${new Date().toLocaleDateString()}.`,
        items: orderItems,
      }

      const createdOrder = await createPurchaseOrder(orderData)
      if (createdOrder) {
        createdOrders.push(createdOrder)
      }
    }

    return createdOrders
  } catch (error) {
    console.error("Error generating purchase orders for low stock:", error)
    return []
  }
}
