# Design audit (Step 13b)

On 2026-10-12 every screen was screenshotted at phone (390px) and desktop (1280px) width, logged in as
the demo accounts, with real dev data: 46 screens, 92 screenshots. No page crashed and none scrolls
sideways. This list is what Step 13b fixes. Each item is ticked when its fix is merged. Dark mode is
checked on each component as it is restyled.

Shared components built so far (all in `client/src/components/common/`): `Card` (tones: default,
highlight, danger, quiet) and `StatTile`; `List`, `ListRow`, `ListIcon` and `Avatar`; `StatusBadge`
(neutral, attention, progress, success, danger, each with an icon); `Tabs` and `Chips`; `PageHeader`.

Rules to keep: [frontendDesign.md](frontendDesign.md). Forest Green leads, Ashanti Gold only for
highlights, Terracotta rarely.

## Across every screen (shared components first)

- [x] **Everything is the same cream card on a cream page.** Cards, list rows, summaries and forms
  all use `bg-card` with a thin border and no depth, so nothing stands out and every role's screens
  look alike. Needs card levels (raised, flat, tinted highlight), soft shadows, and hover/press
  states for anything tappable.
- [x] **List rows all look the same** (orders, users, riders, history, notifications). They need a
  shared row component: a leading icon or avatar, a title, muted meta text, a status on the right
  and a chevron, with clear spacing.
- [x] **Status badges** are small and low-contrast. Different stages share the same green ("Sent to
  restaurant" and "Ready"). One badge component is needed, with a colour per stage group and an icon
  so colour is never the only signal.
- [x] **Filters look different on every page:** pills (admin restaurants, reviews), pills with counts
  (owner board), a segmented control (analytics, rider earnings), plain tabs (admin payments). Settle
  on two shared components: tabs for switching between sections, and chips for filters.
- [x] **Page headers** vary: some pages have a subtitle, some have an action on the right, some
  have a back link. One header component is needed (back link, title, subtitle, actions).
- [ ] **Desktop width is wasted.** Order detail, my orders, customer home and owner history are a
  narrow column with empty space on both sides. Use two columns where it helps (e.g. order detail:
  progress and items on the left, the delivery card on the right), or centre a comfortable width.
- [x] **Missing images** look broken. A restaurant with no cover shows a tall grey box with a fork
  icon that takes up half the card, and dishes have no image space at all. Use a smaller, branded
  placeholder (initials or a pattern in brand colours).
- [ ] **Empty states** are an icon and a sentence. They're fine but flat: use a softer illustration
  tile and a clear next action everywhere.
- [ ] **Navbar:** the desktop text links ("My dashboard", "Log out") are small. The unread badge is
  fine. The account menu could gather My dashboard, Settings and Log out.
- [ ] **Motion:** none yet. Sheets, list arrivals and status changes should ease in, and be off for
  reduced-motion users (AC-UX-09).

## Screens

- [x] **Home (`/`)** is a placeholder ("Coming soon"). It needs a real landing page: a hero with a
  search, restaurants open now, how it works, and links to become a restaurant owner or rider.
- [x] **Customer home (`/customer`)** is three buttons. It should show the active order (live status),
  recent orders with reorder, and restaurants open now.
- [x] **Restaurants list:** the placeholder images are too tall (see above), and the meta line
  (time, area, minimum order) is cramped on phones.
- [ ] **Restaurant page:** the hero placeholder; the dish rows need room for an image; the category
  chips could stick to the top while scrolling.
- [x] **Order tracking:** the delivery code box and the map are good. The 8-step progress list is long
  on phones: show the current step large and fold the finished ones away.
- [x] **Notifications** (planned in Step 13b, item 3): icon and colour per type, an unread tint with a
  left accent, relative times, Today/Earlier groups, and a dropdown from the bell on desktop.
- [x] **Owner board:** works well. The orange "Turn on sound" button was the loudest thing on the
  page; it is now a calm gold button (done with the page header).
- [ ] **Owner analytics:**
  - The restaurant picker opens on the owner's newest restaurant, even when all the orders are at
    another. Open on the one with recent orders.
  - Bug: the money axis repeats "GHS 0" when every value is 0 or small. Show decimals below GHS 10,
    and give the axis a minimum height.
- [x] **Admin users list:** the meta line is cut off ("joined 12 Oct 2026, 1…") on phones. It needs
  two lines or a shorter date.
- [ ] **Admin audit log:** changes show raw field names (`deliveryBasePesewas: 500 → 600`). Use the
  plain labels and money format from the settings page.
- [ ] **Rider screens:** clear and simple. The online switch card and the current delivery card
  should look like the rest once the shared cards are restyled.

- [ ] **Navbar in dark mode** is a bright mint bar (the brand green turns light in dark mode).
  Use a dark surface with a green accent instead, as done for the home page hero.
- [ ] **Dish rows** still have no room for a photo (restaurant page).

## Not issues

- **Date boxes in US format (mm/dd/yyyy) in the screenshots:** the test browser was set to US
  English. Browsers in Ghana show dd/mm/yyyy.
- **"11 emails or SMS failed" on the admin overview:** sending was switched off for the audit, and
  unsent messages are rightly counted as failures (`NOT_CONFIGURED`).
