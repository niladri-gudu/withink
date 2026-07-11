import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(false);

  useEffect(() => {
    let active = true;

    function onChange(event: MediaQueryListEvent) {
      if (active) {
        setValue(event.matches);
      }
    }

    const result = window.matchMedia(query);
    
    // Asynchronously set initial match to avoid synchronous setState cascading renders
    setTimeout(() => {
      if (active) {
        setValue(result.matches);
      }
    }, 0);

    result.addEventListener("change", onChange);

    return () => {
      active = false;
      result.removeEventListener("change", onChange);
    };
  }, [query]);

  return value;
}
