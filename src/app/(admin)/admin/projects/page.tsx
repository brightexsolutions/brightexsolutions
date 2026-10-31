import type { Metadata } from "next";
import { ProjectsPageClient } from "./projects-client";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <ProjectsPageClient />;
}
