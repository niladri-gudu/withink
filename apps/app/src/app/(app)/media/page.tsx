import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { MediaGallery } from "@/features/media/components/media-gallery";

export const metadata: Metadata = {
  title: "Memory Gallery",
  description:
    "Browse, view, and manage all your journal images and attachments.",
};

export default async function MediaPage() {
  const session = await getRequestSession();

  if (!session) {
    redirect(ROUTES.AUTH.LOGIN);
  }

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Media"
        note="keepsakes pressed between the pages"
        title="Memory"
        accent="gallery."
        description="Revisit and manage all pictures attached to your entries"
      />

      <MediaGallery />
    </div>
  );
}
