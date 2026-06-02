import type { Metadata } from "next";
import { ProjectsPageClient } from "./projects-client";

export const metadata: Metadata = { title: "Projects | Admin" };

export default function ProjectsPage() {
  return <ProjectsPageClient />;
}
