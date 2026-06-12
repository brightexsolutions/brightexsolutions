import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement, JSXElementConstructor } from "react";
import { ProposalPDFDocument, type ProposalData } from "@/components/admin/proposal-pdf";

export type { ProposalData, ScopeItem, ProposalLineItem, PaymentTerms } from "@/components/admin/proposal-pdf";

export async function generateProposalPdf(data: ProposalData): Promise<Buffer> {
  const element = createElement(
    ProposalPDFDocument,
    { data }
  ) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
  return renderToBuffer(element);
}
