"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { User } from "@/lib/database"
import { Package, BarChart3, Users, Home, Wrench, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addActivity } from "@/lib/activity-store"

export default function Navbar() {
  const [currentTime, setCurrentTime] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString())
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    // Get current user from session storage for now
    const userStr = sessionStorage.getItem("currentUser")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem("currentUser")

    // Show success message
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    })

    // Redirect to login page
    router.push("/login")
  }

  // Define nav items based on user type
  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Raw Materials", path: "/inventory", icon: Wrench },
    { name: "Products", path: "/products", icon: Package },
  ]

  // Add Orders link only for admin users
  if (currentUser?.user_type === "admin" || currentUser?.type === "admin") {
    navItems.push({ name: "Orders", path: "/orders", icon: ShoppingCart })
  }

  // Add Reports for all users
  navItems.push({ name: "Reports", path: "/reports", icon: BarChart3 })

  // Add manage users link only for admin users
  if (currentUser?.user_type === "admin" || currentUser?.type === "admin") {
    navItems.push({ name: "Manage Users", path: "/manage-user", icon: Users })
  }

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">2K</span>
            </div>
            <span className="text-gray-800 font-bold text-xl tracking-wider">2K Inventory</span>
          </Link>
          <div className="text-xs text-gray-500 ml-2">{currentTime}</div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <ul className="flex flex-wrap justify-center gap-1 mb-4 md:mb-0">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium relative transition-colors",
                    pathname === item.path ? "text-blue-600" : "text-gray-600 hover:text-blue-600",
                  )}
                  onClick={() => addActivity(`Navigated to ${item.name} page`)}
                >
                  {item.name}
                  {pathname === item.path && (
                    <motion.span
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      layoutId="navbar-indicator"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="border-2 border-blue-500 cursor-pointer">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                  <AvatarFallback>{currentUser?.username?.substring(0, 2).toUpperCase() || "2K"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium text-gray-500">
                  {currentUser?.username || "User"} ({currentUser?.user_type || currentUser?.type || "guest"})
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
