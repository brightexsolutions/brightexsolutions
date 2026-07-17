import { redirect } from "next/navigation";

// The dedicated "Book a Call" page has been folded into the unified /contact
// intent stepper (Book a Consultation | General Inquiry | Specific Service).
// This redirect keeps existing links/bookmarks to /book working.
export default function BookPage() {
  redirect("/contact?intent=book_call");
}
