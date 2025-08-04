"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Bell, Mail, CheckCircle, AlertCircle } from "lucide-react"
import type { User } from "@/types"

interface NotificationSettingsProps {
  profile: User
}

export function NotificationSettings({ profile }: NotificationSettingsProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Notification settings state
  const [settings, setSettings] = useState({
    workout_completed_email: profile.workout_completed_email || false,
    program_assigned_email: profile.program_assigned_email || false,
    weekly_progress_email: profile.weekly_progress_email || false,
  })

  const handleSettingChange = async (setting: keyof typeof settings, value: boolean) => {
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("users")
        .update({ [setting]: value })
        .eq("id", user?.id)

      if (error) {
        console.error("❌ SETTINGS: Update error:", error)
        setMessage({
          type: 'error',
          text: 'Failed to update notification settings'
        })
        return
      }

      // Update local state
      setSettings(prev => ({ ...prev, [setting]: value }))
      
      setMessage({
        type: 'success',
        text: 'Notification settings updated successfully!'
      })

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error("❌ SETTINGS: Error updating settings:", error)
      setMessage({
        type: 'error',
        text: 'Failed to update notification settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const getNotificationDescription = (role: string, setting: string) => {
    const descriptions = {
      workout_completed_email: {
        user: "Get notified when you complete a workout",
        coach: "Get notified when your clients complete workouts"
      },
      program_assigned_email: {
        user: "Get notified when a new program is assigned to you",
        coach: "Get notified when you assign a program to a client"
      },
      // weekly_progress_email: {
      //   user: "Get a weekly summary of your progress",
      //   coach: "Get weekly summaries of your clients' progress"
      // }
    }
    
    return descriptions[setting as keyof typeof descriptions]?.[role as keyof typeof descriptions.workout_completed_email] || ""
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Notification Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your email notification preferences
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {message.type === 'success' ? 'Success!' : 'Error:'}
            </p>
            <p className="text-sm mt-1">{message.text}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workout Completed Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Workout Completed</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'workout_completed_email')}
              </p>
            </div>
            <Switch
              checked={settings.workout_completed_email}
              onCheckedChange={(checked) => handleSettingChange('workout_completed_email', checked)}
              disabled={loading}
            />
          </div>

          {/* Program Assigned Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Program Assigned</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'program_assigned_email')}
              </p>
            </div>
            <Switch
              checked={settings.program_assigned_email}
              onCheckedChange={(checked) => handleSettingChange('program_assigned_email', checked)}
              disabled={loading}
            />
          </div>

          {/* Weekly Progress Notifications */}
          {/* <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Weekly Progress</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'weekly_progress_email')}
              </p>
            </div>
            <Switch
              checked={settings.weekly_progress_email}
              onCheckedChange={(checked) => handleSettingChange('weekly_progress_email', checked)}
              disabled={loading}
            />
          </div> */}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            About Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              • <strong>Workout Completed:</strong> Receive an email when a workout is marked as completed
            </p>
            <p>
              • <strong>Program Assigned:</strong> Get notified when a new program is assigned to you or your clients
            </p>
            {/* <p>
              • <strong>Weekly Progress:</strong> Receive a weekly summary of your progress or your clients' progress
            </p> */}
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> You can change these settings at any time. Changes take effect immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 