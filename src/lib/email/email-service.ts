// Email service for sending notifications using SMTP
// Note: This service should only be used on the server-side

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface WorkoutCompletedEmailData {
  userName: string
  workoutName: string
  programName: string
  completedAt: string
  isCoach: boolean
  clientName?: string // Only for coach notifications
}

interface ProgramAssignedEmailData {
  userName: string
  programName: string
  assignedBy?: string // Coach name if assigned by coach
  isCoach: boolean
  clientName?: string // Only for coach notifications
}

export class EmailService {
  private static instance: EmailService

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendWorkoutCompletedEmail(data: WorkoutCompletedEmailData, recipientEmail: string): Promise<boolean> {
    const subject = data.isCoach 
      ? `Workout Completed: ${data.clientName} completed ${data.workoutName}`
      : `Workout Completed: ${data.workoutName}`

    const html = this.generateWorkoutCompletedEmailHTML(data)
    const text = this.generateWorkoutCompletedEmailText(data)

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      
    })
  }

  async sendProgramAssignedEmail(data: ProgramAssignedEmailData, recipientEmail: string): Promise<boolean> {
    const subject = data.isCoach
      ? `Program Assigned: New program assigned to ${data.clientName}`
      : `Program Assigned: ${data.programName}`

    const html = this.generateProgramAssignedEmailHTML(data)
    const text = this.generateProgramAssignedEmailText(data)

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text
    })
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('📧 EMAIL SERVICE: Sending email:', {
        to: options.to,
        subject: options.subject
      })

      // Send email via API route (server-side only)
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ EMAIL SERVICE: Failed to send email:', error)
        return false
      }

      console.log('✅ EMAIL SERVICE: Email sent successfully')
      return true

    } catch (error) {
      console.error('❌ EMAIL SERVICE: Failed to send email:', error)
      return false
    }
  }

  private generateWorkoutCompletedEmailHTML(data: WorkoutCompletedEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Workout Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">🎉 Workout Completed!</h1>
            
            ${data.isCoach ? `
              <p><strong>${data.clientName}</strong> has completed their workout!</p>
            ` : `
              <p>Great job! You've completed your workout.</p>
            `}
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Workout Details</h2>
              <p><strong>Workout:</strong> ${data.workoutName}</p>
              <p><strong>Program:</strong> ${data.programName}</p>
              <p><strong>Completed:</strong> ${new Date(data.completedAt).toLocaleString()}</p>
            </div>
            
            <p>Keep up the great work! 💪</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This email was sent from FitTracker Pro. 
              You can manage your notification settings in your dashboard.
            </p>
          </div>
        </body>
      </html>
    `
  }

  private generateWorkoutCompletedEmailText(data: WorkoutCompletedEmailData): string {
    return `
🎉 Workout Completed!

${data.isCoach ? `${data.clientName} has completed their workout!` : 'Great job! You\'ve completed your workout.'}

Workout Details:
- Workout: ${data.workoutName}
- Program: ${data.programName}
- Completed: ${new Date(data.completedAt).toLocaleString()}

Keep up the great work! 💪

---
This email was sent from FitTracker Pro. You can manage your notification settings in your dashboard.
    `
  }

  private generateProgramAssignedEmailHTML(data: ProgramAssignedEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Program Assigned</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">📋 New Program Assigned</h1>
            
            ${data.isCoach ? `
              <p>A new program has been assigned to <strong>${data.clientName}</strong>.</p>
            ` : `
              <p>A new program has been assigned to you!</p>
            `}
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Program Details</h2>
              <p><strong>Program:</strong> ${data.programName}</p>
              ${data.assignedBy ? `<p><strong>Assigned by:</strong> ${data.assignedBy}</p>` : ''}
            </div>
            
            <p>Check your dashboard to view the new program and start your training!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This email was sent from FitTracker Pro. 
              You can manage your notification settings in your dashboard.
            </p>
          </div>
        </body>
      </html>
    `
  }

  private generateProgramAssignedEmailText(data: ProgramAssignedEmailData): string {
    return `
📋 New Program Assigned

${data.isCoach ? `A new program has been assigned to ${data.clientName}.` : 'A new program has been assigned to you!'}

Program Details:
- Program: ${data.programName}
${data.assignedBy ? `- Assigned by: ${data.assignedBy}` : ''}

Check your dashboard to view the new program and start your training!

---
This email was sent from FitTracker Pro. You can manage your notification settings in your dashboard.
    `
  }
}

export const emailService = EmailService.getInstance() 