"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { User, Lock, Mail, User as UserIcon, AlertCircle } from "lucide-react"

export function ProfileSettings() {
  const { profile, user } = useAuth()
  const supabase = createClient()
  
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  // Update form state when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        email: profile.email || ""
      })
    }
  }, [profile])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setMessage(null)

    console.log("🔄 PROFILE: Starting profile update...", { name: profileForm.name, email: profileForm.email })

    // Validate email format
    if (!validateEmail(profileForm.email)) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid email address'
      })
      setProfileLoading(false)
      return
    }

    try {
      // Update profile in database first
      const { data: updatedProfile, error: profileError } = await supabase
        .from("users")
        .update({
          name: profileForm.name,
          email: profileForm.email
        })
        .eq("id", user?.id)
        .select()
        .single()

      if (profileError) {
        console.error("❌ PROFILE: Database update error:", profileError)
        throw profileError
      }

      console.log("✅ PROFILE: Database updated successfully:", updatedProfile)

      // Update email in auth if it changed
      if (profileForm.email !== user?.email) {
        console.log("🔄 PROFILE: Updating email in auth...")
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileForm.email
        })

        if (emailError) {
          console.error("❌ PROFILE: Auth email update error:", emailError)
          throw emailError
        }

        console.log("✅ PROFILE: Email update initiated")
        setMessage({
          type: 'warning',
          text: 'Profile updated! Please check your email and click the confirmation link to activate your new email address. You can continue using your current email for login until the new one is confirmed.'
        })
      } else {
        console.log("✅ PROFILE: Profile updated successfully (no email change)")
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!'
        })
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error("❌ PROFILE: Profile update error:", error)
        setMessage({
          type: 'error',
          text: error.message || 'Failed to update profile'
        })
      } else {
        console.error("❌ PROFILE: Unknown profile update error:", error)
        setMessage({
          type: 'error',
          text: 'Failed to update profile'
        })
      }
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setMessage(null)

    console.log(" PASSWORD: Starting password update...")

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match'
      })
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long'
      })
      setPasswordLoading(false)
      return
    }

    try {
      console.log(" PASSWORD: Updating password in auth...")
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) {
        console.error("❌ PASSWORD: Password update error:", error)
        throw error
      }

      console.log("✅ PASSWORD: Password updated successfully")
      setMessage({
        type: 'success',
        text: 'Password updated successfully!'
      })

      // Clear password form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })

    } catch (error) {
      // error is unknown, so we need to type guard
      console.error("❌ PASSWORD: Password update error:", error)
      setMessage({
        type: 'error',
        text:
          typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
            ? (error as { message: string }).message
            : "Failed to update password"
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Profile Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account information and security settings
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
            : message.type === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {message.type === 'success' ? 'Success!' : message.type === 'warning' ? 'Important:' : 'Error:'}
            </p>
            <p className="text-sm mt-1">{message.text}</p>
          </div>
        </div>
      )}

      {/* Email Confirmation Notice */}
      {user.email !== profile.email && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Email Update Pending</p>
              <p className="text-sm mt-1">
                You have a pending email change to <strong>{profile.email}</strong>. 
                Please check your email and click the confirmation link to activate the new email address.
                You can continue using <strong>{user.email}</strong> for login until the new email is confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your name and email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                required
                disabled={profileLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email address"
                required
                disabled={profileLoading}
              />
              <p className="text-xs text-gray-500">
                Current login email: <strong>{user.email}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>Role: <span className="font-medium capitalize">{profile.role}</span></span>
            </div>

            <Button type="submit" disabled={profileLoading} className="w-full">
              {profileLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={passwordLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
                minLength={6}
                disabled={passwordLoading}
              />
            </div>

            <Button type="submit" disabled={passwordLoading} className="w-full">
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your account details and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">User ID</span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">{user.id}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Login Email</span>
            <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Profile Email</span>
            <span className="text-sm text-gray-900 dark:text-white">{profile.email}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Email Verified</span>
            <span className={`text-sm ${user.email_confirmed_at ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {user.email_confirmed_at ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
            <span className="text-sm text-gray-900 dark:text-white">
              {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Last Sign In</span>
            <span className="text-sm text-gray-900 dark:text-white">
              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 