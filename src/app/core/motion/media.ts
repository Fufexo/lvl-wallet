function matches(query: string): boolean | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : null;
}

/**
 * True when the user asked the OS to minimise motion.
 * Environments without `matchMedia` (tests, very old browsers) are treated as reduced-motion.
 */
export function prefersReducedMotion(): boolean {
  return matches('(prefers-reduced-motion: reduce)') ?? true;
}

/** True on devices with a precise pointer (mouse / trackpad). */
export function hasFinePointer(): boolean {
  return matches('(pointer: fine)') ?? false;
}
