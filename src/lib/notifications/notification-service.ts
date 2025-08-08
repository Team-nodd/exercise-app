/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client"
import { emailService } from "@/lib/email/email-service"

interface WorkoutData {
  id: number
  name: string
  user_id: string
  program_id: number
  completed_at: string
}

interface ProgramData {
  id: number
  name: string
  coach_id: string
  user_id: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: "coach" | "user"
  workout_completed_email: boolean
}

export class NotificationService {
  private static instance: NotificationService
  private supabase = createClient()

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Notify coach when client sends a workout email summary successfully
  async notifyCoachWorkoutEmailSent(
    workoutId: number,
    userId: string,
    coachId: string
  ): Promise<void> {
    try {
      // Get workout details with program_id
      const { data: workout, error: workoutError } = await this.supabase
        .from('workouts')
        .select('name, program_id')
        .eq('id', workoutId)
        .single()

      if (workoutError || !workout) {
        console.error('Error fetching workout details:', workoutError)
        return
      }

      // Get user details
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.error('Error fetching user details:', userError)
        return
      }

      const relatedId = `workout:${workoutId}:program:${workout.program_id}`

      // Use the API endpoint to create the notification
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          recipientId: coachId,
          title: `Workout Email Sent`,
          message: `${user.name} sent a workout summary email for "${workout.name}".`,
          type: 'workout_email_sent',
          relatedId,
        }),
      })

      if (!response.ok) {
        let details: unknown = null
        try {
          details = await response.json()
        } catch {
          try {
            details = await response.text()
          } catch {
            details = { error: 'Unknown error' }
          }
        }
        console.error('Error creating coach email-sent notification:', details)
      } else {
        console.log('✅ Coach email-sent notification created successfully')
      }
    } catch (error) {
      console.error('Error notifying coach about email sent:', error)
    }
  }

  async sendWorkoutCompletedNotifications(workoutId: number): Promise<void> {
    try {
      console.log('🔔 NOTIFICATION SERVICE: Processing workout completion notifications for workout:', workoutId)

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )

      // Get workout details
      const workoutPromise = this.supabase
        .from('workouts')
        .select(`
          *,
          program:programs(*)
        `)
        .eq('id', workoutId)
        .single()

      const { data: workout, error: workoutError } = await Promise.race([workoutPromise, timeoutPromise]) as { data: WorkoutData & { program: ProgramData }, error: any }

      if (workoutError || !workout) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch workout:', workoutError)
        return
      }

      // Get user details
      const userPromise = this.supabase
        .from('users')
        .select('*')
        .eq('id', workout.user_id)
        .single()

      const { data: user, error: userError } = await Promise.race([userPromise, timeoutPromise]) as { data: UserData, error: any }

      if (userError || !user) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch user:', userError)
        return
      }

      // Get coach details if this is a user's workout
      let coach: UserData | null = null
      if (user.role === 'user' && workout.program?.coach_id) {
        const coachPromise = this.supabase
          .from('users')
          .select('*')
          .eq('id', workout.program.coach_id)
          .single()

        const { data: coachData, error: coachError } = await Promise.race([coachPromise, timeoutPromise]) as { data: UserData, error: any }

        if (!coachError && coachData) {
          coach = coachData
        }
      }

      // Send notifications based on preferences
      await this.sendWorkoutCompletedNotificationToUser(workout, user)
      
      if (coach) {
        await this.sendWorkoutCompletedNotificationToCoach(workout, user, coach)
      }

    } catch (error) {
      console.error('❌ NOTIFICATION SERVICE: Error processing notifications:', error)
    }
  }

  private async sendWorkoutCompletedNotificationToUser(
    workout: WorkoutData & { program: ProgramData },
    user: UserData
  ): Promise<void> {
    if (!user.workout_completed_email) {
      console.log('🔔 NOTIFICATION SERVICE: User has disabled workout completion emails')
      return
    }

    console.log('📧 NOTIFICATION SERVICE: Sending workout completion email to user:', user.email)

    const emailData = {
      userName: user.name,
      workoutName: workout.name,
      programName: workout.program?.name || 'Unknown Program',
      completedAt: workout.completed_at,
      isCoach: false
    }

    const success = await emailService.sendWorkoutCompletedEmail(emailData, user.email)
    
    if (success) {
      console.log('✅ NOTIFICATION SERVICE: Workout completion email sent to user successfully')
    } else {
      console.error('❌ NOTIFICATION SERVICE: Failed to send workout completion email to user')
    }
  }

  private async sendWorkoutCompletedNotificationToCoach(
    workout: WorkoutData & { program: ProgramData },
    user: UserData,
    coach: UserData
  ): Promise<void> {
    if (!coach.workout_completed_email) {
      console.log('🔔 NOTIFICATION SERVICE: Coach has disabled workout completion emails')
      return
    }

    console.log('📧 NOTIFICATION SERVICE: Sending workout completion email to coach:', coach.email)

    const emailData = {
      userName: coach.name,
      workoutName: workout.name,
      programName: workout.program?.name || 'Unknown Program',
      completedAt: workout.completed_at,
      isCoach: true,
      clientName: user.name
    }

    const success = await emailService.sendWorkoutCompletedEmail(emailData, coach.email)
    
    if (success) {
      console.log('✅ NOTIFICATION SERVICE: Workout completion email sent to coach successfully')
    } else {
      console.error('❌ NOTIFICATION SERVICE: Failed to send workout completion email to coach')
    }
  }

  async sendProgramAssignedNotifications(programId: number): Promise<void> {
    try {
      console.log('🔔 NOTIFICATION SERVICE: Processing program assignment notifications for program:', programId)

      // Get program details
      const { data: program, error: programError } = await this.supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single()

      if (programError || !program) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch program:', programError)
        return
      }

      // Get user details
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', program.user_id)
        .single()

      if (userError || !user) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch user:', userError)
        return
      }

      // Get coach details
      const { data: coach, error: coachError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', program.coach_id)
        .single()

      if (coachError || !coach) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch coach:', coachError)
        return
      }

      // Send notifications based on preferences
      if (user.program_assigned_email) {
        await this.sendProgramAssignedNotificationToUser(program, user, coach)
      }
      
      if (coach.program_assigned_email) {
        await this.sendProgramAssignedNotificationToCoach(program, user, coach)
      }

    } catch (error) {
      console.error('❌ NOTIFICATION SERVICE: Error processing program assignment notifications:', error)
    }
  }

  private async sendProgramAssignedNotificationToUser(
    program: ProgramData,
    user: UserData,
    coach: UserData
  ): Promise<void> {
    console.log('📧 NOTIFICATION SERVICE: Sending program assignment email to user:', user.email)

    const emailData = {
      userName: user.name,
      programName: program.name,
      assignedBy: coach.name,
      isCoach: false
    }

    const success = await emailService.sendProgramAssignedEmail(emailData, user.email)
    
    if (success) {
      console.log('✅ NOTIFICATION SERVICE: Program assignment email sent to user successfully')
    } else {
      console.error('❌ NOTIFICATION SERVICE: Failed to send program assignment email to user')
    }
  }

  private async sendProgramAssignedNotificationToCoach(
    program: ProgramData,
    user: UserData,
    coach: UserData
  ): Promise<void> {
    console.log('📧 NOTIFICATION SERVICE: Sending program assignment email to coach:', coach.email)

    const emailData = {
      userName: coach.name,
      programName: program.name,
      isCoach: true,
      clientName: user.name
    }

    const success = await emailService.sendProgramAssignedEmail(emailData, coach.email)
    
    if (success) {
      console.log('✅ NOTIFICATION SERVICE: Program assignment email sent to coach successfully')
    } else {
      console.error('❌ NOTIFICATION SERVICE: Failed to send program assignment email to coach')
    }
  }

  // Notify coach when user comments on a workout
  async notifyCoachWorkoutComment(
    workoutId: number,
    userId: string,
    coachId: string,
    commentText?: string,
    commentId?: number
  ): Promise<void> {
    try {
      // Get workout details with program_id
      const { data: workout, error: workoutError } = await this.supabase
        .from('workouts')
        .select('name, program_id')
        .eq('id', workoutId)
        .single()

      if (workoutError || !workout) {
        console.error('Error fetching workout details:', workoutError)
        return
      }

      // Get user details
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.error('Error fetching user details:', userError)
        return
      }

      const message = commentText 
        ? `${user.name} commented on your workout "${workout.name}": "${commentText}"`
        : `${user.name} commented on your workout "${workout.name}".`

      // Store workout_id, program_id and optional comment_id in related_id for deep-linking
      const relatedId = commentId
        ? `workout:${workoutId}:program:${workout.program_id}:comment:${commentId}`
        : `workout:${workoutId}:program:${workout.program_id}`

      // Use the API endpoint to create the notification
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          recipientId: coachId,
          title: `New Comment on ${workout.name}`,
          message: message,
          type: "coach_comment",
          relatedId: relatedId,
        }),
      })

      if (!response.ok) {
        let details: unknown = null
        try {
          details = await response.json()
        } catch {
          try {
            details = await response.text()
          } catch {
            details = { error: 'Unknown error' }
          }
        }
        console.error("Error creating coach notification:", details)
      } else {
        console.log("✅ Coach notification created successfully")
      }
    } catch (error) {
      console.error("Error notifying coach about comment:", error)
    }
  }

  // Notify user when coach comments on a workout
  async notifyUserWorkoutComment(
    workoutId: number,
    coachId: string,
    userId: string,
    commentText?: string,
    commentId?: number
  ): Promise<void> {
    try {
      // Get workout details with program_id
      const { data: workout, error: workoutError } = await this.supabase
        .from('workouts')
        .select('name, program_id')
        .eq('id', workoutId)
        .single()

      if (workoutError || !workout) {
        console.error('Error fetching workout details:', workoutError)
        return
      }

      // Get coach details
      const { data: coach, error: coachError } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', coachId)
        .single()

      if (coachError || !coach) {
        console.error('Error fetching coach details:', coachError)
        return
      }

      const message = commentText 
        ? `${coach.name} commented on your workout "${workout.name}": "${commentText}"`
        : `${coach.name} commented on your workout "${workout.name}".`

      // Store workout_id, program_id and optional comment_id in related_id for deep-linking
      const relatedId = commentId
        ? `workout:${workoutId}:program:${workout.program_id}:comment:${commentId}`
        : `workout:${workoutId}:program:${workout.program_id}`

      // Use the API endpoint to create the notification
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          recipientId: userId,
          title: `New Comment from ${coach.name}`,
          message: message,
          type: "user_comment",
          relatedId: relatedId,
        }),
      })

      if (!response.ok) {
        let details: unknown = null
        try {
          details = await response.json()
        } catch {
          try {
            details = await response.text()
          } catch {
            details = { error: 'Unknown error' }
          }
        }
        console.error("Error creating user notification:", details)
      } else {
        console.log("✅ User notification created successfully")
      }
    } catch (error) {
      console.error("Error notifying user about coach comment:", error)
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) {
        console.error("Error deleting notification:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error deleting notification:", error)
      return false
    }
  }
}

export const notificationService = NotificationService.getInstance() 