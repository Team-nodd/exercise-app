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

function generateWorkoutEmailHTML(data: {
  userName: string;
  workoutName: string;
  programName: string;
  completedAt: string;
  note?: string;
  workoutType: 'gym' | 'cardio';
}): string {
  const workoutTypeLabel = data.workoutType === 'gym' ? 'Strength Training' : 'Cardio';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Workout Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .workout-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .note-section { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
          .footer { margin: 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .badge { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 Workout Completed!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Great job on completing your workout!</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${data.userName}</strong> has successfully completed their workout session.
            </p>
            
            <div class="workout-details">
              <h2 style="margin-top: 0; color: #667eea;">Workout Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Workout:</td>
                  <td style="padding: 8px 0;">${data.workoutName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Program:</td>
                  <td style="padding: 8px 0;">${data.programName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Type:</td>
                  <td style="padding: 8px 0;"><span class="badge">${workoutTypeLabel}</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Completed:</td>
                  <td style="padding: 8px 0;">${new Date(data.completedAt).toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            ${data.note ? `
              <div class="note-section">
                <h3 style="margin-top: 0; color: #1976d2;">Personal Note</h3>
                <p style="margin-bottom: 0; font-style: italic;">"${data.note}"</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #667eea; font-weight: bold;">Keep up the excellent work! 💪</p>
            </div>
          </div>
          
          <div class="footer">
            <p>This email was sent from FitTracker Pro. You can manage your notification settings in your dashboard.</p>
          </div>
        </div>
      </body>
    </html>
  `;
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
