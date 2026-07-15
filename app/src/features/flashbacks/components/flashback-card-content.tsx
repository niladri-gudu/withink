"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEncryption } from "@/providers/encryption-provider";
import { safeDecryptText } from "@/lib/crypto-client";

interface FlashbackCardContentProps {
  initialContentText: string;
  entryDate: string;
  today: string;
}

export function FlashbackCardContent({ initialContentText, entryDate, today }: FlashbackCardContentProps) {
  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedText, setDecryptedText] = React.useState<string | null>(null);

  React.useEffect(() => {
    const decrypt = async () => {
      if (isClientEncrypted && masterKey && initialContentText && initialContentText.includes(":")) {
        const dec = await safeDecryptText(initialContentText, masterKey);
        setDecryptedText(dec);
      } else {
        setDecryptedText(initialContentText || "");
      }
    };
    decrypt();
  }, [initialContentText, isClientEncrypted, masterKey]);

  if (decryptedText === null) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const snippet = decryptedText.length > 220
    ? decryptedText.substring(0, 220) + "..."
    : decryptedText || "This entry is waiting for your next reflection.";

  return (
    <div className="space-y-4">
      <p className="text-sm font-serif text-muted-foreground leading-relaxed italic">
        {snippet}
      </p>
      <Button asChild variant="link" className="p-0 text-primary hover:text-primary/80 h-auto cursor-pointer text-xs font-bold font-mono uppercase tracking-widest gap-1">
        <Link href={`${ROUTES.APP.ENTRY(entryDate)}?today=${today}` as any}>
          Re-read Entry
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
