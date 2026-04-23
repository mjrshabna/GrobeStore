import nodemailer from 'nodemailer';

interface EmailConfig {
  user?: string;
  pass?: string;
}

const getTransporter = (config?: EmailConfig) => {
  const user = config?.user || process.env.SMTP_USER;
  const pass = config?.pass || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.error('Email credentials missing:', { 
      hasUser: !!user, 
      hasPass: !!pass,
      configUser: config?.user,
      envUser: !!process.env.SMTP_USER 
    });
    throw new Error('Email credentials missing. Please configure Zoho Email and App Password in Admin Settings.');
  }

  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    // Add timeout and connection settings
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
};

const emailLayout = (title: string, content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #2563eb; padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; }
        .content { padding: 40px; color: #334155; line-height: 1.6; }
        .content h2 { color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px; }
        .footer { background-color: #f1f5f9; padding: 24px 40px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 24px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 24px; }
        .table th { border-bottom: 2px solid #e2e8f0; padding: 12px 8px; text-align: left; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
        .table td { border-bottom: 1px solid #e2e8f0; padding: 16px 8px; color: #334155; }
        .total-row td { font-weight: 700; color: #0f172a; border-bottom: none; padding-top: 24px; font-size: 18px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge-blue { background-color: #dbeafe; color: #1e40af; }
        .badge-green { background-color: #d1fae5; color: #065f46; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-sm { font-size: 14px; }
        .text-muted { color: #64748b; }
        .status-box { margin: 32px 0; padding: 24px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .status-label { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>GROBE</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Grobe Technologies. All rights reserved.</p>
          <p>If you have any questions, simply reply to this email.</p>
        </div>
      </div>
    </body>
  </html>
`;

export const emailTemplates = {
  abandonedCart: (userName: string, cartItems: any[]) => emailLayout(
    "Complete Your Purchase",
    `
      <h2>Hi ${userName},</h2>
      <p>We noticed you left some items in your shopping cart. They are still waiting for you!</p>
      <p style="color: #ef4444; font-weight: 600; font-size: 14px;">Please note: If you don't check out within 24 hours, your reserved items will be automatically released and returned to stock.</p>
      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          ${cartItems.map(item => `
            <tr>
              <td><strong>${item.name || 'Saved Product'}</strong> ${item.quantity > 1 ? `(x${item.quantity})` : ''}</td>
              <td class="text-right">₹${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="text-center">
        <a href="${process.env.APP_URL || 'https://grobe.in'}/cart" class="button">Complete Purchase</a>
      </div>
    `
  ),
  orderConfirmation: (userName: string, orderId: string, items: any[], summary: { 
    totalMrp: number, 
    totalDiscount: number, 
    platformFee: number, 
    shippingCharge: number, 
    total: number 
  }) => emailLayout(
    "Order Confirmation",
    `
      <h2>Hi ${userName},</h2>
      <p>Thank you for your order! We've received your order <strong>#${orderId}</strong> and are getting it ready for you.</p>
      
      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 24px; padding: 24px; background-color: #f8fafc; border-radius: 12px;">
        <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 16px; color: #0f172a;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Total MRP</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">₹${Number(summary.totalMrp).toFixed(2)}</td>
          </tr>
          ${summary.totalDiscount > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #059669;">Offer Discount</td>
            <td style="padding: 8px 0; text-align: right; color: #059669;">-₹${Number(summary.totalDiscount).toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Platform Fee</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">₹${Number(summary.platformFee).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Shipping Charge</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a;">₹${Number(summary.shippingCharge).toFixed(2)}</td>
          </tr>
          <tr style="border-top: 2px solid #e2e8f0;">
            <td style="padding: 16px 0 0 0; font-weight: 700; font-size: 18px; color: #0f172a;">Actual Price (Total)</td>
            <td style="padding: 16px 0 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #2563eb;">₹${Number(summary.total).toFixed(2)}</td>
          </tr>
          ${summary.totalDiscount > 0 ? `
          <tr>
            <td colspan="2" style="padding: 12px 0 0 0; text-align: center; color: #059669; font-weight: 700; font-size: 14px;">
              🎉 You saved ₹${Number(summary.totalDiscount).toFixed(2)} on this order!
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p class="text-sm text-muted" style="margin-top: 32px;">We will send you another email when your order ships.</p>
    `
  ),
  statusUpdate: (userName: string, orderId: string, status: string, paymentStatus: string) => emailLayout(
    "Order Status Update",
    `
      <h2>Hi ${userName},</h2>
      <p>There has been an update to your order <strong>#${orderId}</strong>.</p>
      
      <div class="status-box">
        <div style="margin-bottom: 24px;">
          <span class="status-label">Order Status</span>
          <span class="badge badge-blue">${status}</span>
        </div>
        <div>
          <span class="status-label">Payment Status</span>
          <span class="badge badge-green">${paymentStatus}</span>
        </div>
      </div>

      <p>Thank you for shopping with Grobe Technologies.</p>
    `
  ),
  test: (userName: string) => emailLayout(
    "Test Email",
    `
      <h2>Hi ${userName},</h2>
      <p>This is a test email to verify your email configuration.</p>
      <p>If you received this, your email settings are working correctly.</p>
    `
  ),
  restockNotification: (email: string, productName: string, productId: string) => emailLayout(
    "Product Back in Stock",
    `
      <h2>Great news!</h2>
      <p>The product <strong>${productName}</strong> you were waiting for is back in stock!</p>
      <p>Visit our website to purchase it before it runs out again.</p>
      <div class="text-center">
        <a href="${process.env.APP_URL || 'https://grobe.in'}/product/${productId}" class="button">Shop Now</a>
      </div>
    `
  )
};

export const sendEmail = async (to: string, subject: string, html: string, config?: EmailConfig) => {
  const transporter = getTransporter(config);
  console.log(`Attempting to send email to ${to} with subject: ${subject}`);
  
  // Generate a plain text version from HTML (Spam filters heavily penalize HTML-only emails)
  const textVersion = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags and their content
    .replace(/<[^>]*>?/gm, '\n') // Replace all other HTML tags with newlines
    .replace(/\n\s*\n/g, '\n\n') // Collapse multiple empty lines
    .trim();

  const senderEmail = config?.user || process.env.SMTP_USER;

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const info = await transporter.sendMail({
      from: `"Grobe Technologies" <${senderEmail}>`,
      replyTo: senderEmail,
      to,
      subject,
      text: textVersion, // Add the plain text fallback
      html,
      headers: {
        'X-Priority': '3', // Normal priority
        'X-Mailer': 'Nodemailer'
      }
    });
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};
