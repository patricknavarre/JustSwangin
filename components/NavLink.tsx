"use client";

import NextLink from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

/**
 * Client wrapper around next/link so shell menus can attach onClick handlers
 * (e.g. close &lt;details&gt;). Intentionally does not intercept navigation: wrapping
 * router.push in document.startViewTransition breaks App Router client transitions
 * in common cases (Chrome + Next 14).
 */
export type NavLinkProps = ComponentPropsWithoutRef<typeof NextLink>;

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(props, ref) {
  return <NextLink ref={ref} {...props} />;
});
