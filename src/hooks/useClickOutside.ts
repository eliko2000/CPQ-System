import { useEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);

  // Always keep the handler ref up to date with the latest handler
  // This ensures we call the latest version without re-registering event listeners
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Ignore clicks inside the ref element
      if (ref.current && ref.current.contains(target)) {
        return;
      }

      // Ignore clicks on Radix UI portals (dropdowns, selects, etc.)
      // Check if the click target is inside a portal
      let element = target as HTMLElement;
      while (element) {
        if (
          element.hasAttribute?.('data-radix-portal') ||
          element.hasAttribute?.('data-radix-popper-content-wrapper')
        ) {
          return; // Don't close if clicking inside a Radix portal
        }
        element = element.parentElement as HTMLElement;
      }

      // Call the latest handler via ref (avoids stale closures)
      handlerRef.current();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Empty deps: event listener stays stable, no thrashing

  return ref;
}
