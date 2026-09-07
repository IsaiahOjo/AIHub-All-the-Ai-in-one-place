/**
 * Generates a logo image URL for an AI tool based on its website domain.
 * Uses Google's favicon service which returns high-resolution favicons.
 */
export function getLogoUrl(websiteUrl: string, logoUrl?: string | null): string {
  if (logoUrl) return logoUrl;

  try {
    const domain = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return '';
  }
}

/**
 * Generates a brand color from a string (tool name) for consistent
 * placeholder backgrounds when logos fail to load.
 */
export function getBrandColor(name: string): string {
  const colors = [
    '#0d9488', // teal
    '#2563eb', // blue
    '#dc2626', // red
    '#ea580c', // orange
    '#7c3aed', // violet
    '#059669', // emerald
    '#db2777', // pink
    '#0891b2', // cyan
    '#ca8a04', // yellow/gold
    '#4f46e5', // indigo
    '#16a34a', // green
    '#9333ea', // purple
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Extracts the first letter of a tool name for fallback display.
 */
export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
