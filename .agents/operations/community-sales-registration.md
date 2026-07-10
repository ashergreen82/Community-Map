# Community Sales Registration Link

Coordinators (admins managing a community sales event) share a self-registration link so homeowners submit their own garage sale listings without coordinator manual entry.

## How It Works

1. Coordinator opens **CommunitySalesAdmin** (`/admin/community-sales`)
2. On any event card, click **Copy Reg. Link**
3. Link is copied to clipboard in the format:

   ```
   {origin}/register-garage-sale/{communityId}
   ```

4. Coordinator shares the link (email, Nextdoor, Facebook, etc.) with homeowners in the neighborhood

## Homeowner Flow (CSE-137 — live)

Visiting the link (`/register-garage-sale/:communityId`, page: `RegisterCommunityGarageSale.jsx`):
- Not logged in → `/login?returnTo=/register-garage-sale/{communityId}`; after login they land back on the form (see [Login returnTo](../architecture/login-return-to.md))
- Event name/dates header card — from `/v1/communitySales/all`, matched by id client-side (no single-event endpoint)
- Form pre-fills with the homeowner's existing submission for this community (matched by `userId`); create/edit/delete their own listing
- Edit success does a full page reload (same as GENPUB form)
- Payload sends `community: {communityId}` and `paymentTypes: []` (required — see [createAddress](../architecture/integrations/create-address.md))
- Listing appears in the event on the map and in GarageSalesAdmin like any coordinator-entered sale

## Notes

- "Coordinator" is an informal name for an admin managing a specific community event; there is no separate coordinator role in the system
- Admins only see events they manage, so the button showing on every card is effectively per-coordinator scoped
- If clipboard write fails (HTTP context, permission denied), a prompt dialog opens with the URL for manual copying
- The GENPUB form (`/register-garage-sale`, no communityId) is a separate flow for standalone individual sales not connected to any community event — not part of this link-sharing feature
