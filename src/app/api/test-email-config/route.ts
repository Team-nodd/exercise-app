import { NextRequest, NextResponse } from 'next/server'
import { getEmailConfig } from '@/lib/email/email-config'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API: Testing email configuration...')
    
    // Test environment variables
    const envVars = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
      SMTP_FROM: process.env.SMTP_FROM,
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME
    }

    console.log('🔍 API: Environment variables:', envVars)

    // Try to get email config
    let config
    try {
      config = getEmailConfig()
      console.log('✅ API: Email config loaded successfully')
    } catch (error) {
      console.error('❌ API: Email config error:', error)
      return NextResponse.json(
        { 
          error: 'Email configuration failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          envVars
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email configuration is valid',
        config: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          from: config.from,
          fromName: config.fromName,
          auth: {
            user: config.auth.user,
            pass: '***HIDDEN***'
          }
        },
        envVars
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ API: Test endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 