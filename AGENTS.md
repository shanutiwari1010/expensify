<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Expensify — Agent & Contributor Guide

A small, production-minded personal finance tool. A user can **create**, **list**, **filter**, **sort** and **total** their expenses. The code is structured so we can keep extending it, not so we can ship a throwaway prototype.

> This file is the canonical source of truth for how we build in this repo. Read it before writing code. If a rule here disagrees with something the assignment/user said in chat, **ask first** — do not silently deviate.

---

## 1. Product scope (what we are building)

Acceptance criteria the implementation must satisfy end-to-end:

1. Create an expense: `amount`, `category`, `description`, `date`.
2. List expenses.
3. Filter by `category`.
4. Sort by `date` (newest first).
5. Show a running **total** of the currently visible list.

Non-functional requirements we treat as first-class:

- **Retry-safe writes.** Double-clicked submit, refresh-after-submit, flaky network — none of these may create duplicates.
- **Real-money arithmetic.** No binary floats for money. Ever.
- **Clear UX states.** Loading, empty, error, and disabled-while-pending states are required, not "nice to have".
- **Type-safe contracts.** The same zod schema validates the HTTP boundary and the form.

Nice-to-haves we'll add only after the core is solid: validation polish (no negative amounts, required date), per-category summary, a couple of unit/integration tests, richer error states.

---

## 2. Tech stack (installed / to install)

Already in `package.json`:

- **Next.js `16.2.4`** (App Router, RSC on)
- **React `19.2.4`** + **TypeScript `^5`** (`strict: true`)
- **Tailwind CSS `v4`** via `@tailwindcss/postcss`, plus `tw-animate-css`
- **shadcn/ui** (style `base-vega`, base color `neutral`, Lucide icons) — complete component library under `components/ui/*`
- `@base-ui/react`, `sonner`, `recharts`, `react-day-picker`, `date-fns`, `cmdk`
- ESLint 9 with `eslint-config-next`

To add when implementing features (install with the package manager, do not hand-edit versions):

- `zod` — validation (shared schemas, single source of truth)
- `react-hook-form` + `@hookform/resolvers` — forms
- `prisma`, `@prisma/client` — ORM
- `@supabase/supabase-js` — only if we need auth / storage; optional for this assignment
- `vitest` + `@testing-library/react` + `@testing-library/jest-dom` — only when we start writing tests

Path alias: `@/* → ./*` (see `tsconfig.json`). Always import via `@/…`, never with long relative paths.

---

## 3. Architecture

We use Next.js App Router with a clean separation of concerns:

```
app/
  api/
    expenses/
      route.ts              # POST /api/expenses, GET /api/expenses
      [id]/
        route.ts            # (future) GET/PATCH/DELETE /api/expenses/:id
  (dashboard)/              # route group for the UI (optional)
    page.tsx                # main expense tracker screen (server component)
  layout.tsx
  globals.css

components/
  ui/                       # shadcn primitives — DO NOT modify by hand, regenerate via shadcn
  expenses/
    expense-form.tsx        # "use client" — react-hook-form + zod form
    expense-list.tsx        # table/list of expenses
    expense-filters.tsx     # category filter + sort control
    expense-total.tsx       # total-for-current-view pill
    category-select.tsx     # reusable
    ...
  providers/
    toaster.tsx             # <Toaster /> wrapper for sonner
    query-provider.tsx      # (if/when we add a data layer like React Query)

lib/
  db.ts                     # Prisma client singleton
  schemas/
    expense.ts              # zod schemas (shared by API + form)
  services/
    expenses.ts             # business logic: createExpense, listExpenses, …
  http/
    errors.ts               # ApiError, problem+json helper
    responses.ts            # ok(), created(), badRequest(), …
    idempotency.ts          # helpers for Idempotency-Key handling
  money.ts                  # format / parse helpers (Decimal-safe)
  utils.ts                  # cn() etc.

hooks/
  use-expenses.ts           # client-side data hook (fetch + local cache)

prisma/
  schema.prisma
  migrations/
```

Rules:

- **Route handlers are thin.** They parse + validate input (zod), call a service, map errors to HTTP. Do not put business logic in `route.ts`.
- **Services are pure TypeScript.** They take validated input and a Prisma client, return typed results. No `Request`/`Response` objects inside services.
- **Schemas are shared.** `lib/schemas/expense.ts` exports the zod schemas used by both the route handler (`safeParse(await req.json())`) and the form (`zodResolver(...)`).
- **Client components are marked explicitly.** Anything that needs state/effects/handlers starts with `"use client"`. Everything else stays a server component.

---

## 4. Next.js 16 conventions (critical — differs from older versions)

Before touching routing, data fetching, caching, or params, **read the relevant file under `node_modules/next/dist/docs/`**. Key pointers:

