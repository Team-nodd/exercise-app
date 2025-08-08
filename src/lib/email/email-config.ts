// Email configuration using environment variables
export interface EmailConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for other ports
  auth: {
    user: string
    pass: string
  }
  from: string
  fromName: string
}

export function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM
  const fromName = process.env.SMTP_FROM_NAME || 'FitTracker Pro'

  if (!host || !user || !pass || !from) {
    throw new Error('Missing required SMTP environment variables. Please check your .env file.')
  }

  return {
    host,
    port,
    // Prefer STARTTLS (587) in dev; SMTPS (465) in prod only when explicitly set
    secure: port === 465,
    auth: {
      user,
      pass
    },
    from,
    fromName
  }
}


// Helper function to get SMTP config for a specific provider
