import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { AgreementPDFDocument } from "@/components/admin/agreement-pdf";
import type { AgreementData } from "@/lib/document-types";

export async function generateAgreementPdf(data: AgreementData): Promise<Buffer> {
  const element = createElement(
    AgreementPDFDocument,
    { data }
  ) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  return renderToBuffer(element);
}
