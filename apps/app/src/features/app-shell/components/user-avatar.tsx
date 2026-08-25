import NextImage from "next/image";
import { cn } from "@withink/utils";

interface UserAvatarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
  className?: string;
}

/**
 * The writer's mark: their avatar portrait, or a gold seal with their
 * initials when no portrait is set. Shared by the margin rail, the tab bar's
 * More sheet, and any future account surfaces.
 */
export function UserAvatar({ user, className }: UserAvatarProps) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "W";

  if (user?.image) {
    return (
      <NextImage
        src={user.image}
        alt={user.name || "User Avatar"}
        width={40}
        height={40}
        className={cn(
          "border-sidebar-border h-10 w-10 shrink-0 rounded-full border object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-accent text-accent-foreground border-sidebar-border flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
