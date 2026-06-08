import nodemailer from "nodemailer";
import {
  SITE_NAME, SITE_URL,
  BUSINESS_EMAIL, BUSINESS_PHONE, BUSINESS_WHATSAPP,
} from "@/lib/constants";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Re-export for backward-compat with existing API routes
export const ADMIN_EMAIL = BUSINESS_EMAIL;
export const ADMIN_PHONE = BUSINESS_PHONE;
export const ADMIN_WHATSAPP = BUSINESS_WHATSAPP;
export { SITE_NAME, SITE_URL };
