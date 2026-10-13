# CibusHub Design Guide

**Covers:** colour palette, contrast rules, typography, kente, shadcn/ui theming, Motion (animation) and the shared components every screen is built from.
**Applies from:** Step 6 (Frontend Foundation) onward.
**Related criteria:** AC-UX-01 to AC-UX-12, AC-PERF-05, AC-IMG-05.

> This guide **replaces** the earlier food-inspired palette (palm oil, shito, plantain, kontomire). Where the *Avoid the AI Look* guide mentions those colours, use the palette below instead. All its other rules still apply.

---

## 1. Colour Palette

### Brand colours

| Name | Hex | Role |
|---|---|---|
| Forest Green | `#123C2A` | **Leads the brand.** Primary buttons, header, active tabs, links, focus rings |
| Ashanti Gold | `#C89B3C` | **Highlight only.** Rating stars, badges, delivery code panel, top-rated badge, kente band |
| Cocoa | `#2B2118` | All body text and headings |
| Warm Cream | `#F7F0DF` | Surfaces: cards, sections, bottom sheets |
| Terracotta | `#B9573E` | **Optional, rare.** At most one promotional element. Never a primary colour |

### Supporting colours

| Name | Hex | Role |
|---|---|---|
| Page | `#FBF8F1` | Page background (lighter than Warm Cream, so the app does not read as a "cream page") |
| White | `#FFFFFF` | Inputs, text on Forest Green |
| Muted | `#6E6458` | Secondary text, captions, placeholder text, disabled labels |
| Border | `#E6DDCB` | Dividers, input borders, card outlines |
| Success | `#1F6B43` | "Paid", "Delivered", "Open now" (lighter than Forest Green, so status stands apart from branding) |
| Danger | `#A61B1B` | Errors, "Payment failed", destructive buttons (never Terracotta: it looks decorative, not urgent) |

> Muted, Border, Success and Danger are proposals. Confirm each with a contrast checker before committing them as tokens.

### Why green leads

Warm cream with a terracotta accent is one of the most common AI-generated looks. Letting **Forest Green** lead, with **Ashanti Gold** as the highlight and Terracotta almost absent, gives CibusHub its own identity and a clear Ghanaian character.

---

## 2. Contrast Rules (WCAG AA)

Normal text needs **4.5:1**; large text (24px+, or 18.5px+ bold) and interface parts (icons, borders, focus rings) need **3:1**. Ratios below are approximate; verify in a contrast checker.

| Combination | Ratio | Rule |
|---|---|---|
| Cocoa on Warm Cream | ~13.7:1 | ✅ Default text |
| White on Forest Green | ~12.4:1 | ✅ Primary buttons and header |
| Danger on Warm Cream | ~6.6:1 | ✅ Error text |
| White on Danger | ~7.5:1 | ✅ Destructive buttons |
| Cocoa on Ashanti Gold | ~6.1:1 | ✅ Gold badges always use Cocoa text |
| Success on Warm Cream | ~5.7:1 | ✅ Status text |
| Muted on Warm Cream | ~5.1:1 | ✅ Captions (do not go lighter) |
| Ashanti Gold on Forest Green | ~4.8:1 | ✅ Gold text only on green |
| White on Terracotta | ~4.7:1 | ⚠️ Passes narrowly; buttons only |
| Terracotta on Warm Cream | ~4.1:1 | ❌ Not for normal text |
| White on Ashanti Gold | ~2.6:1 | ❌ **Never** |
| Ashanti Gold on Warm Cream | ~2.3:1 | ❌ **Never** as text, icons or focus rings |

### Rules that follow

1. **Gold is a fill, not a text colour** — except on Forest Green.
2. **Focus rings are Forest Green**, 2px with a 2px offset. A gold ring is invisible on cream.
3. **Status is never shown by colour alone.** "Paid", "Failed", "Sold out" always have a word, and an icon where useful (AC-UX-08).

---

## 3. Typography

| Role | Typeface | Weights | Notes |
|---|---|---|---|
| Headings | Schibsted Grotesk | 600, 700, 800 | Tight letter-spacing at large sizes |
| Body and interface | Atkinson Hyperlegible | 400, 700 | Designed for legibility on small screens and in bright sunlight |

**Scale (mobile):** 13 caption · 15 body small · 16 body · 18 card title · 20 section heading · 26–30 page heading. Keep line length under 80 characters on wider screens.

