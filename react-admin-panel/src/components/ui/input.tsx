import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Modern, bold, black and white input style
        "file:text-foreground placeholder:text-muted-foreground selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black",
        "flex h-12 w-full min-w-0 rounded-lg border-2 border-gray-900 dark:border-white bg-white dark:bg-black px-4 py-3 text-base font-semibold text-black dark:text-white shadow-md transition-all outline-none",
        "focus:border-black dark:focus:border-white focus:ring-2 focus:ring-black/60 dark:focus:ring-white/60",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
