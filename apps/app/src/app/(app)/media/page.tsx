import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { getRequestSession } from "@/lib/request-cache";
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
    <div className="animate-in fade-in mx-auto w-full max-w-5xl flex-grow space-y-8 p-6 duration-300 md:p-10">
      <header className="space-y-1">
        <span className="text-muted-foreground/60 block font-mono text-[10px] tracking-[0.25em] uppercase">
          Attachment Library • Photos
        </span>
        <h1 className="text-foreground font-serif text-3xl leading-none font-bold tracking-tight sm:text-4xl">
          Memory{" "}
          <span className="text-primary mt-1 block pl-1 text-4xl font-light italic sm:mt-0 sm:inline sm:text-5xl">
            gallery.
          </span>
        </h1>
        <p className="text-body-small text-muted-foreground mt-1">
          Revisit and manage all pictures attached to your entries
        </p>
      </header>

      <MediaGallery />
    </div>
  );
}
