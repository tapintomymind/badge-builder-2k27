/**
 * Minimal media-query hook. Guarded for environments without matchMedia
 * (jsdom): those report `false` (desktop-shaped default), which keeps
 * component tests deterministic.
 */

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const supported = typeof window !== "undefined" && typeof window.matchMedia === "function";
  const [matches, setMatches] = useState<boolean>(() =>
    supported ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (!supported) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => {
      list.removeEventListener("change", onChange);
    };
  }, [query, supported]);

  return matches;
}
