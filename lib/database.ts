import { supabase, testSupabaseConnection } from "./supabaseClient"

// Types for our database tables
export type User = {
  id: string
  username: string
  email: string
  user_type: "admin" | "staff"
  status: "active" | "inactive"
  created_at?: string
  updated_at?: string
  last_login?: string
}

export interface AuthUserMapping {
  id: string
  auth_user_id: string
  app_user_id: string
  created_at: string
}

export interface InventoryItem {
  id: number
  name: string
  description?: string
  category: string
  price: number
  stock: number
  sku: string
  status: "in-stock" | "low-stock" | "out-of-stock"
  image_url?: string
  created_at: string
  updated_at: string
}

export interface RawMaterial {
  id: number
  name: string
  description?: string
  category?: string
  quantity: number
  unit: string
  cost_per_unit: number
  supplier?: string
  reorder_level?: number
  sku?: string
  status: "in-stock" | "low-stock" | "out-of-stock"
  created_at: string
  updated_at: string
}

export interface FixedPrice {
  id: number
  item_type: "raw_material" | "product"
  category: string
  item_name: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  user_id?: string
  action: string
  description: string
  created_at: string
}

// Helper function to get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    if (typeof window !== "undefined") {
      const sessionUser = sessionStorage.getItem("currentUser")
      if (sessionUser) {
        const userData = JSON.parse(sessionUser)
        return {
          id: userData.id,
          username: userData.username,
          email: userData.email || "",
          user_type: userData.type,
          status: "active",
        } as User
      }

      const localUser = localStorage.getItem("user")
      if (localUser) {
        return JSON.parse(localUser) as User
      }
    }
  } catch (error) {
    console.error("Error parsing user session:", error)
  }
  return null
}

// Helper function to check if user has admin privileges
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.user_type === "admin"
}

// Helper function to check if user has staff or admin privileges
export async function isStaffOrAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.user_type && ["admin", "staff"].includes(user.user_type)
}

// Test function to check database connection and data
export async function testDatabaseConnection(): Promise<void> {
  try {
    console.log("=== Database Connection Test ===")

    // First test the Supabase connection
    const connectionOk = await testSupabaseConnection()
    if (!connectionOk) {
      console.error("Supabase connection failed - check your credentials")
      return
    }

    // Test users table
    console.log("Testing users table...")
    const { data: users, error: usersError } = await supabase.from("users").select("*")

    if (usersError) {
      console.error("Error fetching users:", {
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint,
        code: usersError.code,
      })
    } else {
      console.log("Users found:", users?.length || 0)
      console.log("Users data:", users)
    }

    // Test user_passwords table
    console.log("Testing user_passwords table...")
    const { data: passwords, error: passwordsError } = await supabase
      .from("user_passwords")
      .select("user_id, password_hash")

    if (passwordsError) {
      console.error("Error fetching passwords:", {
        message: passwordsError.message,
        details: passwordsError.details,
        hint: passwordsError.hint,
        code: passwordsError.code,
      })
    } else {
      console.log("Passwords found:", passwords?.length || 0)
      console.log("Password data:", passwords)
    }

    console.log("=== End Database Test ===")
  } catch (error) {
    console.error("Database test error:", error)
  }
}

// Authenticate user with better error handling
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  try {
    console.log("=== Authentication Attempt ===")
    console.log("Username:", username)

    // Test connection first
    const connectionOk = await testSupabaseConnection()
    if (!connectionOk) {
      console.error("Cannot authenticate - Supabase connection failed")
      return null
    }

    // Get user by username with detailed error handling
    console.log("Looking up user...")
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("status", "active")
      .single()

    if (userError) {
      console.error("User lookup failed:", {
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code,
      })
      return null
    }

    if (!user) {
      console.error("No user found with username:", username)
      return null
    }

    console.log("User found:", {
      id: user.id,
      username: user.username,
      user_type: user.user_type,
      status: user.status,
    })

    // Get password for user
    console.log("Looking up password...")
    const { data: passwordData, error: passwordError } = await supabase
      .from("user_passwords")
      .select("password_hash")
      .eq("user_id", user.id)
      .single()

    if (passwordError) {
      console.error("Password lookup failed:", {
        message: passwordError.message,
        details: passwordError.details,
        hint: passwordError.hint,
        code: passwordError.code,
      })
      return null
    }

    if (!passwordData) {
      console.error("No password found for user:", user.id)
      return null
    }

    console.log("Password found for user")

    // Check password
    if (passwordData.password_hash !== password) {
      console.error("Password mismatch")
      return null
    }

    console.log("Password matches - authentication successful")

    // Update last login
    try {
      await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", user.id)
    } catch (updateError) {
      console.warn("Failed to update last login:", updateError)
    }

    // Log activity
    try {
      await logActivity("login", `User ${user.username} logged in`)
    } catch (activityError) {
      console.warn("Failed to log activity:", activityError)
    }

    console.log("=== Authentication Complete ===")
    return user as User
  } catch (error) {
    console.error("Authentication error:", error)
    return null
  }
}