- Route handlers live in `app/api/**/route.ts` and export `GET`, `POST`, etc. See `01-app/03-api-reference/03-file-conventions/route.md`.
- Dynamic `params` and page `searchParams` are **async** — you must `await` them. See `01-app/03-api-reference/03-file-conventions/page.md`.
- Forms, server actions, caching, and revalidation semantics have changed — consult `01-app/02-guides/forms.md` and `01-app/02-guides/how-revalidation-works.md` before using them.
- `next.config.ts` is TypeScript — we already use it.
- Do **not** import client-only hooks into server components, and do not mark a file `"use client"` unless it actually needs to be.

If a pattern from your training data conflicts with the bundled docs, the docs win.

---

## 5. Data model & persistence

**Database:** Supabase PostgreSQL, accessed via Prisma. Why: Postgres is the right default for relational + monetary data, Supabase gives us a managed, free-tier-friendly instance, and Prisma gives us type-safe queries + migrations without hiding the schema. Credentials will be supplied later via env vars.

Environment (placeholders — real values come via `.env.local`, never commit):

```
DATABASE_URL=          # pooled connection (PgBouncer) — used by the app at runtime
DIRECT_URL=            # direct connection — used by `prisma migrate` only
```

See `.env.example` for the full template and `.env.local` for the local override (git-ignored). On Supabase, `DATABASE_URL` should be the **Transaction Pooler** URL (port `6543`, append `?pgbouncer=true&connection_limit=1`). `DIRECT_URL` should be either the direct `db.<ref>.supabase.co:5432` URL (IPv6) or the **Session Pooler** URL (IPv4-friendly).

> **Known lint noise:** Cursor's Prisma plugin flags `datasource.url` / `directUrl` in `schema.prisma` as Prisma-7 deprecations. The installed Prisma CLI (6.19.3) still **requires** them in the schema, and our generate/migrate both work. When we upgrade to Prisma 7 we'll move these to `prisma.config.ts`. Leave the fields as-is for now.

**Minimum schema** (illustrative — implement in `prisma/schema.prisma`):

```prisma
model Expense {
  id          String   @id @default(cuid())
  amount      Decimal  @db.Decimal(14, 2)   // money: NEVER Float
  category    String                        // keep as string for now; promote to enum/table when needed
  description String
  date        DateTime @db.Date             // the calendar date of the expense
  createdAt   DateTime @default(now())      // audit timestamp

  @@index([category])
  @@index([date(sort: Desc)])
}

model IdempotencyKey {
  key        String   @id                   // client-supplied Idempotency-Key header
  resourceId String                         // id of the Expense we returned
  createdAt  DateTime @default(now())

  @@index([createdAt])
}
```

Rules:

- **Money uses `Decimal(14, 2)`** in the DB and `Prisma.Decimal` in TS. Serialize to a **string** on the wire (`amount.toFixed(2)`), never a JS `number`.
- **Dates**: the expense `date` is a calendar date (no time/TZ). Store as `@db.Date`. In the API, accept/emit `YYYY-MM-DD`. `createdAt` is a full timestamp.
- **IDs**: `cuid()` (collision-resistant, URL-safe, sortable-ish). Do not expose DB row numbers.
- **Indexes**: always index columns we filter/sort by (`category`, `date`).

---

## 6. API contract

Base path: `/api/expenses`. All responses are `application/json`. Errors use a consistent `{ error: { code, message, details? } }` shape.

### `POST /api/expenses`

Creates an expense. **Idempotent** when the client sends an `Idempotency-Key` header.

Request:

```http
POST /api/expenses
Content-Type: application/json
Idempotency-Key: 2f2b6e1c-…        # optional but recommended; client-generated UUID

{
  "amount": "499.00",               // string, positive, up to 2 decimals
  "category": "Food",
  "description": "Lunch with team",
  "date": "2026-04-24"              // YYYY-MM-DD
}
```

Behavior:

- Validate with zod; on failure return `400` with field-level `details`.
- If `Idempotency-Key` is present and already stored, return the previously-created resource with `200 OK` (not a duplicate insert).
- Otherwise create the row inside a transaction with the idempotency record, return `201 Created` + the new resource.
- `amount` comes in as a string to avoid float drift; we parse it into `Decimal` server-side.

Response (`201`):

```json
{
  "id": "cl…",
  "amount": "499.00",
  "category": "Food",
  "description": "Lunch with team",
  "date": "2026-04-24",
  "createdAt": "2026-04-24T10:12:33.000Z"
}
```

### `GET /api/expenses`

Lists expenses.

Query params (all optional):

- `category` — exact-match filter (case-insensitive on server).
- `sort` — currently only `date_desc` (newest first). Default: `date_desc`.

Response (`200`):

```json
{
  "data": [ { "id": "…", "amount": "499.00", ... } ],
  "total": "1298.50"                  // sum over the returned list, as string
}
```

Rules:

