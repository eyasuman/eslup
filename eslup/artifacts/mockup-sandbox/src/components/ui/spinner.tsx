import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  ref,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      ref={ref as React.ComponentProps<typeof Loader2Icon>["ref"]}
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