// Database operations for fixed prices
export async function getFixedPrices(itemType: "raw_material" | "product", category?: string): Promise<FixedPrice[]> {
  try {
    let query = supabase.from("fixed_prices").select("*").eq("item_type", itemType).eq("is_active", true)

    if (category) {
      query = query.eq("category", category)
    }

    const { data, error } = await query.order("item_name", { ascending: true })

    if (error) {
      console.error("Error fetching fixed prices:", error)
      return []
    }

    return data || []
  } catch (error: any) {
    console.error("Unexpected error fetching fixed prices:", error)
    return []
  }
}

export async function addFixedPrice(
  priceData: Omit<FixedPrice, "id" | "created_at" | "updated_at">,
): Promise<FixedPrice | null> {
  try {
    const { data, error } = await supabase.from("fixed_prices").insert(priceData).select().single()

    if (error) {
      console.error("Error adding fixed price:", error)
      return null
    }

    await logActivity("create", `Added fixed price for ${priceData.item_name}: $${priceData.price}`)
    return data
  } catch (error: any) {
    console.error("Unexpected error adding fixed price:", error)
    return null
  }
}

export async function updateFixedPrice(id: number, updates: Partial<FixedPrice>): Promise<FixedPrice | null> {
  try {
    const { data, error } = await supabase.from("fixed_prices").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating fixed price:", error)
      return null
    }

    await logActivity("update", `Updated fixed price for ${data.item_name}: $${data.price}`)
    return data
  } catch (error: any) {
    console.error("Unexpected error updating fixed price:", error)
    return null
  }
}

export async function deleteFixedPrice(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("fixed_prices").delete().eq("id", id)

    if (error) {
      console.error("Error deleting fixed price:", error)
      return false
    }

    await logActivity("delete", `Deleted fixed price with ID: ${id}`)
    return true
  } catch (error: any) {
    console.error("Unexpected error deleting fixed price:", error)
    return false
  }
}

// Database operations for inventory items
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    console.log("Fetching inventory items...")
    const { data, error } = await supabase.from("inventory_items").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching inventory items:", error)
      return []
    }

    return data || []
  } catch (error: any) {
    console.error("Unexpected error fetching inventory items:", error)
    return []
  }
}

export async function addInventoryItem(
  item: Omit<InventoryItem, "id" | "created_at" | "updated_at" | "sku" | "status" | "description" | "image_url">,
): Promise<InventoryItem | null> {
  try {
    const { data: existingItems } = await supabase
      .from("inventory_items")
      .select("sku")
      .like("sku", "PRD-%")
      .order("sku", { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (existingItems && existingItems.length > 0 && existingItems[0].sku) {
      const lastSku = existingItems[0].sku
      const lastNumber = Number.parseInt(lastSku.split("-")[1])
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
    const sku = `PRD-${nextNumber.toString().padStart(4, "0")}`

    let status: "in-stock" | "low-stock" | "out-of-stock" = "in-stock"
    if (item.stock === 0) status = "out-of-stock"
    else if (item.stock <= 10) status = "low-stock"

    const newItem = { ...item, sku, status, price: item.price || 0 }

    const { data, error } = await supabase.from("inventory_items").insert(newItem).select().single()

    if (error) {
      console.error("Error adding inventory item:", error)
      return null
    }
    await logActivity("create", `Added new product: ${data.name} (SKU: ${data.sku})`)
    return data
  } catch (error: any) {
    console.error("Unexpected error adding inventory item:", error)
    return null
  }
}

export async function updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  try {
    if (updates.stock !== undefined) {
      if (updates.stock === 0) updates.status = "out-of-stock"
      else if (updates.stock <= 10) updates.status = "low-stock"
      else updates.status = "in-stock"
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("inventory_items").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating inventory item:", error)
      return null
    }

    await logActivity("update", `Updated product: ${data.name} (ID: ${id})`)
    return data
  } catch (error: any) {
    console.error("Unexpected error updating inventory item:", error)
    return null
  }
}

export async function deleteInventoryItem(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id)
    if (error) {
      console.error("Error deleting inventory item:", error)
      return false
    }
    await logActivity("delete", `Deleted product with ID: ${id}`)
    return true
  } catch (error: any) {
    console.error("Unexpected error deleting inventory item:", error)
    return false
  }
}

// Database operations for raw materials
export async function getRawMaterials(): Promise<RawMaterial[]> {
  try {
    const { data, error } = await supabase.from("raw_materials").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching raw materials:", error)
      return []
    }

    const transformedData =
      data?.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category || "general",
        quantity: item.quantity || 0,
        unit: item.unit || (item.category === "Fabric" ? "rolls" : "units"),
        cost_per_unit: item.cost_per_unit || 0,
        supplier: item.supplier,
        reorder_level: item.reorder_level || 10,
        sku: item.sku || `RAW-${item.id.toString().padStart(4, "0")}`,
        status: item.status || (item.quantity > 10 ? "in-stock" : item.quantity > 0 ? "low-stock" : "out-of-stock"),
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) || []

    return transformedData
  } catch (error: any) {
    console.error("Unexpected error fetching raw materials:", error)
    return []
  }
}

