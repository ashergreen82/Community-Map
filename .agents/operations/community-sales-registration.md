# Community Sales Registration Link

Coordinators (admins managing a community sales event) share a self-registration link so homeowners submit their own garage sale listings.

## How It Works

1. In **CommunitySalesAdmin** (`/admin/community-sales`), click **Copy Reg. Link** on an event card
2. Clipboard gets `{origin}/register-garage-sale/{communityId}`
3. Coordinator shares the link (email, Nextdoor, Facebook, etc.) with homeowners

## Homeowner Flow (CSE-137 — live)

Visiting the link (`/register-garage-sale/:communityId`, page: `RegisterCommunityGarageSale.jsx`):
- Not logged in → `/login?returnTo=...`, then back to the form ([Login returnTo](../architecture/login-return-to.md))
- Event name/dates header card — from `/v1/communitySales/all`, matched by id client-side (no single-event endpoint)
- No date fields (CSE-136 follow-up): `dateTime` derives from the event's start/end dates (`T09:00:00`/`T18:00:00`, America/Toronto); submit disabled until the event loads; saving an edit overwrites divergent dates
- Pre-fills the homeowner's existing submission for this community (matched by `userId`); they can create/edit/delete their own listing
- Edit success does a full page reload (same as GENPUB form)
- Fields mirror the admin form (address first; no name field); payload sends `community: {communityId}` and checkbox `paymentTypes` ([createAddress](../architecture/integrations/create-address.md))
- Listing appears on the map and in GarageSalesAdmin like any coordinator-entered sale

## Notes

- "Coordinator" is informal — an admin managing a specific event; no separate role exists
- Admins only see events they manage, so the button is effectively per-coordinator scoped
- If clipboard write fails (HTTP context, permission denied), a prompt dialog shows the URL for manual copying
- The GENPUB form (`/register-garage-sale`, no communityId) is a separate flow for standalone sales not tied to any event; homeowners there still enter their own dates