- Validate query params with zod (`z.enum(["date_desc"])`, etc.). Unknown values → `400`.
- The API returns `total` alongside `data` so the UI can render it without client-side reduction of strings-to-numbers. The UI may still recompute for optimistic UI.
- No pagination yet — but write the handler so adding `limit`/`cursor` later is mechanical.

---

## 7. Coding standards

**TypeScript**

- `strict: true`. No `any`, no `@ts-ignore` without a comment explaining why.
- Prefer `type` for object shapes that are part of a public contract; `interface` when we expect extension.
- Exported functions always have explicit return types at module boundaries (route handlers, services, hooks).
- Use `satisfies` to pin literal shapes without widening.

**Validation**

- **Every** external input (HTTP body, query params, form values, URL params) goes through a zod schema before it touches a service or DB call.
- Schemas live in `lib/schemas/` and are imported by both the API and the UI. Do not duplicate them.
- For forms, use `zodResolver(schema)` with `react-hook-form`. Do not hand-roll validation in the component.

**Forms**

- `react-hook-form` for all forms. `mode: "onBlur"` by default.
- Submit button is disabled when `isSubmitting`. Generate an `Idempotency-Key` (uuid) once per mount and reuse on retries — so a double-click or a refresh-retry does not create duplicates.
- After a successful create, reset the form, show a `sonner` toast, and refresh the list (router refresh or local mutate).
- On failure, keep the user's input, show the server error inline, and keep the submit button enabled so they can retry.

**React / Next**

- Server Components by default; `"use client"` only where needed (form, interactive list, etc.).
- Co-locate small UI pieces under `components/expenses/*`. Do not dump everything into `page.tsx`.
- Use `sonner` for toasts (already installed). Import from `components/ui/sonner.tsx` wrapper.
- Do not fetch from `/api/expenses` inside a server component that could query Prisma directly — skip the HTTP hop on the server. Client components use `fetch("/api/expenses")`.

**Styling**

- Tailwind v4 utility classes. Use the design tokens in `globals.css` (`bg-background`, `text-foreground`, `border-border`, etc.) — do not hardcode hex colors.
- Use `cn()` from `@/lib/utils` to merge conditional classes.
- Layouts use flex/grid + container widths. Keep spacing on a consistent 4px scale.
- Dark mode must work (we already have a `.dark` variant). Test both.

**shadcn components**

- Regenerate with the shadcn CLI, do not hand-edit `components/ui/*` unless intentionally customizing — and if you do, leave a top-of-file comment explaining what changed.
- Prefer composing shadcn primitives over installing new UI libraries.

**Accessibility**

- Every input has a `<Label>`. Submit buttons have accessible names. Error messages are associated with their field (`aria-describedby`).
- Keyboard navigation must work for the form, filter, and sort controls.

---

## 8. Error handling & resilience

- Never `throw` raw errors out of a route handler. Map to a typed `ApiError` → JSON response via `lib/http/errors.ts`.
- Client `fetch` wrappers must:
  - Treat non-2xx as errors and parse the JSON error body.
  - Retry idempotent operations on network error with exponential backoff (at most 2 retries), reusing the **same** `Idempotency-Key`.
  - Surface errors to the user via `sonner` + inline UI, not `alert()` or `console.log`.
- Loading and empty states are required for the list view. An empty list shows a friendly "No expenses yet" message with a call to action.

---

## 9. Commands

```bash
npm run dev       # start Next dev server
npm run build     # production build
npm run start     # run built server
npm run lint      # eslint
# Prisma (after schema changes):
npx prisma generate
npx prisma migrate dev --name <short-change-name>
```

Add scripts (e.g. `db:push`, `db:studio`, `test`) to `package.json` as we actually need them — do not add unused scripts.

---

## 10. Secrets & environment

- `.env.local` is the only place real credentials live. It is git-ignored.
- Anything starting with `NEXT_PUBLIC_` is shipped to the browser — only use it for non-secret values.
- Supabase `DATABASE_URL` / `DIRECT_URL` will be shared by the project owner; do not invent placeholder values that look real.

---

## 11. Definition of done

A change is done when:

- It satisfies the relevant acceptance criterion above.
- Input is validated by a shared zod schema.
- Money is `Decimal`/string end-to-end (no `number` for amounts).
- The UI has explicit loading + error + empty states where applicable.
- `POST` paths are retry-safe (idempotency key respected).
- `npm run lint` and `npm run build` both pass.
- No `any`, no commented-out code, no dead imports.
- New files follow the folder layout in §3.

---

## 12. What to ask before coding

If any of the following is ambiguous for a task, stop and ask the user:

1. Should this value live in the DB or only in the client's memory?
2. Is this a server component or a client component?
3. Does this write path need an idempotency key? (Default answer: **yes**.)
4. Are we adding a dependency? If yes, does shadcn / an existing dep already cover it?

When in doubt, prefer: **fewer dependencies, more types, smaller components, shared schemas.**
