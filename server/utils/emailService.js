const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Sends OTP verification email.
 * Falls back to console log if email is not configured (for development).
 */
async function sendOTPEmail(toEmail, otp) {
  // If email credentials are not set, log OTP to console (dev mode)
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_gmail')) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║        📧 DEV MODE – OTP CODE        ║');
    console.log(`║  Email : ${toEmail.padEnd(28)}║`);
    console.log(`║  OTP   : ${otp.padEnd(28)}║`);
    console.log('║  (configure .env for real emails)    ║');
    console.log('╚══════════════════════════════════════╝\n');
    return; // skip actual email send
  }

  const mailOptions = {
    from: `"SyncItUp" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Your SyncItUp Verification Code',
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#eff6ff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">SyncItUp</h1>
          <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Find Your Perfect Hackathon Teammate</p>
        </div>
        <div style="padding:32px;background:white;">
          <h2 style="color:#1e293b;margin:0 0 12px;">Verify Your Email</h2>
          <p style="color:#475569;font-size:15px;">Your OTP expires in <strong>5 minutes</strong>.</p>
          <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;text-align:center;padding:24px;margin:24px 0;">
            <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#2563eb;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;">If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail };
