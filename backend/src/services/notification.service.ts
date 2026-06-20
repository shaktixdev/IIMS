import nodemailer from "nodemailer";

export async function sendEmailNotification(to: string, subject: string, htmlContent: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  console.log(`[Notification Service] Attempting to send email to: ${to} | Subject: ${subject}`);

  // Fallback to console logging if SMTP settings are not configured
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.log("------------------ MOCK EMAIL START ------------------");
    console.log(`To: ${to}`);
    console.log(`From: ${EMAIL_FROM || "no-reply@company.com"}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${htmlContent.replace(/<[^>]*>/g, " ")}`);
    console.log("------------------- MOCK EMAIL END -------------------");
    return { success: true, mock: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM || `"IIMS Notifications" <${SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`[Notification Service] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Notification Service] Error sending email:", error);
    // Return success false but do not crash the app
    return { success: false, error };
  }
}

// Pre-defined templates for notifications
export const emailTemplates = {
  lowStock: (itemName: string, sku: string, currentQty: number, minLevel: number, warehouseName: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #d32f2f;">⚠️ Low Stock Alert</h2>
      <p>The following item has fallen below its minimum stock level threshold:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${itemName}</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">SKU</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${sku}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Warehouse</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${warehouseName}</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Current Qty</th>
          <td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">${currentQty}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Min Threshold</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${minLevel}</td>
        </tr>
      </table>
      <p style="margin-top: 20px;">Please initiate a procurement request to replenish the stock as soon as possible.</p>
      <div style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated notification from the Industrial Inventory Management System (IIMS).
      </div>
    </div>
  `,
  poOverdue: (poNumber: string, vendorName: string, expectedDate: string, amount: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #e65100;">⏳ Overdue Purchase Order Alert</h2>
      <p>The following Purchase Order is overdue for delivery:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">PO Number</th>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${poNumber}</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Vendor</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${vendorName}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Expected Delivery</th>
          <td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">${expectedDate}</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Grand Total</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${amount}</td>
        </tr>
      </table>
      <p style="margin-top: 20px;">Please follow up with the vendor to verify delivery status or update the expected delivery date.</p>
      <div style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated notification from the Industrial Inventory Management System (IIMS).
      </div>
    </div>
  `,
  expiryWarning: (itemName: string, sku: string, batchNumber: string, expiryDate: string, currentQty: number, daysLeft: number) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #ef6c00;">📅 Batch Expiry Warning</h2>
      <p>The following batch is nearing its expiration date:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${itemName} (${sku})</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Batch Number</th>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${batchNumber}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Expiration Date</th>
          <td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">${expiryDate} (${daysLeft} days remaining)</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Current Stock</th>
          <td style="padding: 10px; border: 1px solid #ddd;">${currentQty} pcs</td>
        </tr>
      </table>
      <p style="margin-top: 20px;">Please ensure these items are issued first (FEFO) or return/dispose of expired materials.</p>
      <div style="margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px;">
        This is an automated notification from the Industrial Inventory Management System (IIMS).
      </div>
    </div>
  `
};
