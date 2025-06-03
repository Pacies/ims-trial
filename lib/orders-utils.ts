import { updateRawMaterial, updateInventoryItem, getRawMaterials, getInventoryItems } from "@/lib/database"

export interface Order {
  id: string
  date: string
  customer: string
  items: string
  total: number
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled"
}

export interface ProductOrder {
  id: string
  productId: number
  productName: string
  quantity: number
  materials: Array<{
    materialId: number
    quantity: number
  }>
  status: "pending" | "in-progress" | "completed" | "cancelled"
  createdAt: string
  updatedAt: string
  completedAt?: string
}

// Generate random orders
export function generateOrders(count: number): Order[] {
  const statuses: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]
  const customers = ["John Doe", "Jane Smith", "Robert Johnson", "Emily Davis", "Michael Brown"]
  const orders: Order[] = []

  for (let i = 0; i < count; i++) {
    const items = Math.floor(Math.random() * 5) + 1
    const total = Number.parseFloat((Math.random() * 500 + 20).toFixed(2))
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    // Generate a random date within the last 30 days
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    orders.push({
      id: (1000 + i).toString(),
      date: date.toLocaleDateString(),
      customer: customers[Math.floor(Math.random() * customers.length)],
      items: `${items} item${items > 1 ? "s" : ""}`,
      total: total,
      status: status,
    })
  }

  return orders
}

// Product Orders Storage (In-memory for now, replace with database later)
const productOrders: ProductOrder[] = []
const productOrderHistory: ProductOrder[] = []
let nextOrderId = 1

// Create a new product order
export async function createProductOrder(orderData: {
  productId: number
  productName: string
  quantity: number
  materials: Array<{ materialId: number; quantity: number }>
  status: string
}): Promise<ProductOrder> {
  try {
    // First, deduct raw materials from inventory
    for (const material of orderData.materials) {
      try {
        // Get current material data from database
        const rawMaterials = await getRawMaterials()
        const currentMaterial = rawMaterials.find((m) => m.id === material.materialId)

        if (currentMaterial) {
          const newQuantity = (currentMaterial.quantity || 0) - material.quantity
          if (newQuantity < 0) {
            throw new Error(
              `Insufficient stock for ${currentMaterial.name}. Available: ${currentMaterial.quantity}, Required: ${material.quantity}`,
            )
          }

          // Update the raw material quantity in database
          const updateResult = await updateRawMaterial(material.materialId, { quantity: newQuantity })
          if (!updateResult) {
            throw new Error(`Failed to update raw material ${currentMaterial.name}`)
          }
          console.log(`Deducted ${material.quantity} ${currentMaterial.unit || "units"} of ${currentMaterial.name}`)
        } else {
          throw new Error(`Raw material with ID ${material.materialId} not found`)
        }
      } catch (error) {
        console.error(`Error deducting material ${material.materialId}:`, error)
        throw new Error(`Failed to deduct raw material: ${error.message}`)
      }
    }

    const now = new Date().toISOString()
    const newOrder: ProductOrder = {
      id: `PO-${nextOrderId.toString().padStart(4, "0")}`,
      productId: orderData.productId,
      productName: orderData.productName,
      quantity: orderData.quantity,
      materials: orderData.materials,
      status: orderData.status as ProductOrder["status"],
      createdAt: now,
      updatedAt: now,
    }

    nextOrderId++
    productOrders.push(newOrder)

    console.log("Product order created successfully:", newOrder)
    return newOrder
  } catch (error) {
    console.error("Error creating product order:", error)
    throw error
  }
}

// Get all active product orders
export async function getProductOrders(): Promise<ProductOrder[]> {
  try {
    return [...productOrders]
  } catch (error) {
    console.error("Error fetching product orders:", error)
    return []
  }
}

// Get product order by ID
export async function getProductOrderById(id: string): Promise<ProductOrder | null> {
  try {
    const order = productOrders.find((order) => order.id === id) || productOrderHistory.find((order) => order.id === id)
    return order ? { ...order } : null
  } catch (error) {
    console.error("Error fetching product order:", error)
    return null
  }
}

// Update a product order status
export async function updateProductOrderStatus(id: string, status: string): Promise<ProductOrder | null> {
  try {
    const orderIndex = productOrders.findIndex((order) => order.id === id)
    if (orderIndex === -1) {
      console.error(`Product order with ID ${id} not found`)
      return null
    }

    const updatedOrder = {
      ...productOrders[orderIndex],
      status: status as ProductOrder["status"],
      updatedAt: new Date().toISOString(),
    }

    // If status is "completed", move to history and add to inventory
    if (status === "completed") {
      updatedOrder.completedAt = new Date().toISOString()

      // Add produced quantity to product inventory
      try {
        const inventoryItems = await getInventoryItems()
        const product = inventoryItems.find((p) => p.id === updatedOrder.productId)

        if (product) {
          const newQuantity = (product.stock || 0) + updatedOrder.quantity
          const updateResult = await updateInventoryItem(updatedOrder.productId, { stock: newQuantity })

          if (updateResult) {
            console.log(
              `Added ${updatedOrder.quantity} units of ${updatedOrder.productName} to inventory. New stock: ${newQuantity}`,
            )
          } else {
            console.error(`Failed to update inventory for product ${updatedOrder.productName}`)
            throw new Error(`Failed to update product inventory`)
          }
        } else {
          console.error(`Product with ID ${updatedOrder.productId} not found in inventory`)
          throw new Error(`Product not found in inventory`)
        }
      } catch (error) {
        console.error("Error updating product inventory:", error)
        throw new Error(`Failed to update product inventory: ${error.message}`)
      }

      productOrders.splice(orderIndex, 1)
      productOrderHistory.push(updatedOrder)
    } else {
      productOrders[orderIndex] = updatedOrder
    }

    console.log("Product order updated successfully:", updatedOrder)
    return { ...updatedOrder }
  } catch (error) {
    console.error("Error updating product order status:", error)
    throw error
  }
}

// Delete a product order
export async function deleteProductOrder(id: string): Promise<boolean> {
  try {
    const orderIndex = productOrders.findIndex((order) => order.id === id)
    if (orderIndex === -1) return false

    const deletedOrder = productOrders[orderIndex]
    productOrders.splice(orderIndex, 1)

    console.log("Product order deleted successfully:", deletedOrder)
    return true
  } catch (error) {
    console.error("Error deleting product order:", error)
    return false
  }
}

// Get product order history
export async function getProductOrderHistory(): Promise<ProductOrder[]> {
  try {
    return [...productOrderHistory]
  } catch (error) {
    console.error("Error fetching product order history:", error)
    return []
  }
}
