"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { Bell, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import type { User } from "@/types"
import { H6 } from "../ui/heading"
import { TrainerRoadDashboard } from "@/components/trainerroad/dashboard"

interface ConfigurationNotificationSettingsProps {
  profile: User
}

export function ConfigurationNotificationSettings({ profile }: ConfigurationNotificationSettingsProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())
  const [updateTimeouts, setUpdateTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map())
  
  // Notification settings state
  const [settings, setSettings] = useState({
    workout_completed_email: profile.workout_completed_email || false,
    program_assigned_email: profile.program_assigned_email || false,
    weekly_progress_email: profile.weekly_progress_email || false,
  })

  const updateSetting = useCallback(async (setting: keyof typeof settings, value: boolean) => {
    if (!user?.id) return

    console.log(`🔄 SETTINGS: Updating ${setting} to ${value}`)
    
    const formatSettingLabel = (s: keyof typeof settings) => {
      const labels: Record<keyof typeof settings, string> = {
        workout_completed_email: 'Workout Completed emails',
        program_assigned_email: 'Program Assigned emails',
        weekly_progress_email: 'Weekly Progress emails',
      }
      return labels[s]
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ [setting]: value })
        .eq("id", user.id)

      if (error) {
        console.error("❌ SETTINGS: Update error:", error)
        // Revert the optimistic update on error
        setSettings(prev => ({ ...prev, [setting]: !value }))
        setMessage({
          type: 'error',
          text: `Failed to update ${setting.replace(/_/g, ' ')}`
        })
        return
      }

      console.log(`✅ SETTINGS: Successfully updated ${setting}`)
      
      setMessage({
        type: 'success',
        text: `You turned ${value ? 'on' : 'off'} ${formatSettingLabel(setting)}.`
      })

      // Keep success message visible for at least 3 seconds
      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error("❌ SETTINGS: Error updating settings:", error)
      // Revert the optimistic update on error
      setSettings(prev => ({ ...prev, [setting]: !value }))
      setMessage({
        type: 'error',
        text: `Failed to update ${setting.replace(/_/g, ' ')}`
      })
    } finally {
      // Remove from pending updates
      setPendingUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(setting)
        return newSet
      })
    }
  }, [user?.id, supabase])

  const handleSettingChange = async (setting: keyof typeof settings, value: boolean) => {
    // Optimistic update - update UI immediately
    setSettings(prev => ({ ...prev, [setting]: value }))
    
    // Add to pending updates
    setPendingUpdates(prev => new Set(prev).add(setting))
    
    // Clear any existing messages
    setMessage(null)
    
    // Clear existing timeout for this setting
    const existingTimeout = updateTimeouts.get(setting)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set new timeout for debounced update
    const timeout = setTimeout(() => {
      updateSetting(setting, value)
      setUpdateTimeouts(prev => {
        const newMap = new Map(prev)
        newMap.delete(setting)
        return newMap
      })
    }, 300) // 300ms debounce
    
    setUpdateTimeouts(prev => new Map(prev).set(setting, timeout))
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
      weekly_progress_email: {
        user: "Get a weekly summary of your progress",
        coach: "Get weekly summaries of your clients' progress"
      }
    }
    
    return descriptions[setting as keyof typeof descriptions]?.[role as keyof typeof descriptions.workout_completed_email] || ""
  }

  const isSettingPending = (setting: keyof typeof settings) => {
    return pendingUpdates.has(setting)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8 mt-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Email Notification Settings
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
          {/* <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Workout Completed</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'workout_completed_email')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSettingPending('workout_completed_email') && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <Switch
                checked={settings.workout_completed_email}
                onCheckedChange={(checked) => handleSettingChange('workout_completed_email', checked)}
                disabled={isSettingPending('workout_completed_email')}
              />
            </div>
          </div> */}

          {/* Program Assigned Notifications (user only) */}
          {profile.role === "user" && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Program Assigned</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'program_assigned_email')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSettingPending('program_assigned_email') && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <Switch
                className="cursor-pointer"
                checked={settings.program_assigned_email}
                onCheckedChange={(checked) => handleSettingChange('program_assigned_email', checked)}
                disabled={isSettingPending('program_assigned_email')}
              />
            </div>
          </div>
          )}

          {/* Client Workout Completed (coach only) */}
          {profile.role === "coach" && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Client Workout Completed</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic emails when your clients mark workouts as completed.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSettingPending('workout_completed_email') && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                <Switch
                  className="cursor-pointer"
                  checked={settings.workout_completed_email}
                  onCheckedChange={(v) => handleSettingChange('workout_completed_email', v)}
                  disabled={isSettingPending('workout_completed_email')}
                />
              </div>
            </div>
          )}

          {/* Weekly Progress Notifications */}
          {/* <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Weekly Progress</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getNotificationDescription(profile.role, 'weekly_progress_email')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSettingPending('weekly_progress_email') && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <Switch
                checked={settings.weekly_progress_email}
                onCheckedChange={(checked) => handleSettingChange('weekly_progress_email', checked)}
                disabled={isSettingPending('weekly_progress_email')}
              />
            </div>
          </div> */}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
      <CardContent className="space-y-4">
        <H6 >Email Notification Settings</H6>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          {profile.role === "user" && (
            <p>
              • <strong>Program Assigned:</strong> {getNotificationDescription(profile.role, 'program_assigned_email')}
            </p>
          )}

          {profile.role === "coach" && (
            <p>
              • <strong>Client Workout Completed:</strong> Automatic emails when your clients mark workouts as completed.
            </p>
          )}
          
        </div>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Changes are saved automatically. You can continue using the app while settings update in the background.
          </p>
        </div>
      </CardContent>
    </Card>

      {/* TrainerRoad Integration (users only) */}
      {profile.role === "user" && (
        <div className="space-y-4">
          <H6>TrainerRoad</H6>
          <TrainerRoadDashboard />
        </div>
      )}
    </div>
  )
} 
