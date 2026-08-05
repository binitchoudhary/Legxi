import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465', 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const getFrom = () => process.env.SMTP_FROM || 'no-reply@legxi.co';
const getOpsEmail = () => process.env.OPERATIONS_EMAIL || 'ops@legxi.co';

export const sendTransferRequestNotification = async ({ certificateId, editionNumber, currentOwnerName, newOwnerName }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: getFrom(),
      to: getOpsEmail(),
      subject: `New Transfer Request: Certificate ${certificateId}`,
      html: `
        <h2>New Ownership Transfer Request</h2>
        <p>A new transfer request is pending review.</p>
        <ul>
          <li><strong>Certificate ID:</strong> ${certificateId}</li>
          <li><strong>Edition:</strong> ${editionNumber}</li>
          <li><strong>Current Owner:</strong> ${currentOwnerName}</li>
          <li><strong>New Owner:</strong> ${newOwnerName}</li>
        </ul>
        <p>Please review this in the Admin Panel.</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const sendCustomerAcknowledgement = async ({ email, certificateId, name }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: getFrom(),
      to: email,
      subject: `Transfer Request Received: Certificate ${certificateId}`,
      html: `
        <p>Hi ${name},</p>
        <p>We have successfully received your transfer request for Certificate <strong>${certificateId}</strong>.</p>
        <p>Our operations team will review your request and notify you once it has been processed.</p>
        <br/>
        <p>Thank you,<br/>LEGXI Team</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const sendTransferApprovedNotification = async ({ oldOwnerEmail, newOwnerEmail, certificateId, editionNumber }) => {
  try {
    const transporter = createTransporter();
    
    // Notify old owner
    if (oldOwnerEmail) {
      await transporter.sendMail({
        from: getFrom(),
        to: oldOwnerEmail,
        subject: `Transfer Approved: Certificate ${certificateId}`,
        html: `
          <p>Hello,</p>
          <p>Your transfer request for Certificate <strong>${certificateId}</strong> (Edition ${editionNumber}) has been approved.</p>
          <p>This certificate has been successfully transferred to the new owner.</p>
        `,
      });
    }

    // Notify new owner
    if (newOwnerEmail) {
      await transporter.sendMail({
        from: getFrom(),
        to: newOwnerEmail,
        subject: `Certificate Transferred to You: ${certificateId}`,
        html: `
          <p>Hello,</p>
          <p>A new certificate (<strong>${certificateId}</strong>) has been transferred to your ownership.</p>
          <p>You can now log in to the LEGXI Authentication Portal using your registered phone number to view your certificate.</p>
        `,
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const sendTransferRejectedNotification = async ({ email, certificateId, reason }) => {
  try {
    if (!email) return { success: false, error: 'No email provided' };
    const transporter = createTransporter();
    const mailOptions = {
      from: getFrom(),
      to: email,
      subject: `Transfer Rejected: Certificate ${certificateId}`,
      html: `
        <p>Hello,</p>
        <p>Unfortunately, your transfer request for Certificate <strong>${certificateId}</strong> has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions, please contact our support team.</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
