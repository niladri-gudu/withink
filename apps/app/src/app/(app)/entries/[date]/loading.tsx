import { EditorSkeleton } from "@/features/journal/components/editor-skeleton";

export default function EntryEditorLoading() {
  // Mirrors the fullscreen editor surface (see EditorSkeleton) so the
  // loading state occupies the exact same footprint as the loaded route.
  return <EditorSkeleton />;
}
