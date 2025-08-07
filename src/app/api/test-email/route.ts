/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
// const nodemailer = require('nodemailer')

export async function GET() {
  try {
    console.log('🧪 EMAIL TEST: Starting email configuration test...');
    
    // Check environment variables
    const requiredVars = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
    };

    console.log('🧪 EMAIL TEST: Checking environment variables...');
    const missing = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.log('❌ EMAIL TEST: Missing environment variables:', missing);
      return NextResponse.json({
        success: false,
        error: `Missing environment variables: ${missing.join(', ')}`,
        config: Object.fromEntries(
          Object.entries(requiredVars).map(([key, value]) => [key, value ? '✅ Set' : '❌ Missing'])
        )
      });
    }

    console.log('🧪 EMAIL TEST: All environment variables present');
    console.log('🧪 EMAIL TEST: Creating transporter...');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Only for development
      }
    });

    console.log('🧪 EMAIL TEST: Testing SMTP connection...');
    
    // Test connection
    await transporter.verify();

    console.log('✅ EMAIL TEST: SMTP connection successful!');

    return NextResponse.json({
      success: true,
      message: 'Email configuration is valid and SMTP connection successful!',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        secure: parseInt(process.env.SMTP_PORT || '587') === 465
      }
    });

  } catch (error: any) {
    console.error('❌ EMAIL TEST: Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
