import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            // Base futurista + glow no hover
            "relative flex items-center rounded-lg px-3 py-2.5 text-xs text-muted-foreground transition-all duration-200",
            "hover:text-foreground hover:-translate-y-[1px] hover:bg-primary/8",
            "hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_0_24px_rgba(59,130,246,0.18)]",
            "hover:ring-1 hover:ring-primary/25",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:opacity-0 before:transition-opacity before:duration-200",
            "before:bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%)]",
            "hover:before:opacity-100",
            className,
            isActive &&
              cn(
                activeClassName,
                "text-primary bg-primary/10 ring-1 ring-primary/25 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_28px_rgba(59,130,246,0.22)]"
              ),
            isPending && pendingClassName,
          )
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