**Don't:** use Inter or Roboto, add ALL-CAPS labels above headings, or colour one word in a headline for emphasis.

**Performance:** load only the weights listed, through Google Fonts with `display=swap`, so text appears quickly on slow connections (AC-PERF-05).

---

## 4. Kente

**Decision (13 Oct 2026):** the owner removed the Adinkra symbols (Sankofa, Adinkrahene,
Dwennimmen) and chose **kente** as CibusHub's Ghanaian accent. Kente is woven cloth, made to be
a pattern, so a kente stripe as decoration is natural; Adinkra symbols carry proverbs and
sacred meanings, which made them hard to use without a risk of misuse.

### The kente band

A thin stripe (6px) in our own colours: Ashanti Gold, Forest Green, Terracotta and Cocoa, in a
woven rhythm. It is the same stripe as the top of every CibusHub email.

| Where | |
|---|---|
| Under the header | every page |
| Above the footer | every page |
| Across the top of the Log in and Sign up cards | laptops, where they are cards |
| Across the top of each email card | all emails |

Code: `.kente-band` in `client/src/index.css` (built from the email stripe in
`server/src/services/notifications/templates/layout.js`; change both together).

### Rules

1. **A band, never a background.** Thin stripes only; never behind text, never filling cards.
2. **Few places.** The ones above. More would make it wallpaper and lose its weight.
3. **Fixed colours** in light and dark: they are cloth colours, not theme colours.
4. **Decorative only:** hidden from screen readers (`aria-hidden`).

### Top-rated badges

The gold **Top rated** (restaurants: 4.5 stars or more from at least 3 reviews) and
**Top-rated rider** (4.5 stars or more from at least 5 rated deliveries) badges use the Lucide
medal icon (`TopRatedBadge`). The rules are in `client/src/utils/topRated.js`.

---

## 5. shadcn/ui

### Principles

- **shadcn/ui is the foundation, not the look.** The default theme (neutral grey, one radius everywhere) is a recognisable generated look. Theme it fully before building screens.
- **You own the components.** They are copied into the project, so edit them to fit CibusHub rather than overriding styles everywhere.
- **Accessibility comes from Radix.** Keep the underlying Radix behaviour (focus, keyboard, ARIA) intact when you restyle.
- **One icon set:** Lucide, one stroke width, consistent sizes (20px in buttons and navigation, 16px inline).

### Theme tokens to set

shadcn/ui is themed through CSS variables. Map them to the palette:

| shadcn/ui variable | CibusHub colour |
|---|---|
| `background` | Page `#FBF8F1` |
| `foreground` | Cocoa `#2B2118` |
| `card` / `popover` | Warm Cream `#F7F0DF` |
| `card-foreground` / `popover-foreground` | Cocoa |
| `primary` | Forest Green `#123C2A` |
| `primary-foreground` | White |
| `secondary` | Warm Cream |
| `secondary-foreground` | Forest Green |
| `muted` | Warm Cream |
| `muted-foreground` | Muted `#6E6458` |
| `accent` | Ashanti Gold `#C89B3C` |
| `accent-foreground` | Cocoa (never white) |
| `destructive` | Danger `#A61B1B` |
| `border` / `input` | Border `#E6DDCB` |
| `ring` | Forest Green |

Add custom tokens for **success** and **gold** so they are used by name, never as raw hex values in components.

### Radius by hierarchy

Do not use one radius for everything:

| Element | Radius |
|---|---|
| Dish and restaurant photos | 16px |
| Bottom sheets (top corners) | 20px |
| Inputs and cards | 12px |
| Buttons | 10px |
| Badges and chips | 8px, or fully rounded for filter pills |

### Components and where CibusHub uses them

| Component | Use in CibusHub | Criteria |
|---|---|---|
| Button | All actions; labels say exactly what happens ("Place order") | AC-UX-05 |
| Form, Input, Label | All forms, with React Hook Form and Zod | AC-UX-05, AC-AUTH-03 |
| Drawer (bottom sheet) | Dish options, cart on mobile | AC-MENU-06, AC-CART |
| Dialog | Single-restaurant cart warning | AC-CART-02 |
| Alert Dialog | Every destructive action: cancel, reject, delete, suspend | AC-UX-07 |
| Tabs | Menu categories, restaurant order board | AC-DISC-10, AC-RORD-06 |
| Radio Group, Checkbox | Option groups (choose 1 / choose up to 3) | AC-MENU-06 |
| Badge | Open now, top-rated, sold out | AC-DISC-04 |
| Skeleton | Loading states on every data screen | AC-UX-02 |
| Sonner (toasts) | Short confirmations: "Added to cart", "Order placed" | AC-UX-04 |
| Avatar | Riders and users | AC-DEL-04 |
| Table | Admin and restaurant dashboards | AC-ADM |
| Chart | Admin analytics (built on Recharts) | AC-ANL-01 |

