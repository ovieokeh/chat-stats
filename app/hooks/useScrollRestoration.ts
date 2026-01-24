import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function useScrollRestoration<T extends HTMLElement>(keyPrefix: string = "scroll_pos_") {
  const ref = useRef<T>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!ref.current) return;

    const storageKey = `${keyPrefix}${pathname}`;
    const savedScroll = sessionStorage.getItem(storageKey);

    if (savedScroll) {
      // Small timeout to allow content to render
      requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.scrollTop = parseInt(savedScroll, 10);
        }
      });
    }

    const handleScroll = () => {
      if (ref.current) {
        sessionStorage.setItem(storageKey, ref.current.scrollTop.toString());
      }
    };

    const element = ref.current;
    element.addEventListener("scroll", handleScroll);

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, keyPrefix]);

  return ref;
}
