import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
export const ADMIN_PHONE = process.env.ADMIN_PHONE!;
export const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP!;
export const SITE_NAME = "Brightex Solutions";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
