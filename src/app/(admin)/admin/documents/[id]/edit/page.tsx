import { DocumentEditor } from "./editor-client";

export const metadata = { title: "Edit document" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentEditor documentId={id} />;
}
