"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useCallback, type ComponentPropsWithoutRef } from "react";

export type NavLinkProps = ComponentPropsWithoutRef<typeof NextLink>;

function hrefToString(href: NavLinkProps["href"]): string {
  if (typeof href === "string") return href;
  const p = href.pathname ?? "";
  const q = href.search ?? "";
  const h = href.hash ?? "";
  return `${p}${q}${h}`;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { href, onClick, replace, scroll = true, ...rest },
  ref,
) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const path = hrefToString(href);
      if (!path || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
        return;
      }

      const tv = document.startViewTransition;
      if (typeof tv !== "function") return;

      e.preventDefault();
      tv(() => {
        if (replace) {
          router.replace(path, { scroll });
        } else {
          router.push(path, { scroll });
        }
      });
    },
    [href, onClick, replace, router, scroll],
  );

  return <NextLink ref={ref} href={href} onClick={handleClick} scroll={scroll} {...rest} />;
});
