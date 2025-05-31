"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { UserPlus, Edit, Trash2, Users, Shield, UserIcon, RefreshCw } from "lucide-react" // Renamed User to UserIcon
import MainLayout from "@/components/main-layout"
import PageHeader from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  isAdmin,
  type User,
  addUserPassword,
  updateUserPassword,
} from "@/lib/database" // Import User type

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    username: "",
    email: "", // Added email
    password: "", // For new users
    user_type: "staff" as User["user_type"],
    status: "active" as User["status"],
  })
  const router = useRouter()
  const { toast } = useToast()

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    const isAdminUser = await isAdmin()
    if (!isAdminUser) {
      toast({ title: "Access Denied", description: "Admin privileges required.", variant: "destructive" })
      router.push("/dashboard")
      return
    }
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleAddUser = () => {
    setFormData({ username: "", email: "", password: "", user_type: "staff", status: "active" })
    setIsAddModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: "", // Password not edited here directly for security
      user_type: user.user_type,
      status: user.status,
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const saveUser = async (isEdit = false) => {
    if (!formData.username || !formData.email || (!isEdit && !formData.password) || !formData.user_type) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    setIsLoading(true) // To disable button during operation

    try {
      let result = null
      if (isEdit && selectedUser) {
        const updateData: Partial<User> = {
          username: formData.username,
          email: formData.email,
          user_type: formData.user_type,
          status: formData.status,
        }

        result = await updateUser(selectedUser.id, updateData)

        // Update password if provided
        if (formData.password && formData.password.trim() !== "") {
          const passwordResult = await updateUserPassword(selectedUser.id, formData.password)
          if (!passwordResult) {
            toast({ title: "Warning", description: "User updated but password change failed.", variant: "destructive" })
          }
        }

        if (result) {
          // Reload users data to ensure consistency
          await loadUsers()
          toast({ title: "Success", description: "User updated successfully and data refreshed!" })
        }
      } else {
        // Add new user
        const newUserPayload = {
          username: formData.username,
          email: formData.email,
          user_type: formData.user_type,
          status: formData.status,
        }

        result = await addUser(newUserPayload as Omit<User, "id" | "created_at" | "updated_at" | "last_login">)

        if (result) {
          // Add password for the new user
          const passwordResult = await addUserPassword(result.id, formData.password)

          if (!passwordResult) {
            toast({ title: "Warning", description: "User created but password setup failed.", variant: "destructive" })
          } else {
            // Reload users data to ensure consistency
            await loadUsers()
            toast({ title: "Success", description: "User added successfully and data refreshed!" })
          }
        }
      }

      if (result) {
        setIsAddModalOpen(false)
        setIsEditModalOpen(false)
      } else {
        toast({ title: "Error", description: `Failed to ${isEdit ? "update" : "add"} user.`, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (userToDelete) {
      setIsLoading(true)
      const success = await deleteUser(userToDelete.id)
      if (success) {
        // Reload users data to ensure consistency
        await loadUsers()
        toast({ title: "Success", description: "User deleted successfully and data refreshed!" })
      } else {
        toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" })
      }
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === "Never") return "Never"
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString() + " " + date.toLocaleTimeString()
    } catch {
      return "Invalid Date"
    }
  }

  const getUserTypeBadge = (type: User["user_type"]) => {
    return type === "admin" ? (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <UserIcon className="h-3 w-3 mr-1" />
        Staff
      </Badge>
    )
  }

  const getStatusBadge = (status: User["status"]) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Inactive</Badge>
    )
  }

  if (isLoading && users.length === 0) {
    return (
      <MainLayout>
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Manage Users" />
        <div className="flex gap-4 mb-6">
          <Button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" /> Add User
          </Button>
          <Button variant="outline" size="icon" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {/* Export Users button can be re-added if CSV export from DB is implemented */}
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                System Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Username</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">User Type</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Last Login</th>
                      <th className="text-left py-3 px-4 font-medium">Created Date</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="py-3 px-4 font-medium">{user.username}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{getUserTypeBadge(user.user_type)}</td>
                        <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(user.last_login)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <Label htmlFor="type">User Type</Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(value) => setFormData({ ...formData, user_type: value as User["user_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as User["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => saveUser(false)} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">User Type</Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(value) => setFormData({ ...formData, user_type: value as User["user_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as User["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => saveUser(true)} disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be undone from the application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}
