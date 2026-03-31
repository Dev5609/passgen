import { cn } from "@/lib/utils";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("font-headline text-2xl font-bold text-primary", className)}>
      PassGen
    </div>
  );
}
