/** Lightweight className joiner used by the current feature carousel.
 * No external packages required. If full shadcn class merging is needed later,
 * replace with clsx + tailwind-merge in this one file.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
