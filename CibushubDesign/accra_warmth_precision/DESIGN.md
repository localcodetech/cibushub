---
name: Accra Warmth & Precision
colors:
  surface: '#fff8f5'
  surface-dim: '#e9d7c8'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e8'
  surface-container: '#feeadc'
  surface-container-high: '#f8e5d6'
  surface-container-highest: '#f2dfd1'
  on-surface: '#231a11'
  on-surface-variant: '#414943'
  inverse-surface: '#392e25'
  inverse-on-surface: '#ffeee1'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3e6752'
  primary: '#002517'
  on-primary: '#ffffff'
  primary-container: '#123c2a'
  on-primary-container: '#7ca78f'
  inverse-primary: '#a4d0b7'
  secondary: '#7b5900'
  on-secondary: '#ffffff'
  secondary-container: '#fcca66'
  on-secondary-container: '#755400'
  tertiary: '#430900'
  on-tertiary: '#ffffff'
  tertiary-container: '#651a06'
  on-tertiary-container: '#ec7f63'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c0edd2'
  primary-fixed-dim: '#a4d0b7'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#264e3b'
  secondary-fixed: '#ffdea4'
  secondary-fixed-dim: '#f0bf5c'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#7e2b16'
  background: '#fff8f5'
  on-background: '#231a11'
  surface-variant: '#f2dfd1'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
  headline-lg:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Epilogue
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Epilogue
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md-bold:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm-bold:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  price-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  price-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The brand personality is grounded, vibrant, dependable, and deeply rooted in contemporary Accra food culture. It speaks to urban professionals, families, and everyday food enthusiasts who need rapid, reliable ordering while celebrating local pride. The interface balances high-performance utility with cultural dignity, evoking hospitality, speed, and appetite.

The design movement mixes **Modern Tactile Minimalist** with **High-Legibility Functionalism**:
- Natural earthy textures through warm cream and deep forest greens, steering completely clear of synthetic neon purples or cool tech-blue glassmorphism.
- Functional resilience built specifically for outdoor usage under bright West African sunlight, mandating strict contrast, robust physical shapes, and zero translucent blurs.
- Adinkra iconography treated with cultural solemnity as semantic indicators rather than incidental background wallpaper.

## Colors

The palette draws straight from the Ghanaian landscape, trade heritage, and culinary warmth:

- **Primary / Forest Green (`#123C2A`)**: The anchor of trust and authority. Applied to key interactive touchpoints including primary CTA buttons, active tab indicators, app headers, focus rings, and high-priority links.
- **Accent / Ashanti Gold (`#C89B3C`)**: Reserved for value markers, verified ratings, delivery PIN code panels, and premium distinction badges. **Rule:** Must always pair with Cocoa (`#2B2118`) typography on top. Never use white text over Ashanti Gold, and never use Ashanti Gold as a text color over Warm Cream or base background surfaces.
- **Tertiary / Terracotta (`#B9573E`)**: Promotional and urgency accent (e.g., flash sales, combo deal banners). **Strict Limit:** Maximum of one Terracotta element per viewport screen to preserve deliberate visual hierarchy.
- **Base Neutral / Cocoa (`#2B2118`)**: Primary typography and high-contrast icon color across all screens, replacing harsh digital blacks.
- **Muted Neutral (`#6E6458`)**: Secondary labels, vendor category tags, timestamps, and placeholder inputs. Meets WCAG AA against cream surfaces.
- **Canvas / Background (`#FBF8F1`)**: The radiant warm foundational background.
- **Surface / Container (`#F7F0DF`)**: Food item cards, bottom sheet containers, sticky checkout panels, and segmented section wrappers.
- **Border / Divider (`#E6DDCB`)**: Subtle structural dividers and outline containment.
- **Feedback Semantics**:
  - Success: `#1F6B43` (Order delivered, driver arrived, item added)
  - Danger / Error: `#A61B1B` (Payment failed, store closed, validation errors)

## Typography

Typography prioritizes hyper-clarity and legibility during on-the-move outdoor orders in direct sunlight:
- **Headlines & Display:** Set in Epilogue (serving the role of a punchy, contemporary grotesque) across weights 600, 700, and 800. It gives street-level confidence and character to restaurant titles, promotional hooks, and section banners.
- **Body & Interface:** Set in Atkinson Hyperlegible Next across weights 400 and 700. Its differentiated character letterforms prevent misreading addresses, order totals, and street instructions under glare.
- **Currency Standard:** All pricing must follow the standard notation: `GHS 45.00` (uppercase 3-letter ISO code, single space, two decimal points). Prices are typeset in `price-lg` or `price-md` in Atkinson Hyperlegible Next Bold for zero ambiguity.

## Layout & Spacing

A mobile-first 4-column layout that shifts to 8 columns on tablet and 12 columns on desktop web surfaces:
- **Touch Ergonomics:** All interactive buttons, chips, row items, and counter buttons enforce a strict minimum tap target of `44px x 44px` (ideal default CTA height: `48px` to `52px`).
- **Mobile Margins:** Standard canvas gutters and outer margins sit at `16px` (`1rem`) to maximize viewable screen space for dish items and descriptions.
- **Sticky Zones:** Bottom navigation, floating cart bars, and order tracker sheets feature clean structural top-borders (`#E6DDCB`) and anchor directly to safe area boundaries without floating or fake status-bar styling.
- **Breakpoints:**
  - Mobile: `< 640px` (Single column feeds, full-width bottom sheets)
  - Tablet: `640px - 1024px` (2-column restaurant grids, persistent mini-cart)
  - Desktop: `> 1024px` (3 to 4-column restaurant grids, sticky 360px sidebar cart)

