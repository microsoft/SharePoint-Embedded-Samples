import * as React from "react"
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>
>(({ children, ...props }, ref) => {
  const safeChildren = React.useMemo(() => {
    if (children == null) return null
    return children
  }, [children])

  return (
    <AspectRatioPrimitive.Root ref={ref} {...props}>
      {safeChildren}
    </AspectRatioPrimitive.Root>
  )
})
AspectRatio.displayName = "AspectRatio"

export { AspectRatio }
