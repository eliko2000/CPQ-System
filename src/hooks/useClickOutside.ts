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
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Call the latest handler via ref (avoids stale closures)
        handlerRef.current();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Empty deps: event listener stays stable, no thrashing

  return ref;
}