## Elevation & Depth

To guarantee usability in outdoor midday sun and preserve clean performance, this system completely abandons blur-heavy glassmorphism, muddy ambient drop shadows, and fake device status bars. Depth is created purely through **tactile tonal layering and low-contrast outlines**:

- **Ground Level (Canvas):** `#FBF8F1` serves as the canvas floor.
- **Level 1 (Card & Row Surface):** `#F7F0DF` (Warm Cream) with a hairline solid border: `1px solid #E6DDCB`. No box-shadow needed.
- **Level 2 (Active Sheets & Sticky Bars):** Background `#F7F0DF` elevated using a crisp physical offset shadow tinted with natural Cocoa tone: `box-shadow: 0 4px 16px -2px rgba(43, 33, 24, 0.08)`, combined with a `1px solid #E6DDCB` border.
- **Level 3 (Modals & Delivery Overlays):** Background `#FBF8F1` or `#F7F0DF` with an overlay backdrop of `rgba(43, 33, 24, 0.60)` (Cocoa overlay, never blue-black) and an elevation shadow: `box-shadow: 0 12px 32px -4px rgba(43, 33, 24, 0.16)`.

## Shapes

The geometric framework establishes clear category-specific radiuses:
- **Food Photography & Media Banners:** `16px` (`rounded-2xl`). Smooth corners soften the dense dish photography and make food cards welcoming.
- **Bottom Sheets & Slide-up Drawers:** `20px` top radius (`rounded-t-[20px]`, `rounded-b-none`).
- **Interactive Input Fields & Containers / Cards:** `12px` (`rounded-xl`).
- **Buttons (Primary, Secondary, Tertiary):** `10px` (`rounded-[10px]`). Balances structured utilitarian firmness with a friendly tap affordance.
- **Status Badges & Dietary Tags:** `8px` (`rounded-lg`).
- **Touch Target Enclosure:** Stepper icons (+ / -) maintain square aspect ratios with `8px` inner radii within cards.

## Components

Components follow shadcn/ui patterns (Radix primitives + Tailwind CSS utility styling), augmented with Lucide iconography and semantically dedicated Adinkra symbol placeholders.

### Adinkra Semantic Glyphs
Adinkra symbols are never decorative patterns. They must be SVG glyphs or contained badges mapped exclusively to specific operational roles:
1. **Sankofa (Return and Fetch It):** Used exclusively for **Reorder** buttons and past order history actions.
2. **Adinkrahene (Chief of Adinkra / Greatness):** Used exclusively for **Top-Rated Restaurant** badges.
3. **Dwennimmen (Ram's Horns / Strength & Humility):** Used exclusively for **Rider Recognition & Top Courier** badges.
4. **Nyame Dua (Altar to God / Sanctity & Security):** Used exclusively for the **Payment Confirmed & Verified Receipt** stamp.

### Buttons
- **Primary CTA:** Background Forest Green (`#123C2A`), text `#FBF8F1`, height `48px`, font weight 700, border radius `10px`. Hover/Active: `#0E2E20`. Focus outline: `2px solid #123C2A` with a `2px` offset.
- **Secondary CTA:** Background Warm Cream (`#F7F0DF`), border `1.5px solid #123C2A`, text Forest Green (`#123C2A`), height `48px`, border radius `10px`.
- **Destructive CTA:** Background Danger (`#A61B1B`), text `#FBF8F1`, border radius `10px`.
- **Promotional / Deal Action:** Terracotta (`#B9573E`), text `#FBF8F1`, radius `10px`. Maximum one per view.

### Cards & Menu Items
- **Restaurant Card:** Outer radius `12px`, background `#F7F0DF`, border `1px solid #E6DDCB`. Header photo radius `16px` with `8px` inner inset padding. Displays delivery time (e.g., "25-35 min"), fee in `GHS 15.00`, and rating in Ashanti Gold badge (`#C89B3C`) with Cocoa text (`#2B2118`).
- **Dish Selection Card:** Horizontal layout on mobile; photo `80x80px` (radius `16px`), title in `headline-sm`, price in bold `price-md` Cocoa text, and quick `+ Add` button with minimum touch target `44px`.

### Badges & Chips
- **Ashanti Gold Badge:** Background `#C89B3C`, text `#2B2118` (weight 700), radius `8px`, horizontal padding `8px`, vertical padding `4px`.
- **Filter Chips:** Height `36px` (touch padding expands to `44px`), radius `8px`. Unselected: `#F7F0DF` background, `#E6DDCB` border, `#2B2118` text. Selected: `#123C2A` background, `#FBF8F1` text.

### Inputs & Form Fields
- Height `48px`, radius `12px`, background `#FBF8F1`, border `1.5px solid #E6DDCB`, text `#2B2118`.
- Placeholder color: `#6E6458`.
- Focus state: Border color `#123C2A` with an ambient ring: `ring-2 ring-[#123C2A]/20`.
- Mobile money / Phone number prefix locked with Ghanaian flag icon and `+233` fixed chip.

### Delivery Code Panel (Security Handshake)
- Dedicated 4-digit verification code panel styled in Ashanti Gold (`#C89B3C`) container, Cocoa (`#2B2118`) monospace-styled typography with letter spacing `0.25em`, radius `12px`, padding `16px`. Gives customer and rider instantaneous visual verification.

### Bottom Sheets
- Rounded top `20px`, surface Warm Cream (`#F7F0DF`), top edge drag indicator `36px x 4px` centered in `#6E6458/40`. Solid background without backdrop-blur artifacts.