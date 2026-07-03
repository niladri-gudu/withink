import React from "react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}
