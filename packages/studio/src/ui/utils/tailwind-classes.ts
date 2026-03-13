/**
 * Shared Tailwind class patterns used across the studio app
 *
 * These constants consolidate frequently repeated Tailwind class combinations
 * to improve maintainability and consistency.
 */

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

/**
 * Standard horizontal flex container with centered items
 * Used 99+ times across 46 files
 */
export const FLEX_CENTER = "flex items-center";

/**
 * Center content both horizontally and vertically
 * Used 51+ times across 27 files
 */
export const FLEX_CENTER_ALL = "flex items-center justify-center";

/**
 * Full-size absolute overlay positioning
 * Used for overlay elements, backgrounds, etc.
 */
export const ABSOLUTE_FULL = "absolute top-0 left-0 w-full h-full";

/**
 * Full size constraint for contained elements
 */
export const SIZE_FULL_CONTAINED = "w-full h-full max-w-full max-h-full";

/**
 * Square aspect ratio container
 */
export const ASPECT_SQUARE_CONTAINER = "aspect-square relative w-full";

// ============================================================================
// TYPOGRAPHY PATTERNS
// ============================================================================

/**
 * Standard small UI text sizing (labels, descriptions)
 * Used 26+ times across 24 files
 */
export const TEXT_UI_SM = "text-[13px] font-normal leading-[15px]";

/**
 * Secondary/tertiary text with reduced opacity
 * Used 5+ times across files
 */
export const TEXT_UI_SM_SECONDARY = "text-white/60 text-[13px] font-normal leading-[15px]";

/**
 * Tiny text size for helper text
 */
export const TEXT_UI_XS = "text-[11px] font-normal leading-[13px]";

/**
 * Read-only text display with wrapping and overflow handling
 * Used in component-input, resource-input (8 occurrences)
 */
export const TEXT_READONLY = "pointer-events-none whitespace-pre-wrap w-full text-[11px] font-normal leading-[13px] max-w-full text-white/60";

/**
 * Label text under carousel items with ellipsis
 * Used in slider selector and preset layouts
 */
export const TEXT_CAROUSEL_LABEL = "mt-2 block w-full text-center text-white/60 text-[13px] font-normal leading-[15px] whitespace-nowrap text-ellipsis overflow-hidden px-[3px] transition-colors duration-300 ease-out-quad";

// ============================================================================
// INPUT CONTROL PATTERNS
// ============================================================================

/**
 * Standard height for form input controls (29px)
 * Used in color-input, text-input, number-input, xyz-input, tabbed-selector
 */
export const INPUT_CONTROL_BASE = "w-full h-[29px] flex items-center";

/**
 * Container for action buttons in input controls
 * Used in component-input, resource-input
 */
export const INPUT_ACTION_CONTAINER = "absolute h-[22px] right-1.5 flex gap-[5px]";

// ============================================================================
// BUTTON PATTERNS
// ============================================================================

/**
 * Small circular icon button base (22x22px)
 */
export const ICON_BUTTON_SM = "w-[22px] h-[22px] rounded-[30px] flex items-center justify-center";

/**
 * Glassmorphic button with backdrop blur
 * Used in component-input, resource-input (5 occurrences)
 */
export const GLASSMORPHIC_BUTTON = "cursor-pointer backdrop-blur-[12.5px] w-[22px] h-[22px] rounded-[30px] flex items-center justify-center pointer-events-auto bg-white/30 text-white hover:bg-white/50";

// ============================================================================
// COLOR PATTERNS
// ============================================================================

/**
 * Primary dark background color (used 31+ times across 24 files)
 */
export const BG_DARK_PRIMARY = "bg-studio-dark";

/**
 * Subtle border color with transparency
 */
export const BORDER_SUBTLE = "border-white/10";

/**
 * Standard hover state for interactive controls
 */
export const HOVER_GLASSMORPHIC = "hover:bg-white/50";

// ============================================================================
// BORDER RADIUS PATTERNS
// ============================================================================

/**
 * Standard medium corner rounding (8px)
 * Used 30+ times across 23 files
 */
export const ROUNDED_MD = "rounded-lg";

/**
 * Large pill-shaped rounding (30px)
 */
export const ROUNDED_PILL = "rounded-[30px]";

/**
 * Medium rounded corners (12px) for buttons
 */
export const ROUNDED_BUTTON = "rounded-studio";