### Don'ts

- Don't keep the default grey theme or the default radius.
- Don't wrap every piece of content in a Card. Menus are lists; settings are rows.
- Don't add soft shadows to everything. Use borders and spacing; shadows for floating layers (sheets, dropdowns), and the soft hover shadow on clickable cards and buttons (section 6).
- Don't mix icon libraries.
- Don't remove focus styles to make buttons "cleaner".

---

## 6. Motion (Animation)

### Library

Use **Motion** (formerly Framer Motion). The library was renamed and is now installed as the `motion` package, with React components imported from its React entry point. Check the official Motion documentation for the current setup, as many tutorials still show the old `framer-motion` package.

### Principle: motion answers actions

Animation shows **what changed because the user did something**. It is never decoration.

### Use motion for

| Moment | Motion | Duration |
|---|---|---|
| Adding a dish to the cart | Cart badge count pops once | ~200ms |
| Opening dish options or the cart | Bottom sheet slides up | ~250–300ms |
| Order status advancing | The current timeline step fills in; the one memorable moment | ~400ms |
| Toasts | Slide in and fade | ~200ms |
| Expanding and collapsing sections | Height and opacity | ~200ms |
| Button press | Slight scale (to about 0.96) | ~150ms |

### Lively touches (decided 13 Oct 2026)

The owner asked for a livelier, less plain app. These are allowed on top of the table above:

| Where | Effect | How |
|---|---|---|
| Every page | Soft green and gold light behind the content (fixed, never a pattern) | `body` background in `index.css` |
| Navbar and home hero | Deep Forest Green gradient with a warm gold glow | `.brand-surface` in `index.css` |
| Page titles | A short gold stroke under the title, drawn in from the left | `PageHeader` |
| Page changes | The new page fades and rises 8px | `RootLayout` (Motion), ~250ms |
| Clickable cards | Lift 4px with a soft green shadow on hover; press in on tap | `Card` with `interactive`, ~200ms |
| Restaurant and dish photos | Zoom to 105% while their card or row is hovered (clipped by the frame) | `group-hover` in `RestaurantCard` and `DishImage`, ~500ms |
| Buttons | Lift 1px with a green glow on hover; press to 0.96 on tap | `components/ui/button.jsx` |
| Chips | Press to 0.95 on tap | `Chips` |
| List rows | The arrow slides right and turns green on hover | `ListRow` |

Tailwind v4 moves things with the separate `translate` and `scale` properties, so a
`transition-[...]` list must name `translate` and `scale` (not `transform`), or the movement
jumps instead of gliding.

### Don't use motion for

- Sections fading or sliding up as the page scrolls
- Looping or decorative animation (bouncing icons, pulsing backgrounds, floating shapes)
- Kente as a background or filling (it is a thin band only, section 4)

### Rules

1. **Respect reduced motion.** Configure Motion globally to follow the user's reduced-motion setting, so animations are replaced by instant changes for users who request it (AC-UX-09).
2. **Animate only transform and opacity.** Avoid animating width, height or layout on lists; these are slow on mid-range Android phones (AC-PERF-05).
3. **Keep it short.** Most interface motion is 150–300ms. Anything over 400ms feels slow.
4. **Use one easing style** across the app (a gentle ease-out for entering, ease-in for leaving).
5. **Never block the user.** Animations must never delay a tap or hide a result.
6. **Load Motion only where needed,** so it doesn't add weight to every page.

### How it is built (Step 13b)

- **One switch:** `MotionConfig reducedMotion="user"` in `main.jsx`. With reduced motion on,
  movement (slide, scale) is dropped everywhere; short fades stay, as Motion intends.
- **Plain CSS** (`tw-animate-css`, `motion-reduce:` variants) for simple entrances: the cart
  badge pop, button press, step progress bar.
