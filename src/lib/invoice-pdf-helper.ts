import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { InvoicePDFDocument, type InvoicePaymentSettings } from "@/components/admin/invoice-pdf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InvoiceData = any;

/** Generate a PDF buffer for the given invoice. Safe to call from any API route. */
export async function generateInvoicePdf(
  invoice: InvoiceData,
  paymentSettings: InvoicePaymentSettings
): Promise<Buffer> {
  const element = createElement(
    InvoicePDFDocument,
    { invoice, paymentSettings }
  ) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  return renderToBuffer(element);
}

export type { InvoicePaymentSettings };
