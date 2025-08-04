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

  async sendWorkoutCompletedNotifications(workoutId: number): Promise<void> {
    try {
      console.log('🔔 NOTIFICATION SERVICE: Processing workout completion notifications for workout:', workoutId)

      // Get workout details
      const { data: workout, error: workoutError } = await this.supabase
        .from('workouts')
        .select(`
          *,
          program:programs(*)
        `)
        .eq('id', workoutId)
        .single()

      if (workoutError || !workout) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch workout:', workoutError)
        return
      }

      // Get user details
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', workout.user_id)
        .single()

      if (userError || !user) {
        console.error('❌ NOTIFICATION SERVICE: Failed to fetch user:', userError)
        return
      }

      // Get coach details if this is a user's workout
      let coach: UserData | null = null
      if (user.role === 'user' && workout.program?.coach_id) {
        const { data: coachData, error: coachError } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', workout.program.coach_id)
          .single()

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
}

export const notificationService = NotificationService.getInstance() 