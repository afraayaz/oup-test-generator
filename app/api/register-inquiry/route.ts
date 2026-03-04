import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userType, name, schoolName, email, contact, region, city, query } = body;

    // Validate required fields
    if (!email || !contact || !region || !city || !query) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (userType === 'individual' && !name) {
      return NextResponse.json(
        { error: 'Name is required for individuals' },
        { status: 400 }
      );
    }

    if (userType === 'school' && !schoolName) {
      return NextResponse.json(
        { error: 'School name is required for schools' },
        { status: 400 }
      );
    }

    // Prepare email content
    const emailSubject = `New ${userType === 'individual' ? 'Individual' : 'School'} Registration Inquiry`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #9333ea 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #4b5563; }
    .value { color: #1f2937; margin-top: 5px; }
    .query-box { background: white; padding: 15px; border-left: 4px solid #9333ea; margin-top: 10px; }
    .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🎓 New Registration Inquiry</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">OUP Test Generator Platform</p>
    </div>
    
    <div class="content">
      <div class="field">
        <div class="label">User Type:</div>
        <div class="value">${userType === 'individual' ? '👤 Individual' : '🏫 School'}</div>
      </div>
      
      ${userType === 'individual' ? `
      <div class="field">
        <div class="label">Full Name:</div>
        <div class="value">${name}</div>
      </div>
      ` : `
      <div class="field">
        <div class="label">School Name:</div>
        <div class="value">${schoolName}</div>
      </div>
      `}
      
      <div class="field">
        <div class="label">📧 Email:</div>
        <div class="value"><a href="mailto:${email}">${email}</a></div>
      </div>
      
      <div class="field">
        <div class="label">📱 Contact Number:</div>
        <div class="value">${contact}</div>
      </div>
      
      <div class="field">
        <div class="label">📍 Location:</div>
        <div class="value">${city}, ${region}</div>
      </div>
      
      <div class="field">
        <div class="label">💬 Query/Message:</div>
        <div class="query-box">${query}</div>
      </div>
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          📅 Submitted: ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0;">OUP Test Generator Platform - Registration System</p>
      <p style="margin: 5px 0 0 0;">This is an automated notification email</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Use nodemailer to send email
    const nodemailer = require('nodemailer');

    // Create transporter using Gmail SMTP
    // Note: You'll need to set up environment variables for email credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'your-app-password',
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"OUP Test Generator" <${process.env.EMAIL_USER || 'noreply@ouptestgenerator.com'}>`,
      to: 'ouppakdigital@gmail.com',
      subject: emailSubject,
      html: emailBody,
      replyTo: email,
    });

    return NextResponse.json(
      { message: 'Registration inquiry submitted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending registration inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to submit registration inquiry' },
      { status: 500 }
    );
  }
}
