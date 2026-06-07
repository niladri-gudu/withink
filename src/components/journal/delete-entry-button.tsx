"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";

export function DeleteEntryButton({
  date,
  onSuccess,
}: {
  date: string;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${date}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Entry deleted");

      if (onSuccess) onSuccess();
      router.refresh();
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto rounded-full font-bold tracking-tight px-6 py-5 border border-border/40 hover:bg-red-500 hover:text-white transition-all group/btn"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 group-hover/btn:-rotate-12 transition-transform" />
              <span className="text-[10px] font-mono uppercase tracking-widest">
                Delete
              </span>
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="rounded-3xl border-border/40 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="tracking-tight font-black">Delete entry?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            This will permanently delete this journal entry. This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-full font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-500 text-white hover:bg-red-600 rounded-full font-bold"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
