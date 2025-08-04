# Email Configuration Setup

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# SMTP Email Configuration
# Choose one of the following configurations based on your email provider:

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
SMTP_FROM_NAME=FitTracker Pro

# Outlook/Hotmail SMTP
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_PORT=587
# SMTP_USER=your_email@outlook.com
# SMTP_PASS=your_password
# SMTP_FROM=your_email@outlook.com
# SMTP_FROM_NAME=FitTracker Pro

# Yahoo SMTP
# SMTP_HOST=smtp.mail.yahoo.com
# SMTP_PORT=587
# SMTP_USER=your_email@yahoo.com
# SMTP_PASS=your_app_password
# SMTP_FROM=your_email@yahoo.com
# SMTP_FROM_NAME=FitTracker Pro

# SendGrid SMTP
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your_sendgrid_api_key
# SMTP_FROM=your_verified_sender@yourdomain.com
# SMTP_FROM_NAME=FitTracker Pro

# Mailgun SMTP
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_USER=your_mailgun_username
# SMTP_PASS=your_mailgun_password
# SMTP_FROM=your_verified_sender@yourdomain.com
# SMTP_FROM_NAME=FitTracker Pro

# Resend SMTP
# SMTP_HOST=smtp.resend.com
# SMTP_PORT=587
# SMTP_USER=resend
# SMTP_PASS=your_resend_api_key
# SMTP_FROM=your_verified_sender@yourdomain.com
# SMTP_FROM_NAME=FitTracker Pro

# Custom SMTP Server
# SMTP_HOST=your_smtp_server.com
# SMTP_PORT=587
# SMTP_USER=your_username
# SMTP_PASS=your_password
# SMTP_FROM=your_email@yourdomain.com
# SMTP_FROM_NAME=FitTracker Pro
```

## Setup Instructions

### 1. Install Nodemailer

```bash
npm install nodemailer @types/nodemailer
```

### 2. Configure Your Email Provider

#### Gmail

- Enable 2-factor authentication
- Generate an App Password
- Use the App Password as `SMTP_PASS`

#### Outlook/Hotmail

- Use your regular password
- May need to enable "Less secure app access"

#### SendGrid

- Create a SendGrid account
- Verify your sender email
- Use API key as `SMTP_PASS`
- Use `apikey` as `SMTP_USER`

#### Mailgun

- Create a Mailgun account
- Verify your domain
- Use your Mailgun credentials

#### Resend

- Create a Resend account
- Verify your domain
- Use API key as `SMTP_PASS`
- Use `resend` as `SMTP_USER`

### 3. Enable Email Sending

Uncomment the nodemailer code in `/src/app/api/send-email/route.ts`:

```typescript
// Remove the comment markers /* and */ around the nodemailer code
import nodemailer from "nodemailer";

// Create transporter
const transporter = nodemailer.createTransporter({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: {
    user: config.auth.user,
    pass: config.auth.pass,
  },
});

// Send email
const info = await transporter.sendMail({
  from: `${fromName} <${from}>`,
  to,
  subject,
  text: text || "",
  html,
});
```

### 4. Test Email Sending

1. Set up your environment variables
2. Complete a workout to trigger notifications
3. Check the console logs for email sending status
4. Verify emails are received

## Security Notes

- Never commit your `.env.local` file to version control
- Use App Passwords for Gmail instead of your main password
- Consider using environment-specific configurations for production
