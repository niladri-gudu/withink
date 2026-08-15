import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
import { PageHeader } from "@/features/app-shell/components/page-header";
import { MediaGallery } from "@/features/media/components/media-gallery";
import { getMediaLibraryAndStats } from "@/features/media/services/media-service";

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

  // Server-feed the gallery so navigation to /media doesn't wait on two
  // client-side server actions after mount. The R2 listing is one call.
  const { files, stats } = await getMediaLibraryAndStats(session.user.id);

  return (
    <div className="animate-in fade-in w-full space-y-8 duration-300">
      <PageHeader
        runningHead="Media"
        note="keepsakes pressed between the pages"
        title="Memory"
        accent="gallery."
        description="Revisit and manage all pictures attached to your entries"
      />

      <MediaGallery initialFiles={files} initialStats={stats} />
    </div>
  );
}
