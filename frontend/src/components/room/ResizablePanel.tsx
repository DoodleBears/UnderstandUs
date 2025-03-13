'use client'

import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ResizablePanel({
  children,
  className,
  style,
}: ResizablePanelProps) {
  return (
    <div className={cn('bg-background h-full', className)} style={style}>
      {children}
    </div>
  )
}
