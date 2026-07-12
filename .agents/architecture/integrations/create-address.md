# POST /v1/createAddress

Creates a sale in a community. Part of the [Maps Management API](./maps-api.md) — same client setup and headers.

## `community` field values

- **UUID** — a neighbourhood event (admin-managed)
- **`GENPUB`** — standalone individual sale (public `/register-garage-sale`); not part of any event; find user's sale by matching `userId`

For UUID (community-scoped) homeowner submissions, `RegisterCommunityGarageSale.jsx` derives `dateTime` from the event's `startDate`/`endDate` (start `T09:00:00`, end `T18:00:00`, America/Toronto) — homeowners don't enter dates. GENPUB submissions still send user-entered dates.

## Required: `paymentTypes` (array)

Missing/non-array → `HTTP 400 { code: "ERR_MAPS002", fields: { paymentTypes: "PaymentTypes is missing or is not an array" } }`. Discovered 2026-07 during CSE-137; unconfirmed whether intentional — check with backend dev. Senders: `GarageSalesAdmin.jsx` and `RegisterCommunityGarageSale.jsx` (both send checkbox values; the forms share the same field set).

> **Known bug**: `RegisterGarageSale.jsx` (GENPUB form) does not send `paymentTypes`, so its submissions 400 against the current dev backend. Needs a ticket.

## Duplicate detection (community-scoped)

Same address in same community → `HTTP 400 { code: "ERR_MAPS001", errorMsg: "Existing Address" }`. `api.js` converts this to `new Error('A garage sale already exists at this address')`, which both forms display. Same address is allowed in different communities.

**Status (CSE-125/CSE-128):** Backend currently accepts duplicates silently. Frontend mitigation: `GarageSalesAdmin.jsx` pre-checks the loaded sales list before the API call; `RegisterGarageSale.jsx` fixed a nested try-catch that swallowed the specific error. Jamie to add community+address unique constraint.
