import React from "react";
import { Button } from "@/app/components/ui/Button";

interface QuickActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export function QuickActionButton({
  label,
  icon,
  variant = "secondary",
  className = "",
}: QuickActionButtonProps) {
  return (
    <Button
      variant={variant}
      className={`w-full justify-start gap-2 ${className}`}
    >
      {icon}
      {label}
    </Button>
  );
}
