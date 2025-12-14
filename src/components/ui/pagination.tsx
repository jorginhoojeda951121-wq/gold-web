import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
  href?: string
  to?: string
  onClick?: (e: React.MouseEvent) => void
} & Pick<ButtonProps, "size"> &
  Omit<React.ComponentProps<"a">, "href" | "onClick">

const PaginationLink = React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  PaginationLinkProps
>(({
  className,
  isActive,
  size = "icon",
  href,
  to,
  onClick,
  ...props
}, ref) => {
  const navigate = useNavigate()
  
  const handleClick = (e: React.MouseEvent) => {
    // If custom onClick is provided, call it (don't prevent default, let it handle)
    if (onClick) {
      onClick(e)
      return
    }
    
    // If to or href is provided, use React Router navigation instead of full page reload
    const target = to || href || (props as any).href
    if (target) {
      e.preventDefault()
      navigate(target)
    }
  }
  
  // If to or href is provided, use React Router Link
  const linkTarget = to || href || (props as any).href
  if (linkTarget) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={linkTarget}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          buttonVariants({
            variant: isActive ? "outline" : "ghost",
            size,
          }),
          className
        )}
        onClick={handleClick}
        {...(props as any)}
      />
    )
  }
  
  // Otherwise, use button with onClick handler
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      onClick={handleClick}
      {...(props as any)}
    />
  )
})
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
