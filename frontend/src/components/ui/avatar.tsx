import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  className,
  size = "md",
}: {
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] font-bold text-white",
        sizes[size],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
