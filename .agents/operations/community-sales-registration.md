# Community Sales Registration Link

Coordinators (admins who manage a community sales event) can share a self-registration link with homeowners so homeowners submit their own garage sale listings without coordinator manual entry.

## How It Works

1. Coordinator opens **CommunitySalesAdmin** (`/admin/community-sales`)
2. On any event card, click **Copy Reg. Link**
3. Link is copied to clipboard in the format:

   ```
   {origin}/register-garage-sale/{communityId}
   ```

4. Coordinator shares the link (email, Nextdoor, Facebook, etc.) with homeowners in the neighborhood

## Homeowner Flow (CSE-135b — pending)

Once the homeowner visits the link:
- They are prompted to log in if not already authenticated
- The registration form pre-fills with their existing submission (if any)
- They can create, edit, or delete their own listing
- Their listing immediately appears in the event on the map

## Notes

- "Coordinator" is an informal name for an admin managing a specific community event; there is no separate coordinator role in the system
- Admins only see events they manage, so the button showing on every card is effectively per-coordinator scoped
- If the clipboard write fails (e.g., HTTP context, browser permission denied), a prompt dialog opens with the URL pre-filled for manual copying
- The registration page at `/register-garage-sale/:communityId` is pending implementation (CSE-135b)
