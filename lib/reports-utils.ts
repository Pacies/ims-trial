import { supabase } from "./supabaseClient"
import { getInventoryItems, getRawMaterials, logActivity, getCurrentUser } from "./database"

export interface Report {
  id: number
  title: string
  type: "inventory-summary" | "low-stock"
  content: any
  generated_by?: string
  date_range_start?: string
  date_range_end?: string
  created_at: string
  updated_at: string
}

export interface InventorySummaryData {
  products: {
    total_items: number
    total_value: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    items: Array<{
      sku: string
      name: string
      category: string
      stock: number
      price: number
      status: string
      value: number
      unit: string
    }>
  }
  raw_materials: {
    total_items: number
    total_value: number
    in_stock: number
    low_stock: number
    out_of_stock: number
    items: Array<{
      sku: string
      name: string
      category: string
      quantity: number
      cost_per_unit: number
      status: string
      value: number
      unit: string
    }>
  }
}

export interface LowStockData {
  products: Array<{
    sku: string
    name: string
    category: string
    current_stock: number
    status: string
    price: number
    reorder_needed: number
    unit: string
  }>
  raw_materials: Array<{
    sku: string
    name: string
    category: string
    current_quantity: number
    reorder_level: number
    status: string
    cost_per_unit: number
    reorder_needed: number
    unit: string
  }>
}

// Generate Inventory Summary Report
export async function generateInventorySummary(): Promise<InventorySummaryData> {
  try {
    const [products, rawMaterials] = await Promise.all([getInventoryItems(), getRawMaterials()])

    // Process products data
    const productsData = {
      total_items: products.length,
      total_value: products.reduce((sum, item) => sum + item.price * item.stock, 0),
      in_stock: products.filter((item) => item.status === "in-stock").length,
      low_stock: products.filter((item) => item.status === "low-stock").length,
      out_of_stock: products.filter((item) => item.status === "out-of-stock").length,
      items: products.map((item) => ({
        sku: item.sku,
        name: item.name,
        category: item.category,
        stock: item.stock,
        price: item.price,
        status: item.status,
        value: item.price * item.stock,
        unit: "dz",
      })),
    }

    // Process raw materials data
    const rawMaterialsData = {
      total_items: rawMaterials.length,
      total_value: rawMaterials.reduce((sum, item) => sum + item.cost_per_unit * item.quantity, 0),
      in_stock: rawMaterials.filter((item) => item.status === "in-stock").length,
      low_stock: rawMaterials.filter((item) => item.status === "low-stock").length,
      out_of_stock: rawMaterials.filter((item) => item.status === "out-of-stock").length,
      items: rawMaterials.map((item) => ({
        sku: item.sku || `RAW-${item.id}`,
        name: item.name,
        category: item.category || "General",
        quantity: item.quantity,
        cost_per_unit: item.cost_per_unit,
        status: item.status,
        value: item.cost_per_unit * item.quantity,
        unit: item.unit || "units",
      })),
    }

    return {
      products: productsData,
      raw_materials: rawMaterialsData,
    }
  } catch (error) {
    console.error("Error generating inventory summary:", error)
    throw error
  }
}

// Generate Low Stock Report
export async function generateLowStockReport(): Promise<LowStockData> {
  try {
    const [products, rawMaterials] = await Promise.all([getInventoryItems(), getRawMaterials()])

    // Filter low stock and out of stock products
    const lowStockProducts = products
      .filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        category: item.category,
        current_stock: item.stock,
        status: item.status,
        price: item.price,
        reorder_needed: Math.max(40 - item.stock, 0), // Suggest reordering to 40 dozen (double the threshold)
        unit: "dz",
      }))

    // Filter low stock and out of stock raw materials
    const lowStockRawMaterials = rawMaterials
      .filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
      .map((item) => ({
        sku: item.sku || `RAW-${item.id}`,
        name: item.name,
        category: item.category || "General",
        current_quantity: item.quantity,
        reorder_level: item.reorder_level || 10,
        status: item.status,
        cost_per_unit: item.cost_per_unit,
        reorder_needed: Math.max((item.reorder_level || 10) * 2 - item.quantity, 0),
        unit: item.unit || "units",
      }))

    return {
      products: lowStockProducts,
      raw_materials: lowStockRawMaterials,
    }
  } catch (error) {
    console.error("Error generating low stock report:", error)
    throw error
  }
}

