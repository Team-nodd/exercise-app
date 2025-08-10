/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getEmailConfig } from '@/lib/email/email-config'
import nodemailer from 'nodemailer'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
}

export const runtime = 'nodejs'

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

    // Create transporter with reasonable timeouts; allow relaxed TLS in dev
    let transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : undefined,
    })

    let info
    try {
      // Primary attempt
      info = await transporter.sendMail({
        from: `${config.fromName} <${config.from}>`,
        to,
        subject,
        text: text || '',
        html,
      })
    } catch (primaryError: any) {
      console.error('❌ API: Primary SMTP send failed:', primaryError?.message || primaryError)
      // Fallback: if using SMTPS:465, retry with STARTTLS:587
      const shouldFallback = config.port === 465 || primaryError?.code === 'ETIMEDOUT' || primaryError?.code === 'ECONNECTION'
      if (shouldFallback) {
        try {
          console.log('🔁 API: Retrying with STARTTLS on port 587...')
          transporter = nodemailer.createTransport({
            host: config.host,
            port: 587,
            secure: false,
            auth: {
              user: config.auth.user,
              pass: config.auth.pass,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            tls: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : undefined,
          })
          info = await transporter.sendMail({
            from: `${config.fromName} <${config.from}>`,
            to,
            subject,
            text: text || '',
            html,
          })
        } catch (fallbackError: any) {
          console.error('❌ API: Fallback SMTP send failed:', fallbackError?.message || fallbackError)
          const errMsg = fallbackError?.message || primaryError?.message || 'Failed to send email'
          return NextResponse.json(
            { error: 'Failed to send email', details: errMsg },
            { status: 500 }
          )
        }
      } else {
        const errMsg = primaryError?.message || 'Failed to send email'
        return NextResponse.json(
          { error: 'Failed to send email', details: errMsg },
          { status: 500 }
        )
      }
    }

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