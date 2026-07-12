# Maps Management API

Backend service owning sale records. Cloud Run host: `br-maps-mgt-api-dev001` (dev).

## Client setup

Axios instance `mapsApi` in `client/src/utils/api.js`. Base URL: `VITE_MAPS_API_URL`, falling back to `/maps-api`. Dev proxy in `vite.config.js` rewrites `/maps-api/*` to Cloud Run (real backend). All requests need `sessionId` + `app-key` + `app-name` headers.

## PATCH /v1/updateAddress/{id}

Accepts same field names as create: `address`, `description`, `highlightedItems`, `paymentTypes`, `socialAndWeb`, `dateTime`. Partial and full payloads accepted. `GarageSalesAdmin.jsx` diffs the form against the loaded sale and only sends changed fields; no-op saves skip the call.

## PATCH /v1/communitySales/update/{id}

Same merge semantics: omitted keys keep previous value. To clear a field, send `null` — do not omit:

```js
// ✅ clears removed URLs
socialAndWeb: { fb: val || null, instagram: val || null, website: val || null }
// ❌ omitting keeps old value
```

> **Open (CSE-119)**: Does `{ fb: null }` delete the key or store `null`?

## POST /v1/createAddress

See [createAddress](./create-address.md) — `community` values (UUID vs GENPUB), required `paymentTypes`, duplicate detection.
