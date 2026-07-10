# Login returnTo Flow

After login, users return to the page they originally tried to visit via a `returnTo` query param. Added in CSE-137; affects **all** protected routes and all three login paths.

## Flow

1. `ProtectedDashboardRoute` (App.jsx) — unauthenticated visit redirects to `/login?returnTo=<encodeURIComponent(pathname + search)>`
2. `Login.jsx` — a mount effect persists `returnTo` into `sessionStorage` so it survives the Google OAuth round-trip (Google returns to `/login?code=...` without the original params)
3. On success (email login, registration, Google callback), `consumeReturnTo(location.search)` reads the param (URL first, then sessionStorage), clears the stored copy, and `navigate(returnTo)`
4. No `returnTo` → existing fallbacks: InitialPageContext heuristics (email/registration) or `/admin/community-sales` (Google)

## Rules

- **Open-redirect guard**: `consumeReturnTo` only accepts paths starting with `/` and rejects `//` — never navigate to a value that fails this check
- sessionStorage copy is cleared on every consume, so a stale `returnTo` cannot leak into a later login
- `MenuBar.jsx` and `DashboardLayout.jsx` were already passing `returnTo` before CSE-137 (it was ignored); they now work as intended

## History

Before CSE-137, `returnTo` was passed by several components but consumed nowhere; in-component redirects like `RegisterGarageSale.jsx`'s were dead code because the route wrapper redirected to plain `/login` first.
