import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Inline SVG placeholders — embedded as data URIs so they never need a
// network request, even when the real image 404s.
// ---------------------------------------------------------------------------

/** A fork-and-plate icon for meals / food items. */
const MEAL_PLACEHOLDER =
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23f5f0eb'/><g fill='%23c9a96e'><circle cx='32' cy='26' r='11' fill='none' stroke='%23c9a96e' stroke-width='2.5'/><rect x='30.75' y='18' width='2.5' height='28' rx='1.25'/><path d='M26 18v8a6 6 0 0 0 4 5.66V46h2.5V18H26z' opacity='.35'/></g><text x='32' y='57' text-anchor='middle' font-size='7' font-family='sans-serif' fill='%23c9a96e'>No image</text></svg>`;

/** A store-front icon for vendors / restaurants. */
const VENDOR_PLACEHOLDER =
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23f5f0eb'/><g fill='none' stroke='%23c9a96e' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><rect x='12' y='30' width='40' height='22' rx='2'/><path d='M8 30l6-14h36l6 14'/><line x1='8' y1='30' x2='56' y2='30'/><rect x='26' y='38' width='12' height='14'/><line x1='32' y1='16' x2='32' y2='12'/></g><text x='32' y='58' text-anchor='middle' font-size='7' font-family='sans-serif' fill='%23c9a96e'>No image</text></svg>`;

/** A user avatar silhouette for profile photos. */
const AVATAR_PLACEHOLDER =
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='32' fill='%23f5f0eb'/><circle cx='32' cy='24' r='11' fill='%23c9a96e'/><ellipse cx='32' cy='54' rx='18' ry='12' fill='%23c9a96e'/></svg>`;

// ---------------------------------------------------------------------------
// Generic photo placeholder (blog covers, kitchen shots, etc.)
// ---------------------------------------------------------------------------
const PHOTO_PLACEHOLDER =
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23f5f0eb'/><g fill='none' stroke='%23c9a96e' stroke-width='2.5'><rect x='10' y='14' width='44' height='36' rx='4'/><circle cx='24' cy='28' r='5'/><path d='M10 38l12-10 10 8 8-6 14 10'/></g></svg>`;

// ---------------------------------------------------------------------------
// Exported helpers so callers don't have to import the constants directly
// ---------------------------------------------------------------------------
export const PLACEHOLDERS = {
  meal: MEAL_PLACEHOLDER,
  vendor: VENDOR_PLACEHOLDER,
  avatar: AVATAR_PLACEHOLDER,
  photo: PHOTO_PLACEHOLDER,
} as const;

export type PlaceholderKind = keyof typeof PLACEHOLDERS;

// ---------------------------------------------------------------------------
// FallbackImage component
// ---------------------------------------------------------------------------

interface FallbackImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  /** Which placeholder to show when the real src fails to load. */
  fallback?: PlaceholderKind | string;
  /** Extra class names for the wrapper div (use when you need aspect-ratio). */
  wrapperClassName?: string;
}

/**
 * Drop-in replacement for `<img>` that shows a tasteful SVG placeholder
 * whenever the real image is missing, 404s, or hasn't loaded yet.
 *
 * Usage:
 *   <FallbackImage src={meal.imageUrl} alt={meal.name} fallback="meal"
 *                  className="w-full h-full object-cover" />
 */
export function FallbackImage({
  src,
  alt,
  fallback = "photo",
  className,
  wrapperClassName,
  ...rest
}: FallbackImageProps) {
  const [errored, setErrored] = useState(false);

  const placeholderSrc =
    fallback in PLACEHOLDERS
      ? PLACEHOLDERS[fallback as PlaceholderKind]
      : fallback;

  const effectiveSrc = !src || errored ? placeholderSrc : src;

  if (wrapperClassName) {
    return (
      <div className={wrapperClassName}>
        <img
          src={effectiveSrc}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          onError={() => setErrored(true)}
          {...rest}
        />
      </div>
    );
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
