import * as React from "react"

type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

// Simple toast implementation without Radix for now
export function useToast() {
  const toast = React.useCallback((props: ToastProps) => {
    // For now, we'll use browser alert - later we can implement a proper toast system
    if (props.variant === "destructive") {
      alert(`Error: ${props.title}${props.description ? ` - ${props.description}` : ""}`)
    } else {
      alert(`${props.title}${props.description ? ` - ${props.description}` : ""}`)
    }
  }, [])

  return { toast }
}