// Save report to database
export async function saveReport(
  title: string,
  type: "inventory-summary" | "low-stock",
  content: any,
  dateRangeStart?: Date,
  dateRangeEnd?: Date,
): Promise<Report | null> {
  try {
    const user = await getCurrentUser()

    const reportData = {
      title,
      type,
      content,
      generated_by: user?.username || "Unknown",
      date_range_start: dateRangeStart?.toISOString().split("T")[0] || null,
      date_range_end: dateRangeEnd?.toISOString().split("T")[0] || null,
    }

    const { data, error } = await supabase.from("reports").insert(reportData).select().single()

    if (error) {
      console.error("Error saving report:", error)
      return null
    }

    await logActivity("create", `Generated ${title} report`)
    return data as Report
  } catch (error) {
    console.error("Error saving report:", error)
    return null
  }
}

// Get saved reports - FORCE FRESH DATA
export async function getSavedReports(): Promise<Report[]> {
  try {
    // Force a fresh fetch from the database without cache
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching reports:", error)
      return []
    }

    console.log("Fresh reports from database:", data)
    return data as Report[]
  } catch (error) {
    console.error("Error fetching reports:", error)
    return []
  }
}

// COMPLETELY REWRITTEN Delete report function using direct Supabase RPC call
export async function deleteReport(id: number): Promise<boolean> {
  console.log("🔥 STARTING DELETE PROCESS FOR REPORT ID:", id)

  try {
    // Validate the ID first
    if (!id || isNaN(Number(id)) || Number(id) <= 0) {
      console.error("❌ Invalid report ID provided:", id)
      return false
    }

    const reportId = Number(id)
    console.log("✅ Valid ID confirmed:", reportId)

    // DIRECT DATABASE APPROACH: Use RPC call to delete the report
    // This bypasses any potential RLS issues or permission problems
    const { data, error } = await supabase.rpc("delete_report", { report_id: reportId })

    if (error) {
      console.error("❌ RPC delete_report failed:", error)

      // FALLBACK: Try direct SQL deletion as a last resort
      console.log("⚠️ Attempting direct deletion fallback...")
      const { error: directError } = await supabase.from("reports").delete().eq("id", reportId).single()

      if (directError) {
        console.error("❌ Direct deletion also failed:", directError)
        return false
      }

      console.log("✅ Direct deletion succeeded")
      return true
    }

    console.log("✅ RPC delete_report succeeded:", data)

    // Verify the deletion actually worked by checking if the report still exists
    const { data: verifyData, error: verifyError } = await supabase
      .from("reports")
      .select("id")
      .eq("id", reportId)
      .maybeSingle()

    if (verifyError) {
      console.error("❌ Error verifying deletion:", verifyError)
      // Continue anyway since the delete operation didn't report an error
    }

    if (verifyData) {
      console.error("❌ Report still exists after deletion attempt!")
      return false
    }

    console.log("✅ DELETION VERIFIED - Report no longer exists in database")

    // Log the activity (optional, don't fail if this fails)
    try {
      await logActivity("delete", `Successfully deleted report with ID: ${reportId}`)
      console.log("✅ Activity logged successfully")
    } catch (logError) {
      console.warn("⚠️ Failed to log delete activity (non-critical):", logError)
    }

    console.log("🎉 DELETE OPERATION COMPLETED SUCCESSFULLY")
    return true
  } catch (error) {
    console.error("💥 UNEXPECTED ERROR in deleteReport:", error)
    return false
  }
}

