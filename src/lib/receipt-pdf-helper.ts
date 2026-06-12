import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { ReceiptPDFDocument, type ReceiptData } from "@/components/admin/receipt-pdf";

export type { ReceiptData };

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const element = createElement(
    ReceiptPDFDocument,
    { data }
  ) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  return renderToBuffer(element);
}