- **Motion** only where CSS can't do it:
  - sheets that slide out when closed and can be swiped down by their handle
  - owner board cards gliding in, out and into place (`layout` animates with transforms, so
    rule 2 still holds)
  - the sliding highlight in `Tabs`
- **Focus after a sheet closes** goes back to the button that opened it.

---

## 7. Shared Components (Step 13b)

Every screen is built from these, all in `client/src/components/common/`. A page never makes its
own card, list, badge, filter, header or alert style: if a component is missing something, add it
to the component (once) instead of styling one page.

| Need | Use | Rules it encodes |
|---|---|---|
| A group of related content | `Card` | Tones: `default` (cream), `highlight` (green tint: the one thing to look at first), `danger` (red tint: a warning about this thing), `quiet` (page colour, for secondary content next to a default card). `interactive` for a tappable card: hover tint, press to 0.98, focus ring. No shadows. |
| One headline number | `StatTile` | Label, value, optional note; `size="lg"` for the one figure a page is about. |
| Rows of things | `List` + `ListRow` | Icon tile (`ListIcon`) or `Avatar` on the left, bold title, status on the right of the title, muted meta (wraps, never cut off), optional detail and trailing value. `to` / `href` / `onClick` make the whole row tappable, with a chevron. |
| A status | `StatusBadge` | Five groups, each with its own colour **and icon**: `neutral` (nothing happening), `attention` (someone must act, gold), `progress` (moving along), `success` (done and good), `danger` (ended badly). Statuses name their group in `data/` files, never a colour. 8px corners. |
| Switch between views of a page | `Tabs` | Segmented control, one always chosen; optional counts; `urgent` counts are gold and pulse (not for reduced motion). |
| Filter a list | `ChipRow` + `Chip` | Fully round (filter pills); a chosen chip shows a tick, so "on" is never colour alone. |
| The top of a page | `PageHeader` | Named back link ("← Orders"), the page's only `h1`, optional photo/avatar and badge, meta line, subtitle, actions that move under the title on phones. |
| An error or confirmation | `Alert` | Red icon and border with normal-coloured text (danger, `role="alert"`), or green (success, `role="status"`). |
| Nothing to show | `EmptyState` | Icon in a soft green circle, a title, one sentence, and the next step. |
| A panel over the page | `Sheet` | Radix Dialog: bottom sheet on phones (swipe down by the handle), centred on wider screens. |
| No photo yet | `CoverPlaceholder`, `DishImage` | Initials on soft green, never a tall empty grey box. |

### Layout

- **Phones first** (360–390px), one column, in reading order.
- **Wide screens use the space:** two columns where it helps, with the summary column sticky
  (order detail, owner history); lists and forms keep a comfortable centred width.

### Dark mode

- The brand green becomes a light mint in dark mode. Use it for **accents** (links, the logo,
  badges, the chosen tab), never for a **large area**: big blocks (the navbar, the home page hero)
  use the dark card surface instead.

---

## 8. Implementation Checklist (Step 6)

Checked on 13 Oct 2026.

- [x] Fonts load (Schibsted Grotesk 600–800, Atkinson Hyperlegible 400 and 700) with `display=swap` (self-hosted with Fontsource, in `index.css`)
- [x] shadcn/ui initialised, and every theme variable mapped to the palette
- [x] Custom tokens added for success and gold
- [x] Radius values set by hierarchy, not one global value (`--radius-sm` 8px to `--radius-2xl` 20px)
- [x] Focus rings are Forest Green and visible on every interactive element
- [x] All colour pairs used in the UI checked in a contrast checker: 18 pairs in light and 18 in dark, all pass (lowest: terracotta button text 4.67:1; muted text on cards 5.10:1)
- [x] Gold never used as text on cream or under white text (gold appears as fills: badges, stars)
- [x] Lucide is the only icon library
- [x] Motion installed from the `motion` package, with reduced motion respected globally (`MotionConfig reducedMotion="user"`)
- [x] No scroll-reveal or looping animations (the lively touches in section 6 are allowed, and all of them respect reduced motion)
- [x] Kente used only as a thin band in its few places (section 4), hidden from screen readers
- [x] Screens checked on a 360px-wide viewport (AC-UX-01), including the owner setup, menu builder and profile screens added after Step 13b
---

*CibusHub Design Guide — companion to the Build Plan and Acceptance Criteria v1.0*
