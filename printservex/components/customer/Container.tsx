import { cn } from "@/lib/cn";

// Same page width and side padding as the header: 16px on phones, 1280px max on desktop
export function Container({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-8", className)} {...rest} />;
}
