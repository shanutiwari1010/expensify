# Expensify

A small, production-minded personal finance tracker. Add expenses, filter by category, sort and page through the list, and see the running total — built to survive unreliable networks, double-clicked submits, and page refreshes.

## What's in the box

- **Backend**: Next.js Route Handlers for `POST`/`GET /api/expenses`, `PATCH`/`DELETE /api/expenses/:id`, and `GET`/`POST` `/api/categories` plus per-id category routes. Money is `Decimal(14, 2)` in the DB, serialized as **strings** on the wire.
- **Frontend**: App routes under `/` (home), `/expenses` (form + table + **client-side** pagination), `/analytics` (Recharts + drill-downs), and `/settings` (display currency, etc.), with a sidebar shell, command palette, and global display-currency context (`providers/currency-preference-provider.tsx` + `useSyncExternalStore`).
- **DB**: Supabase PostgreSQL via Prisma. Expenses and user-defined **categories** are relational data (not a hardcoded client enum).
- **Retry-safe writes**: `POST` is idempotent via an `Idempotency-Key` header, protected by a transaction; the **same** idempotency key is reused on client retries (`lib/api-client.ts` plus shared `config/api.ts` defaults).

## Tech stack

| Layer         | Choice                                                      |
| ------------- | ----------------------------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19 + TypeScript (strict)    |
| Styling       | Tailwind CSS v4, shadcn/ui (base-vega, neutral)             |
| Forms         | `react-hook-form` + `@hookform/resolvers` + `zod`           |
| Validation    | `zod` (same schemas on API and in the form)                 |
| ORM           | Prisma 6.19                                                 |
| DB            | Supabase PostgreSQL (via Transaction Pooler in runtime)     |
| Toasts        | `sonner`                                                    |

## Why these choices

- **Postgres + Prisma.** Money is relational + monetary; Postgres gives us `NUMERIC(14, 2)`, strong consistency, and indexes we actually use. Prisma gives us type-safe queries, migrations, and a single source of truth for the schema. Supabase is just a hosted Postgres — swap for any Postgres later with zero code changes.
- **`Decimal(14, 2)` for amounts.** JS `number` is IEEE-754 and silently corrupts money. We store as `Decimal`, serialize to **string** on the wire, and format with `Intl.NumberFormat` at the UI edge.
- **Shared zod schemas.** `createExpenseSchema` is used both by the route handler (`safeParse` on the body) and by the form (`zodResolver`). Validation rules can never drift between client and server.
- **Server-owned idempotency.** The client sends a single UUID per submit and reuses it on retries. The server stores `(key → expense_id)` and returns the already-created resource on repeat hits. A unique constraint + transaction rollback handles the concurrent-race case correctly.
- **Thin route handlers + service layer.** `app/api/*/route.ts` files just parse input, call a service, and map errors to HTTP. Business logic lives in `lib/services/*` — testable in isolation, transport-agnostic.

## Project layout

```
app/
  layout.tsx                # Toaster, sidebar, command palette, currency provider
  page.tsx, expenses/page.tsx, analytics/page.tsx, settings/page.tsx
  api/
    expenses/route.ts          # POST + GET
    expenses/[id]/route.ts     # PATCH + DELETE
    categories/…, categories/[id]/…
components/
  ui/                    # shadcn primitives (don’t hand-edit; regenerate)
  layout/                # app-sidebar, command-palette, header
  expenses/              # tracker, form, list, filters, table pagination, stats, category-manager, …
  analytics/             # charts & summaries
  settings/                # e.g. display currency
providers/
  currency-preference-provider.tsx
config/
  api.ts                 # default retry options for lib/api-client.ts
constants/
  http.ts                # e.g. JSON Content-Type
lib/
  api-client.ts, db.ts, money.ts, expense-view.ts, expense-list-utils.ts, currencies.ts, …
  schemas/               # zod; expense.ts is shared by API and forms
  services/              # expenses, categories
  http/                  # errors, responses, idempotency
prisma/
  schema.prisma, migrations/
```

`AGENTS.md` is the full convention doc (architecture rules, definition of done, API shape).

## Getting started

### 1. Install deps

