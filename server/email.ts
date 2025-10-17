import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY as string);

export async function sendVerificationEmail(to: string, otp: string) {
  const appName = process.env.APP_NAME || 'The360 Insights';
  const subject = `${appName}: Verify your email`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Verify your email</h2>
      <p>Use the following one-time code to verify your email address:</p>
      <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not create an account, you can ignore this email.</p>
    </div>
  `;

  await resend.emails.send({
    from: process.env.MAIL_FROM || 'no-reply@the360insights.app',
    to,
    subject,
    html,
  });
}