export async function addRawMaterial(
  material: Omit<
    RawMaterial,
    "id" | "created_at" | "updated_at" | "sku" | "status" | "description" | "supplier" | "unit" | "reorder_level"
  > & { quantity: number; category: string; name: string; cost_per_unit: number },
): Promise<RawMaterial | null> {
  try {
    const { data: existingMaterials } = await supabase
      .from("raw_materials")
      .select("sku")
      .like("sku", "RAW-%")
      .order("sku", { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (existingMaterials && existingMaterials.length > 0 && existingMaterials[0].sku) {
      const lastSku = existingMaterials[0].sku
      const lastNumber = Number.parseInt(lastSku.split("-")[1])
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
    const sku = `RAW-${nextNumber.toString().padStart(4, "0")}`

    // Set unit based on category - fabric uses "rolls", others use "units"
    const unit = material.category === "Fabric" ? "rolls" : "units"
    const reorder_level = 10

    let status: "in-stock" | "low-stock" | "out-of-stock" = "in-stock"
    if (material.quantity === 0) status = "out-of-stock"
    else if (material.quantity <= reorder_level) status = "low-stock"

    const newMaterial = { ...material, sku, status, unit, reorder_level }

    const { data, error } = await supabase.from("raw_materials").insert(newMaterial).select().single()

    if (error) {
      console.error("Error adding raw material:", error)
      return null
    }
    await logActivity("create", `Added new raw material: ${data.name} (SKU: ${data.sku})`)
    return data
  } catch (error: any) {
    console.error("Unexpected error adding raw material:", error)
    return null
  }
}

export async function updateRawMaterial(id: number, updates: Partial<RawMaterial>): Promise<RawMaterial | null> {
  try {
    // Calculate status based on quantity and reorder level
    if (updates.quantity !== undefined || updates.reorder_level !== undefined) {
      const { data: currentMaterial } = await supabase
        .from("raw_materials")
        .select("quantity, reorder_level")
        .eq("id", id)
        .single()
      if (currentMaterial) {
        const newQuantity = updates.quantity ?? currentMaterial.quantity
        const newReorderLevel = updates.reorder_level ?? currentMaterial.reorder_level
        if (newQuantity === 0) updates.status = "out-of-stock"
        else if (newQuantity <= newReorderLevel) updates.status = "low-stock"
        else updates.status = "in-stock"
      }
    }

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("raw_materials").update(updateData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating raw material:", error)
      return null
    }

    await logActivity("update", `Updated raw material: ${data.name} (ID: ${id})`)
    return data
  } catch (error: any) {
    console.error("Unexpected error updating raw material:", error)
    return null
  }
}

export async function deleteRawMaterial(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from("raw_materials").delete().eq("id", id)
    if (error) {
      console.error("Error deleting raw material:", error)
      return false
    }
    await logActivity("delete", `Deleted raw material with ID: ${id}`)
    return true
  } catch (error: any) {
    console.error("Unexpected error deleting raw material:", error)
    return false
  }
}

// Database operations for users
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })
  if (error) {
    console.error("Error fetching users:", error)
    return []
  }
  return data as User[]
}

export async function addUser(
  userData: Omit<User, "id" | "created_at" | "updated_at" | "last_login">,
): Promise<User | null> {
  const { data, error } = await supabase.from("users").insert([userData]).select()
  if (error) {
    console.error("Error adding user:", error)
    return null
  }
  return data[0] as User
}

export async function addUserPassword(userId: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_passwords").insert([
    {
      user_id: userId,
      password_hash: password,
    },
  ])

  if (error) {
    console.error("Error adding user password:", error)
    return false
  }
  return true
}

export async function updateUserPassword(userId: string, password: string): Promise<boolean> {
  const { data: existingPassword } = await supabase.from("user_passwords").select("*").eq("user_id", userId).single()

  if (existingPassword) {
    const { error } = await supabase
      .from("user_passwords")
      .update({ password_hash: password, updated_at: new Date().toISOString() })
      .eq("user_id", userId)

    if (error) {
      console.error("Error updating password:", error)
      return false
    }
  } else {
    return await addUserPassword(userId, password)
  }

  return true
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .update({ ...userData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error updating user:", error)
    return null
  }
  return data[0] as User
}

export async function deleteUser(id: string): Promise<boolean> {
  await supabase.from("user_passwords").delete().eq("user_id", id)
  const { error } = await supabase.from("users").delete().eq("id", id)
  if (error) {
    console.error("Error deleting user:", error)
    return false
  }
  return true
}

// Database operations for activities
export async function getActivities(): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("Error fetching activities:", error)
      return []
    }
    return data || []
  } catch (error: any) {
    console.error("Unexpected error fetching activities:", error)
    return []
  }
}

export async function logActivity(action: string, description: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    await supabase.from("activities").insert([{ user_id: user?.id || null, action, description }])
  } catch (error: any) {
    console.error("Error logging activity:", error)
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    }
  } catch (error: any) {
    console.error("Unexpected error signing out:", error)
  }
}
