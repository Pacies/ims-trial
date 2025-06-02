"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { authenticateUser, testDatabaseConnection } from "@/lib/database"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const router = useRouter()

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      console.log("Testing database connection on page load...")
      await testDatabaseConnection()
    }
    testConnection()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Login attempt:", { username, userType })

      let user = null

      // Try database authentication first
      if (!useFallback) {
        user = await authenticateUser(username, password)

        // If database auth fails, offer fallback
        if (!user) {
          console.log("Database authentication failed, offering fallback...")
          setUseFallback(true)
          setError("Database connection failed. Click 'Use Fallback Login' to continue with demo mode.")
          setIsLoading(false)
          return
        }
      } else {
        // Use fallback authentication
        user = await fallbackAuthentication(username, password, userType)
      }

      if (user) {
        console.log("Authentication successful:", user)

        // Check if the selected user type matches the user's actual type
        if (user.user_type !== userType) {
          setError(`Invalid user type. This account is registered as ${user.user_type}.`)
          setIsLoading(false)
          return
        }

        // Store user in sessionStorage (for compatibility with existing code)
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "currentUser",
            JSON.stringify({
              id: user.id,
              username: user.username,
              type: user.user_type,
              email: user.email,
            }),
          )

          // Also store in localStorage for the database functions
          localStorage.setItem("user", JSON.stringify(user))
        }

        // Log activity
        const activity = {
          type: "login",
          details: `User ${user.username} logged in as ${user.user_type}${useFallback ? " (fallback mode)" : ""}`,
          timestamp: new Date().toISOString(),
          user: user.username,
        }

        // Store activity in localStorage
        if (typeof window !== "undefined") {
          const activities = JSON.parse(localStorage.getItem("activities") || "[]")
          activities.unshift(activity)
          localStorage.setItem("activities", JSON.stringify(activities.slice(0, 100)))
        }

        console.log("Login successful, redirecting to dashboard")

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        console.log("Authentication failed")
        setError("Invalid username or password.")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred during login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFallbackLogin = () => {
    setUseFallback(true)
    setError("")
    console.log("Switched to fallback authentication mode")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white mx-auto mb-4 shadow-lg">
            2K
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to your account</p>
          {useFallback && (
            <div className="bg-yellow-50 text-yellow-800 p-2 rounded text-sm mt-2">
              Running in demo mode (fallback authentication)
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">Login as</Label>
              <Select value={userType} onValueChange={setUserType} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              {!useFallback && error.includes("Database connection failed") && (
                <Button type="button" variant="outline" onClick={handleFallbackLogin} className="w-full h-12">
                  Use Fallback Login (Demo Mode)
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
