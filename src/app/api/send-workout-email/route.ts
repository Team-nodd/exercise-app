/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
// import nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer');

interface WorkoutEmailRequest {
  to: string;
  workoutName: string;
  programName: string;
  completedAt: string;
  userName: string;
  note?: string;
  workoutType: 'gym' | 'cardio';
}

// Email configuration function
function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const fromName = process.env.SMTP_FROM_NAME || 'FitTracker Pro';

  console.log('📧 EMAIL CONFIG:', {
    host: host ? '✅' : '❌',
    port,
    user: user ? '✅' : '❌',
    pass: pass ? '✅' : '❌',
    from: from ? '✅' : '❌',
    fromName
  });

  if (!host || !user || !pass || !from) {
    throw new Error(`Missing required SMTP environment variables. Missing: ${[
      !host && 'SMTP_HOST',
      !user && 'SMTP_USER', 
      !pass && 'SMTP_PASS',
      !from && 'SMTP_FROM'
    ].filter(Boolean).join(', ')}`);
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
    fromName
  };
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('📧 EMAIL API: Starting email send process...');
    
    const body: WorkoutEmailRequest = await request.json();
    const { to, workoutName, programName, completedAt, userName, note, workoutType } = body;

    console.log('📧 EMAIL API: Request body:', {
      to: to ? '✅' : '❌',
      workoutName,
      userName,
      workoutType
    });

    // Validate required fields
    if (!to || !workoutName || !userName) {
      console.error('❌ EMAIL API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: to, workoutName, userName are required' },
        { status: 400 }
      );
    }

    // Get email configuration
    let emailConfig;
    try {
      emailConfig = getEmailConfig();
    } catch (configError: any) {
      console.error('❌ EMAIL API: Configuration error:', configError.message);
      return NextResponse.json(
        { error: `Email configuration error: ${configError.message}` },
        { status: 500 }
      );
    }

    console.log('📧 EMAIL API: Creating transporter...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      // Add additional options for better compatibility
      tls: {
        rejectUnauthorized: false // Only for development - remove in production
      }
    });

    // Test connection
    try {
      console.log('📧 EMAIL API: Testing connection...');
      await transporter.verify();
      console.log('✅ EMAIL API: SMTP connection verified');
    } catch (verifyError: any) {
      console.error('❌ EMAIL API: SMTP connection failed:', verifyError.message);
      return NextResponse.json(
        { error: `SMTP connection failed: ${verifyError.message}` },
        { status: 500 }
      );
    }

    // Generate email content
    const subject = `Workout Summary: ${workoutName}`

    const html = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif">
      <h2>Workout Summary</h2>
      <p>Sent by: <strong>${userName}</strong></p>
      <p><strong>Workout:</strong> ${workoutName}</p>
      ${programName ? `<p><strong>Program:</strong> ${programName}</p>` : ''}
      <p><strong>Completed:</strong> ${completedAt ? new Date(completedAt).toLocaleString() : '—'}</p>
      ${note ? `<p><em>${note}</em></p>` : ''}
      <p style="color:#64748b;font-size:12px">This summary was sent from FitTracker Pro.</p>
      </body></html>
    `
    const text = generateWorkoutEmailText({
      userName,
      workoutName,
      programName,
      completedAt,
      note,
      workoutType
    });

    console.log('📧 EMAIL API: Sending email...');

    // Send email
    const info = await transporter.sendMail({
      from: `${emailConfig.fromName} <${emailConfig.from}>`,
      to,
      subject,
      html,
      text,
    });

    console.log('✅ EMAIL API: Email sent successfully:', info.messageId);
    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error: any) {
    console.error('❌ EMAIL API: Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


function generateWorkoutEmailText(data: {
  userName: string;
  workoutName: string;
  programName: string;
  completedAt: string;
  note?: string;
  workoutType: 'gym' | 'cardio';
}): string {
  const workoutTypeLabel = data.workoutType === 'gym' ? 'Strength Training' : 'Cardio';
  
  return `
🎉 Workout Completed!

${data.userName} has successfully completed their workout session.

Workout Summary:
- Workout: ${data.workoutName}
- Program: ${data.programName || 'N/A'}
- Type: ${workoutTypeLabel}
- Completed: ${new Date(data.completedAt).toLocaleString()}

${data.note ? `Personal Note: "${data.note}"` : ''}

Keep up the excellent work! 💪

---
This email was sent from FitTracker Pro. You can manage your notification settings in your dashboard.
  `;
}
