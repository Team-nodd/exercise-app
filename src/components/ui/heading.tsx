import * as React from "react"
import { cn } from "@/lib/utils"

export function H1({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-3xl mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight lg:text-3xl mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function H4({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight lg:text-2xl mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

export function H5({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn(
        "scroll-m-20 text-lg font-semibold tracking-tight lg:text-xl mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h5>
  )
}

export function H6({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h6
      className={cn(
        "scroll-m-20 text-base font-semibold tracking-tight lg:text-lg mb-2 mt-2 text-gray-900 dark:text-white",
        className
      )}
      {...props}
    >
      {children}
    </h6>
  )
}

export function P({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "leading-7 [&:not(:first-child)]:mt-2 text-base text-muted-foreground text-gray-600 dark:text-gray-300",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}