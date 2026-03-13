# Studio UI Components

This directory contains all UI components, utilities, and styles for the Studio application.

## Directory Structure

```
ui/
├── components/          # Reusable UI components (29 files)
│   ├── gui/controls/    # Form controls (23 files)
│   └── content-tab/     # Content tab components (7 files)
├── modals/              # Modal dialogs (3 files)
├── custom-select/       # Custom select components (4 files)
└── utils/
    └── scss/            # Global SCSS utilities (5 files)
```

## Styling

Components use Tailwind CSS. See the design token mapping below for consistent styling.

---

## Design Tokens

### Colors

#### Background
| Token | Value | Usage |
|-------|-------|-------|
| `bg-studio-black` | `#060606` | Darkest background |
| `bg-studio-darker` | `#121212` | Dark background |
| `bg-studio-dark` | `#202020` | Primary dark background |
| `bg-studio-gray-darker` | `#2c2c2c` | Secondary background |
| `bg-studio-gray-dark` | `#353535` | Tertiary/hover background |
| `bg-studio-gray` | `#4d4d4d` | Lighter background |

#### Text
| Token | Value | Usage |
|-------|-------|-------|
| `text-white` | `#ffffff` | Primary text |
| `text-white/60` | `rgba(255,255,255,0.6)` | Secondary/muted text |
| `text-white/40` | `rgba(255,255,255,0.4)` | Placeholder text |
| `text-white/20` | `rgba(255,255,255,0.2)` | Disabled text |

#### Border
| Token | Value | Usage |
|-------|-------|-------|
| `border-[#292929]` | `#292929` | Standard borders |
| `border-[#898989]` | `#898989` | Active borders |
| `border-[#a7a7a7]` | `#a7a7a7` | Focus borders |
| `border-white/40` | `rgba(255,255,255,0.4)` | Hover borders |

#### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `from-[#5564d7]` | `#5564d7` | Gradient start |
| `to-[#8c70ff]` | `#8c70ff` | Gradient end |

### Spacing

Use Tailwind's default scale where possible:

| Size | Tailwind | Pixel |
|------|----------|-------|
| 0.5 | `p-0.5` | 2px |
| 1 | `p-1` | 4px |
| 1.5 | `p-1.5` | 6px |
| 2 | `p-2` | 8px |
| 2.5 | `p-2.5` | 10px |
| 3 | `p-3` | 12px |
| 4 | `p-4` | 16px |
| 5 | `p-5` | 20px |

### Border Radius

| Tailwind | Pixel | Usage |
|----------|-------|-------|
| `rounded` | 4px | Small inputs |
| `rounded-md` | 6px | Cards |
| `rounded-lg` | 8px | Inputs |
| `rounded-xl` | 12px | Buttons, cards |
| `rounded-full` | 50% | Icons, circular buttons |

### Typography

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-[11px] leading-[13px]` | 11px | 13px | Small labels |
| `text-xs` | 12px | 14px | Buttons, small text |
| `text-[13px] leading-[15px]` | 13px | 15px | Body text, inputs |
| `text-[15px] leading-[17px]` | 15px | 17px | Button labels |

### Breakpoints

| Prefix | Min Width | Usage |
|--------|-----------|-------|
| `lg:` | 1025px | Desktop |
| `max-lg:` | < 1025px | Tablet/mobile |
| `max-sm:` | < 668px | Phone |

---

## Component Categories

### Leaf Components
Simple components with no children:
- Controls: `button`, `checkbox`, `text-input`, `number-input`, `color-input`
- UI elements: `tag`, `no-result`, `studio-button`
- Small: `add-button`, `label`, `default-option`

### Parent Components
Components containing child components:
- `asset-card` - contains buttons, inputs
- `content-tab` - contains filters, categories, grids
- `custom-select` - contains button, options
- `gui/controls/panel` - contains form controls

### Layout Components
- `content-bar` - sidebar layout
- `scrollable-section` - scroll container
- `asset-cards-grid` - grid layout

---

## Utilities

### Truncate Text
```html
<span class="truncate">Long text...</span>
```

### Hidden Scrollbar
```html
<div class="scrollbar-hidden overflow-auto">...</div>
```

### Group Hover
For complex hover states affecting multiple elements:
```html
<div class="group">
  <div class="group-hover:opacity-100">Shows on hover</div>
</div>
```
