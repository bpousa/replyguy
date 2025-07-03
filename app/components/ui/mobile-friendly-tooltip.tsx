"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/app/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

// Mobile-friendly tooltip that supports both hover and click
const Tooltip = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <TooltipPrimitive.Root 
      open={open} 
      onOpenChange={setOpen}
      delayDuration={0}
      {...props}
    >
      {children}
    </TooltipPrimitive.Root>
  )
}

// Enhanced trigger that handles both hover and click
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onClick, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if inside a form
    e.preventDefault()
    e.stopPropagation()
    onClick?.(e)
  }

  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      onClick={handleClick}
      {...props}
    />
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

// Enhanced content with better mobile positioning
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  // Use portal to prevent layout issues
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[100] overflow-hidden rounded-md bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs text-gray-100 dark:text-gray-900",
          "shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // Add max width for mobile
          "max-w-[calc(100vw-2rem)]",
          className
        )}
        // Prevent tooltip from going off-screen
        collisionPadding={10}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Simple wrapper component for easy usage
interface MobileTooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
}

export function MobileTooltip({ 
  children, 
  content, 
  side = "top", 
  align = "center",
  className 
}: MobileTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }