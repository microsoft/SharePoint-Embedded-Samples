import React from 'react';
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const CustomDrawer = ({ shouldScaleBackground = false, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
CustomDrawer.displayName = "CustomDrawer";

const CustomDrawerTrigger = DrawerPrimitive.Trigger;
const CustomDrawerPortal = DrawerPrimitive.Portal;
const CustomDrawerClose = DrawerPrimitive.Close;

const CustomDrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-transparent", className)} {...props} />
));
CustomDrawerOverlay.displayName = "CustomDrawerOverlay";

const CustomDrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <CustomDrawerPortal>
    <CustomDrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn("fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background", className)}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {/* Make sure every drawer has at least a visually hidden title for screen readers */}
      {!React.Children.toArray(children).some((child) => React.isValidElement(child) && child.type === CustomDrawerTitle) && (
        <VisuallyHidden>
          <DrawerPrimitive.Title>Drawer</DrawerPrimitive.Title>
        </VisuallyHidden>
      )}
      {children}
    </DrawerPrimitive.Content>
  </CustomDrawerPortal>
));
CustomDrawerContent.displayName = "CustomDrawerContent";

const CustomDrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
CustomDrawerTitle.displayName = "CustomDrawerTitle";

export { CustomDrawer, CustomDrawerTrigger, CustomDrawerContent, CustomDrawerClose, CustomDrawerOverlay, CustomDrawerPortal, CustomDrawerTitle };
