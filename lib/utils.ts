import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility to merge Tailwind CSS class names with conflict resolution.
 * Combines clsx (conditional class names) with tailwind-merge (dedupe).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