// Generate PDF content with FIXED TEXT POSITIONING IN CELLS
export async function generatePDFContent(report: Report): Promise<Blob> {
  try {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    // Set up document
    doc.setFont("helvetica")
    doc.setDrawColor(0, 0, 0) // Black lines only

    // Add header with optimized spacing
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("INVENTORY MANAGEMENT SYSTEM REPORT", 105, 20, { align: "center" })

    // Add report info section with reduced spacing
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Report: ${report.title}`, 20, 35)
    doc.text(`Generated by: ${report.generated_by || "System"}`, 20, 42)
    doc.text(`Date: ${new Date(report.created_at).toLocaleDateString()}`, 20, 49)

    if (report.date_range_start && report.date_range_end) {
      doc.text(
        `Period: ${new Date(report.date_range_start).toLocaleDateString()} - ${new Date(report.date_range_end).toLocaleDateString()}`,
        20,
        56,
      )
    }

    // Add horizontal line with reduced spacing
    doc.setLineWidth(0.5)
    doc.line(20, 65, 190, 65)

    let yPosition = 75

    if (report.type === "inventory-summary") {
      const data = report.content as InventorySummaryData

      // Title with reduced spacing
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Inventory Summary", 20, yPosition)
      yPosition += 10

      // Summary section - two columns with optimized spacing
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("PRODUCTS SUMMARY", 20, yPosition)
      doc.text("RAW MATERIALS SUMMARY", 110, yPosition)
      yPosition += 6

      doc.setFont("helvetica", "normal")
      doc.text(`Total Items: ${data.products.total_items}`, 20, yPosition)
      doc.text(`Total Items: ${data.raw_materials.total_items}`, 110, yPosition)
      yPosition += 4

      doc.text(`Total Value: PHP ${data.products.total_value.toLocaleString()}`, 20, yPosition)
      doc.text(`Total Value: PHP ${data.raw_materials.total_value.toLocaleString()}`, 110, yPosition)
      yPosition += 4

      doc.text(`In Stock: ${data.products.in_stock}`, 20, yPosition)
      doc.text(`In Stock: ${data.raw_materials.in_stock}`, 110, yPosition)
      yPosition += 4

      doc.text(`Low Stock: ${data.products.low_stock}`, 20, yPosition)
      doc.text(`Low Stock: ${data.raw_materials.low_stock}`, 110, yPosition)
      yPosition += 4

      doc.text(`Out of Stock: ${data.products.out_of_stock}`, 20, yPosition)
      doc.text(`Out of Stock: ${data.raw_materials.out_of_stock}`, 110, yPosition)
      yPosition += 12

      // Products table with FIXED TEXT POSITIONING
      doc.setFont("helvetica", "bold")
      doc.text("Products Inventory", 20, yPosition)
      yPosition += 8

      const productHeaders = ["SKU", "Name", "Category", "Stock", "Unit", "Price", "Value", "Status"]
      const productWidths = [20, 30, 20, 15, 10, 20, 20, 20]
      const tableWidth = productWidths.reduce((sum, width) => sum + width, 0)
      const tableStartX = 20
      const rowHeight = 8

      // Calculate table dimensions
      const tableStartY = yPosition + 4 // Add more space before the table starts

      // DRAW TOP BORDER FIRST
      doc.line(tableStartX, tableStartY, tableStartX + tableWidth, tableStartY)

      // Draw table headers with proper positioning
      let xPosition = tableStartX
      doc.setFontSize(9)
      for (let i = 0; i < productHeaders.length; i++) {
        // Center text horizontally and vertically within cell
        const textWidth = (doc.getStringUnitWidth(productHeaders[i]) * doc.getFontSize()) / doc.internal.scaleFactor
        const textX = xPosition + (productWidths[i] - textWidth) / 2
        doc.text(productHeaders[i], textX, tableStartY + 4) // Position text 4 units below the top border
        xPosition += productWidths[i]
      }

      // Draw header bottom line
      const headerBottomY = tableStartY + rowHeight
      doc.line(tableStartX, headerBottomY, tableStartX + tableWidth, headerBottomY)

      // Add product data with FIXED POSITIONING
      doc.setFont("helvetica", "normal")
      const displayProducts = data.products.items.slice(0, 15)
      let currentY = headerBottomY

      for (let i = 0; i < displayProducts.length; i++) {
        const product = displayProducts[i]
        currentY += rowHeight

        if (currentY > 270) {
          doc.addPage()
          currentY = 20
        }

        xPosition = tableStartX

        // SKU column - centered text
        const skuText = product.sku.substring(0, 8)
        const skuWidth = (doc.getStringUnitWidth(skuText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(skuText, xPosition + (productWidths[0] - skuWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[0]

        // Name column - left aligned with padding
        doc.text(product.name.substring(0, 12), xPosition + 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[1]

        // Category column - centered
        const catText = product.category.substring(0, 8)
        const catWidth = (doc.getStringUnitWidth(catText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(catText, xPosition + (productWidths[2] - catWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[2]

        // Stock column - centered
        const stockText = product.stock.toString()
        const stockWidth = (doc.getStringUnitWidth(stockText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(stockText, xPosition + (productWidths[3] - stockWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[3]

        // Unit column - centered
        const unitText = product.unit
        const unitWidth = (doc.getStringUnitWidth(unitText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(unitText, xPosition + (productWidths[4] - unitWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[4]

        // Price column - right aligned with padding
        const priceText = `PHP ${product.price.toLocaleString()}`
        const priceWidth = (doc.getStringUnitWidth(priceText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(priceText, xPosition + productWidths[5] - priceWidth - 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[5]

        // Value column - right aligned with padding
        const valueText = `PHP ${product.value.toLocaleString()}`
        const valueWidth = (doc.getStringUnitWidth(valueText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(valueText, xPosition + productWidths[6] - valueWidth - 2, currentY - rowHeight / 2 + 2)
        xPosition += productWidths[6]

        // Status column - centered
        const statusText = product.status
        const statusWidth = (doc.getStringUnitWidth(statusText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(statusText, xPosition + (productWidths[7] - statusWidth) / 2, currentY - rowHeight / 2 + 2)

        // Draw horizontal line after each row
        doc.line(tableStartX, currentY, tableStartX + tableWidth, currentY)
      }

      // Draw ALL vertical lines for complete grid
      xPosition = tableStartX
      for (let i = 0; i <= productHeaders.length; i++) {
        doc.line(xPosition, tableStartY, xPosition, currentY)
        if (i < productHeaders.length) {
          xPosition += productWidths[i]
        }
      }

      yPosition = currentY + 6

      if (data.products.items.length > 15) {
        doc.setFontSize(8)
        doc.text(`Showing 15 of ${data.products.items.length} products`, 20, yPosition)
        yPosition += 6
      } else {
        yPosition += 4
      }

      // Raw Materials table with FIXED TEXT POSITIONING
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Raw Materials Inventory", 20, yPosition)
      yPosition += 8

      const rawHeaders = ["SKU", "Name", "Category", "Quantity", "Unit", "Cost/Unit", "Value", "Status"]
      const rawWidths = [15, 25, 15, 15, 10, 20, 20, 20]
      const rawTableWidth = rawWidths.reduce((sum, width) => sum + width, 0)
      const rawTableStartY = yPosition + 4 // Add more space before the table starts

      // DRAW TOP BORDER FIRST
      doc.line(tableStartX, rawTableStartY, tableStartX + rawTableWidth, rawTableStartY)

      // Draw raw materials table headers with proper positioning
      xPosition = tableStartX
      doc.setFontSize(9)
      for (let i = 0; i < rawHeaders.length; i++) {
        // Center text horizontally and vertically within cell
        const textWidth = (doc.getStringUnitWidth(rawHeaders[i]) * doc.getFontSize()) / doc.internal.scaleFactor
        const textX = xPosition + (rawWidths[i] - textWidth) / 2
        doc.text(rawHeaders[i], textX, rawTableStartY + 4) // Position text 4 units below the top border
        xPosition += rawWidths[i]
      }

      // Draw header bottom line
      const rawHeaderBottomY = rawTableStartY + rowHeight
      doc.line(tableStartX, rawHeaderBottomY, tableStartX + rawTableWidth, rawHeaderBottomY)

      // Add raw materials data with FIXED POSITIONING
      doc.setFont("helvetica", "normal")
      const displayRawMaterials = data.raw_materials.items.slice(0, 15)
      currentY = rawHeaderBottomY

      for (let i = 0; i < displayRawMaterials.length; i++) {
        const item = displayRawMaterials[i]
        currentY += rowHeight

        if (currentY > 270) {
          doc.addPage()
          currentY = 20
        }

        xPosition = tableStartX

        // SKU column - centered text
        const skuText = item.sku.substring(0, 8)
        const skuWidth = (doc.getStringUnitWidth(skuText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(skuText, xPosition + (rawWidths[0] - skuWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[0]

        // Name column - left aligned with padding
        doc.text(item.name.substring(0, 12), xPosition + 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[1]

        // Category column - centered
        const catText = item.category.substring(0, 8)
        const catWidth = (doc.getStringUnitWidth(catText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(catText, xPosition + (rawWidths[2] - catWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[2]

        // Quantity column - centered
        const qtyText = item.quantity.toString()
        const qtyWidth = (doc.getStringUnitWidth(qtyText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(qtyText, xPosition + (rawWidths[3] - qtyWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[3]

        // Unit column - centered
        const unitText = item.unit
        const unitWidth = (doc.getStringUnitWidth(unitText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(unitText, xPosition + (rawWidths[4] - unitWidth) / 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[4]

        // Cost/Unit column - right aligned with padding
        const costText = `PHP ${item.cost_per_unit.toLocaleString()}`
        const costWidth = (doc.getStringUnitWidth(costText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(costText, xPosition + rawWidths[5] - costWidth - 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[5]

        // Value column - right aligned with padding
        const valueText = `PHP ${item.value.toLocaleString()}`
        const valueWidth = (doc.getStringUnitWidth(valueText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(valueText, xPosition + rawWidths[6] - valueWidth - 2, currentY - rowHeight / 2 + 2)
        xPosition += rawWidths[6]

        // Status column - centered
        const statusText = item.status
        const statusWidth = (doc.getStringUnitWidth(statusText) * doc.getFontSize()) / doc.internal.scaleFactor
        doc.text(statusText, xPosition + (rawWidths[7] - statusWidth) / 2, currentY - rowHeight / 2 + 2)

        // Draw horizontal line after each row
        doc.line(tableStartX, currentY, tableStartX + rawTableWidth, currentY)
      }

      // Draw ALL vertical lines for complete grid
      xPosition = tableStartX
      for (let i = 0; i <= rawHeaders.length; i++) {
        doc.line(xPosition, rawTableStartY, xPosition, currentY)
        if (i < rawHeaders.length) {
          xPosition += rawWidths[i]
        }
      }
    } else if (report.type === "low-stock") {
      const data = report.content as LowStockData

      // Title with reduced spacing
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Low Stock Report", 20, yPosition)
      yPosition += 10

      // Summary section with optimized spacing
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("SUMMARY", 20, yPosition)
      yPosition += 6

      doc.setFont("helvetica", "normal")
      doc.text(`Products requiring action: ${data.products.length}`, 20, yPosition)
      doc.text(`Raw materials requiring action: ${data.raw_materials.length}`, 110, yPosition)
      yPosition += 12

      // Low Stock Products section with FIXED TEXT POSITIONING
      if (data.products.length > 0) {
        doc.setFont("helvetica", "bold")
        doc.text("Low Stock Products", 20, yPosition)
        yPosition += 8

        const productHeaders = ["SKU", "Name", "Category", "Current Stock", "Unit", "Status", "Reorder Needed"]
        const productWidths = [20, 30, 20, 15, 10, 20, 35]
        const tableWidth = productWidths.reduce((sum, width) => sum + width, 0)
        const tableStartX = 20
        const rowHeight = 8

        // Calculate table dimensions
        const tableStartY = yPosition + 4 // Add more space before the table starts

        // DRAW TOP BORDER FIRST
        doc.line(tableStartX, tableStartY, tableStartX + tableWidth, tableStartY)

        // Draw table headers with proper positioning
        let xPosition = tableStartX
        doc.setFontSize(9)
        for (let i = 0; i < productHeaders.length; i++) {
          // Center text horizontally and vertically within cell
          const textWidth = (doc.getStringUnitWidth(productHeaders[i]) * doc.getFontSize()) / doc.internal.scaleFactor
          const textX = xPosition + (productWidths[i] - textWidth) / 2
          doc.text(productHeaders[i], textX, tableStartY + 4) // Position text 4 units below the top border
          xPosition += productWidths[i]
        }

        // Draw header bottom line
        const headerBottomY = tableStartY + rowHeight
        doc.line(tableStartX, headerBottomY, tableStartX + tableWidth, headerBottomY)

        // Add product data with FIXED POSITIONING
        doc.setFont("helvetica", "normal")
        let currentY = headerBottomY

        for (let i = 0; i < data.products.length; i++) {
          const product = data.products[i]
          currentY += rowHeight

          if (currentY > 270) {
            doc.addPage()
            currentY = 20
          }

          xPosition = tableStartX

          // SKU column - centered text
          const skuText = product.sku.substring(0, 10)
          const skuWidth = (doc.getStringUnitWidth(skuText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(skuText, xPosition + (productWidths[0] - skuWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[0]

          // Name column - left aligned with padding
          doc.text(product.name.substring(0, 15), xPosition + 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[1]

          // Category column - centered
          const catText = product.category.substring(0, 10)
          const catWidth = (doc.getStringUnitWidth(catText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(catText, xPosition + (productWidths[2] - catWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[2]

          // Current Stock column - centered
          const stockText = product.current_stock.toString()
          const stockWidth = (doc.getStringUnitWidth(stockText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(stockText, xPosition + (productWidths[3] - stockWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[3]

          // Unit column - centered
          const unitText = product.unit
          const unitWidth = (doc.getStringUnitWidth(unitText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(unitText, xPosition + (productWidths[4] - unitWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[4]

          // Status column - centered
          const statusText = product.status
          const statusWidth = (doc.getStringUnitWidth(statusText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(statusText, xPosition + (productWidths[5] - statusWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += productWidths[5]

          // Reorder Needed column - centered
          const reorderText = `${product.reorder_needed} dozen`
          const reorderWidth = (doc.getStringUnitWidth(reorderText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(reorderText, xPosition + (productWidths[6] - reorderWidth) / 2, currentY - rowHeight / 2 + 2)

          // Draw horizontal line after each row
          doc.line(tableStartX, currentY, tableStartX + tableWidth, currentY)
        }

        // Draw ALL vertical lines for complete grid
        xPosition = tableStartX
        for (let i = 0; i <= productHeaders.length; i++) {
          doc.line(xPosition, tableStartY, xPosition, currentY)
          if (i < productHeaders.length) {
            xPosition += productWidths[i]
          }
        }

        yPosition = currentY + 10
      }

      // Low Stock Raw Materials section with FIXED TEXT POSITIONING
      if (data.raw_materials.length > 0) {
        if (yPosition > 180) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFont("helvetica", "bold")
        doc.text("Low Stock Raw Materials", 20, yPosition)
        yPosition += 8

        const rawHeaders = [
          "SKU",
          "Name",
          "Category",
          "Current Qty",
          "Unit",
          "Reorder Level",
          "Status",
          "Reorder Needed",
        ]
        const rawWidths = [15, 25, 15, 15, 10, 20, 20, 25]
        const tableWidth = rawWidths.reduce((sum, width) => sum + width, 0)
        const tableStartX = 20
        const rowHeight = 8

        // Calculate table dimensions
        const tableStartY = yPosition + 4 // Add more space before the table starts

        // DRAW TOP BORDER FIRST
        doc.line(tableStartX, tableStartY, tableStartX + tableWidth, tableStartY)

        // Draw table headers with proper positioning
        let xPosition = tableStartX
        doc.setFontSize(9)
        for (let i = 0; i < rawHeaders.length; i++) {
          // Center text horizontally and vertically within cell
          const textWidth = (doc.getStringUnitWidth(rawHeaders[i]) * doc.getFontSize()) / doc.internal.scaleFactor
          const textX = xPosition + (rawWidths[i] - textWidth) / 2
          doc.text(rawHeaders[i], textX, tableStartY + 4) // Position text 4 units below the top border
          xPosition += rawWidths[i]
        }

        // Draw header bottom line
        const headerBottomY = tableStartY + rowHeight
        doc.line(tableStartX, headerBottomY, tableStartX + tableWidth, headerBottomY)

        // Add raw materials data with FIXED POSITIONING
        doc.setFont("helvetica", "normal")
        let currentY = headerBottomY

        for (let i = 0; i < data.raw_materials.length; i++) {
          const item = data.raw_materials[i]
          currentY += rowHeight

          if (currentY > 270) {
            doc.addPage()
            currentY = 20
          }

          xPosition = tableStartX

          // SKU column - centered text
          const skuText = item.sku.substring(0, 8)
          const skuWidth = (doc.getStringUnitWidth(skuText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(skuText, xPosition + (rawWidths[0] - skuWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[0]

          // Name column - left aligned with padding
          doc.text(item.name.substring(0, 12), xPosition + 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[1]

          // Category column - centered
          const catText = item.category.substring(0, 8)
          const catWidth = (doc.getStringUnitWidth(catText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(catText, xPosition + (rawWidths[2] - catWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[2]

          // Current Quantity column - centered
          const qtyText = item.current_quantity.toString()
          const qtyWidth = (doc.getStringUnitWidth(qtyText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(qtyText, xPosition + (rawWidths[3] - qtyWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[3]

          // Unit column - centered
          const unitText = item.unit
          const unitWidth = (doc.getStringUnitWidth(unitText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(unitText, xPosition + (rawWidths[4] - unitWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[4]

          // Reorder Level column - centered
          const levelText = item.reorder_level.toString()
          const levelWidth = (doc.getStringUnitWidth(levelText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(levelText, xPosition + (rawWidths[5] - levelWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[5]

          // Status column - centered
          const statusText = item.status
          const statusWidth = (doc.getStringUnitWidth(statusText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(statusText, xPosition + (rawWidths[6] - statusWidth) / 2, currentY - rowHeight / 2 + 2)
          xPosition += rawWidths[6]

          // Reorder Needed column - centered
          const reorderText = `${item.reorder_needed} units`
          const reorderWidth = (doc.getStringUnitWidth(reorderText) * doc.getFontSize()) / doc.internal.scaleFactor
          doc.text(reorderText, xPosition + (rawWidths[7] - reorderWidth) / 2, currentY - rowHeight / 2 + 2)

          // Draw horizontal line after each row
          doc.line(tableStartX, currentY, tableStartX + tableWidth, currentY)
        }

        // Draw ALL vertical lines for complete grid
        xPosition = tableStartX
        for (let i = 0; i <= rawHeaders.length; i++) {
          doc.line(xPosition, tableStartY, xPosition, currentY)
          if (i < rawHeaders.length) {
            xPosition += rawWidths[i]
          }
        }
      }
    }

    // Add footer
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("Generated by 2K Inventory Management System", 105, 285, { align: "center" })

    // Return the PDF as a blob
    return new Blob([doc.output("blob")], { type: "application/pdf" })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return generateFallbackPDF(report)
  }
}

// Generate HTML content that matches the preview exactly
async function generatePreviewHTML(report: Report): Promise<string> {
  const { title, content, created_at, generated_by } = report

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: white;
          padding: 20px;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .title { 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 10px;
          color: #111827;
        }
        .subtitle { 
          font-size: 14px; 
          color: #6b7280;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          background: #f9fafb;
        }
        .summary-card h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .summary-value {
          font-weight: 600;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-orange { background: #fed7aa; color: #9a3412; }
        .badge-red { background: #fecaca; color: #991b1b; }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #111827;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        .data-table th,
        .data-table td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          text-align: left;
        }
        .data-table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }
        .data-table tr:nth-child(even) {
          background: #f9fafb;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .summary-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">INVENTORY MANAGEMENT SYSTEM REPORT</div>
        <div class="subtitle">
          ${title}<br>
          Generated by: ${generated_by}<br>
          Date: ${new Date(created_at).toLocaleDateString()}
          ${
            report.date_range_start && report.date_range_end
              ? `<br>Period: ${new Date(report.date_range_start).toLocaleDateString()} - ${new Date(report.date_range_end).toLocaleDateString()}`
              : ""
          }
        </div>
      </div>
  `

  if (report.type === "inventory-summary") {
    const data = content as InventorySummaryData
    htmlContent += `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>📦 Products Summary</h3>
          <div class="summary-item">
            <span>Total Items:</span>
            <span class="summary-value">${data.products.total_items}</span>
          </div>
          <div class="summary-item">
            <span>Total Value:</span>
            <span class="summary-value">₱${data.products.total_value.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span>In Stock:</span>
            <span class="badge badge-green">${data.products.in_stock}</span>
          </div>
          <div class="summary-item">
            <span>Low Stock:</span>
            <span class="badge badge-orange">${data.products.low_stock}</span>
          </div>
          <div class="summary-item">
            <span>Out of Stock:</span>
            <span class="badge badge-red">${data.products.out_of_stock}</span>
          </div>
        </div>
        <div class="summary-card">
          <h3>🧱 Raw Materials Summary</h3>
          <div class="summary-item">
            <span>Total Items:</span>
            <span class="summary-value">${data.raw_materials.total_items}</span>
          </div>
          <div class="summary-item">
            <span>Total Value:</span>
            <span class="summary-value">₱${data.raw_materials.total_value.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span>In Stock:</span>
            <span class="badge badge-green">${data.raw_materials.in_stock}</span>
          </div>
          <div class="summary-item">
            <span>Low Stock:</span>
            <span class="badge badge-orange">${data.raw_materials.low_stock}</span>
          </div>
          <div class="summary-item">
            <span>Out of Stock:</span>
            <span class="badge badge-red">${data.raw_materials.out_of_stock}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Products Inventory</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.products.items
              .slice(0, 20)
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.stock}</td>
                <td>₱${item.price.toLocaleString()}</td>
                <td>₱${item.value.toLocaleString()}</td>
                <td><span class="badge ${
                  item.status === "in-stock"
                    ? "badge-green"
                    : item.status === "low-stock"
                      ? "badge-orange"
                      : "badge-red"
                }">${item.status}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${data.products.items.length > 20 ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Showing 20 of ${data.products.items.length} items</p>` : ""}
      </div>

      <div class="section">
        <div class="section-title">Raw Materials Inventory</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Cost/Unit</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.raw_materials.items
              .slice(0, 20)
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>₱${item.cost_per_unit.toLocaleString()}</td>
                <td>₱${item.value.toLocaleString()}</td>
                <td><span class="badge ${
                  item.status === "in-stock"
                    ? "badge-green"
                    : item.status === "low-stock"
                      ? "badge-orange"
                      : "badge-red"
                }">${item.status}</span></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${data.raw_materials.items.length > 20 ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Showing 20 of ${data.raw_materials.items.length} items</p>` : ""}
      </div>
    `
  } else if (report.type === "low-stock") {
    const data = content as LowStockData
    htmlContent += `
      <div class="summary-grid">
        <div class="summary-card">
          <h3>⚠️ Low Stock Products</h3>
          <div class="summary-item">
            <span>Items Requiring Action:</span>
            <span class="summary-value">${data.products.length}</span>
          </div>
        </div>
        <div class="summary-card">
          <h3>🚨 Low Stock Raw Materials</h3>
          <div class="summary-item">
            <span>Items Requiring Action:</span>
            <span class="summary-value">${data.raw_materials.length}</span>
          </div>
        </div>
      </div>

      ${
        data.products.length > 0
          ? `
      <div class="section">
        <div class="section-title">Low Stock Products</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Status</th>
              <th>Reorder Needed</th>
            </tr>
          </thead>
          <tbody>
            ${data.products
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.current_stock}</td>
                <td><span class="badge ${item.status === "low-stock" ? "badge-orange" : "badge-red"}">${item.status}</span></td>
                <td><strong>${item.reorder_needed} units</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.raw_materials.length > 0
          ? `
      <div class="section">
        <div class="section-title">Low Stock Raw Materials</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Current Quantity</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Reorder Needed</th>
            </tr>
          </thead>
          <tbody>
            ${data.raw_materials
              .map(
                (item) => `
              <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.current_quantity}</td>
                <td>${item.reorder_level}</td>
                <td><span class="badge ${item.status === "low-stock" ? "badge-orange" : "badge-red"}">${item.status}</span></td>
                <td><strong>${item.reorder_needed} units</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }
    `
  }

  htmlContent += `
    </body>
    </html>
  `

  return htmlContent
}

// Fallback PDF generation
function generateFallbackPDF(report: Report): Blob {
  try {
    const { jsPDF } = require("jspdf")
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text("INVENTORY MANAGEMENT SYSTEM REPORT", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.text(`Report: ${report.title}`, 20, 40)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50)
    doc.text(`Type: ${report.type}`, 20, 60)

    doc.setFontSize(10)
    doc.text("This is a fallback report due to an error in generating the full report.", 20, 80)
    doc.text("Please try again or contact support if the issue persists.", 20, 90)

    return new Blob([doc.output("blob")], { type: "application/pdf" })
  } catch (error) {
    console.error("Error generating fallback PDF:", error)
    // Ultimate fallback - return a text file
    const textContent = `
      INVENTORY MANAGEMENT SYSTEM REPORT
      
      Report: ${report.title}
      Generated by: ${report.generated_by}
      Date: ${new Date(report.created_at).toLocaleDateString()}
      
      Report data could not be formatted as PDF.
    `
    return new Blob([textContent], { type: "text/plain" })
  }
}