```bash
npm install
```

### 2. Configure env

Copy the example and fill in the Supabase URLs. The **Transaction Pooler** URL goes to `DATABASE_URL` (runtime, pgbouncer); the **Session Pooler** (or direct) URL goes to `DIRECT_URL` (used only by `prisma migrate`).

```bash
cp .env.example .env.local
# then edit .env.local
```

### 3. Migrate

```bash
npx prisma migrate dev --name init
```

### 4. Run

```bash
npm run dev
# http://localhost:3000
```

## API reference

All responses are `application/json`. Errors use `{ error: { code, message, details? } }`.

### `POST /api/expenses`

Creates an expense. Include an `Idempotency-Key` header (UUID) so retries don't create duplicates.

```http
POST /api/expenses
Content-Type: application/json
Idempotency-Key: 2f2b6e1c-...

{ "amount": "499.00", "category": "Food", "description": "Lunch", "date": "2026-04-20" }
```

- `201 Created` with the new resource on success.
- `200 OK` with the existing resource if the `Idempotency-Key` was already used (dedup).
- `400` with field-level `details` on validation failure.

### `GET /api/expenses`

Lists expenses. All query params are optional.

| Param      | Allowed values                                                                  | Default      |
| ---------- | ------------------------------------------------------------------------------- | ------------ |
| `category` | Exact name of a **saved** category (case-insensitive match)                      | (none)       |
| `sort`     | See `EXPENSE_SORT_OPTIONS` in `lib/schemas/expense.ts` (e.g. `date_desc`, `amount_asc`, …) | `date_desc`  |

```json
{
  "data": [{ "id": "cmo...", "amount": "499.00", "category": "Food", "description": "...", "date": "2026-04-20", "createdAt": "2026-04-24T14:56:26.352Z" }],
  "total": "499.00"
}
```

`total` is the sum of the returned rows, as a string — computed server-side on `Decimal` to avoid any float arithmetic.

## Data model

```prisma
model Expense {
  id          String   @id @default(cuid())
  amount      Decimal  @db.Decimal(14, 2)
  category    String   @db.VarChar(64)
  description String   @db.VarChar(500)
  date        DateTime @db.Date          // calendar date, no timezone
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([category])
  @@index([date(sort: Desc)])
}

model IdempotencyKey {
  key        String   @id @db.VarChar(128)
  resourceId String   @map("resource_id")
  createdAt  DateTime @default(now()) @map("created_at")

  expense Expense @relation(fields: [resourceId], references: [id], onDelete: Cascade)
}
```

- Indexes on `category` and `date DESC` cover the only queries we do.
- `IdempotencyKey.key` is unique; the service wraps the `Expense` insert and key insert in a single `prisma.$transaction`. On a concurrent retry race, a `P2002` unique-constraint violation causes the TX to rollback (dropping the orphan expense), then we return the winning request's row.

## UX resilience

Because the spec calls out real-world conditions, the UI was built for them:

- **Double-clicked submit / page refresh / flaky network.** The form generates one UUID at mount time and reuses it across retries of the same submit; the server dedupes by that key. A new key is minted after a successful save so the next expense isn't deduped.
- **Disabled-while-submitting** button + "Saving…" label.
- **Retry with exponential backoff** for 5xx and network errors (`lib/api-client.ts`), but **not** for 4xx (those are user errors; surface immediately).
- **Loading / empty / error states** in the list, not just the happy path.
- **Server-seeded initial data** from the server component so the first paint isn't a spinner.
- **Toast-based error surfacing** via `sonner` — no `alert()` or console-only errors.

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # run built server
npm run lint         # eslint
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
```

## What's intentionally not here (yet)

- **Server-side `limit`/`cursor` on `GET /api/expenses`** — the list is fully loaded for now; the table paginates in the client.
- **Auth / multi-tenant** — local single-user; adding sessions would be `@supabase/ssr` or similar plus middleware.
- **Automated tests** — service layer is still structured for Vitest + Testing Library when we add them.

The `/analytics` page already surfaces category spending; more reporting can build on the same `Decimal`-safe data.

See `AGENTS.md` for conventions, the API contract, and the definition-of-done checklist.
