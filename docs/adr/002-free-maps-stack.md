# ADR 002: Free maps stack (OpenStreetMap) instead of Google Maps

- **Status:** Accepted
- **Date:** 2026-10-09
- **Step:** 7 (Customer Browsing, Addresses and Cart)

## Context

The acceptance criteria were written with Google Maps in mind (AC-MAP-01 to 06). Google Maps only works fully once a billing account with a card is linked; without one, maps show "For development purposes only". CibusHub is a learning project with no budget yet.

## Decision

| Job | Tool | Where |
|---|---|---|
| Show maps and drag the pin | Leaflet (`react-leaflet`) with OpenStreetMap tiles | Browser |
| Pin → area name, place search (AC-MAP-02) | OpenStreetMap Nominatim | Server only: `services/maps/nominatim.client.js` |
| Route ETA (AC-MAP-03) | Straight-line distance (`utils/distance.js`) and an average speed | Server, Step 11 |

Rules that come with it:

- **One file talks to the geocoder** (`nominatim.client.js`). Switching to Google later means replacing that file, not the screens.
- **Nominatim's usage policy is followed:** at most 1 request per second for the whole app (a Redis "turn" key), a `User-Agent` that names CibusHub plus `GEOCODER_CONTACT_EMAIL`, and results cached in Redis (30 days for pins, 7 days for searches). That also covers AC-MAP-05.
- **Graceful failure (AC-MAP-06):** pin → area answers `area: null` when the geocoder is down, so the address form still works; search answers `503 MAPS_UNAVAILABLE`.
- **Map credit:** every map shows "© OpenStreetMap contributors", as the tile licence requires.

## How each criterion is met

- **AC-MAP-01** (maps render): Leaflet on the address picker now; restaurant, rider and tracking maps in later steps.
- **AC-MAP-02** (geocoding): `GET /api/v1/customer/maps/reverse` and `/search`.
- **AC-MAP-03** `[SHOULD]` **(ETA from the Google Routes API): not met as written.** Reason: it needs a paid Google account. The ETA will use straight-line distance and an average rider speed, which is also the AC-MAP-06 fallback. Revisit when there is revenue.
- **AC-MAP-04** (key protection): there is no browser key to leak. The geocoder is only called from the server.
- **AC-MAP-05** (cost control): Redis cache plus a 30-per-minute limit per customer.
- **AC-MAP-06** (graceful failure): as above.

## Consequences

- No cost and no card needed, in development or production.
- OpenStreetMap is good for areas and landmarks in Kumasi but weak on house addresses. That is acceptable because an address is the pin plus landmark plus Ghana Post GPS, not a street lookup.
- Nominatim's public server is not for heavy traffic. At real scale: self-host Nominatim, use a paid OSM provider, or move to Google by replacing `nominatim.client.js`.
