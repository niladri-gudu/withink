"use client";

import * as React from "react";

/**
 * SSR-safe matchMedia subscription. Defaults to false on the server and the
 * hydration render, then syncs from the real media query after mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
