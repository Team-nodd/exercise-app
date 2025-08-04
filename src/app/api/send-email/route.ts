import { NextRequest, NextResponse } from 'next/server'
import { getEmailConfig } from '@/lib/email/email-config'
import nodemailer from 'nodemailer'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()
    const { to, subject, html, text } = body

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      )
    }

    console.log('📧 API: Sending email via SMTP:', {
      to,
      subject
    })

    // Get SMTP configuration (server-side only)
    let config
    try {
      config = getEmailConfig()
    } catch (error) {
      console.error('❌ API: SMTP configuration error:', error)
      return NextResponse.json(
        { 
          error: 'Email service not configured',
          details: error instanceof Error ? error.message : 'Missing SMTP environment variables'
        },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.from}>`,
      to,
      subject,
      text: text || '',
      html,
    })

    console.log('✅ API: Email sent successfully:', info.messageId)

    return NextResponse.json(
      { success: true, message: 'Email sent successfully', messageId: info.messageId },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ API: Failed to send email:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 