import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { EntitlementsService } from "@/features/billing/services/entitlements-service";
import {
  NotebooksService,
} from "@/features/notebooks/services/notebook-service";
import { NotebooksShell } from "@/features/notebooks/components/notebooks-shell";
import { getRequestSession } from "@/lib/request-cache";

export const metadata: Metadata = {
  title: "Notebooks",
  description: "Keep each part of your life in its own notebook.",
};

export default async function NotebooksPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  // Bootstrap runs lazily here: first visit creates the default notebook and
  // files any pre-notebooks entries into it.
  const [notebooks, entitlements] = await Promise.all([
    NotebooksService.listNotebooks(session.user.id),
    EntitlementsService.getEntitlements(session.user.id),
  ]);

  return (
    <NotebooksShell
      initialNotebooks={notebooks}
      limit={entitlements.notebookLimit}
      plan={entitlements.plan}
    />
  );
}
