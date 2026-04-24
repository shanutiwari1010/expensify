# Expensify

A small, production-minded personal finance tracker. Add expenses, filter by category, sort by date, and see the running total — built to survive the realities of unreliable networks, double-clicked submits, and page refreshes.

## What's in the box

- **Backend**: `POST /api/expenses`, `GET /api/expenses` (Next.js Route Handlers).
- **Frontend**: a single screen with an add-expense form, a filterable/sortable list, and a running total.
- **DB**: Supabase PostgreSQL via Prisma. Money is stored as `Decimal(14, 2)` — never a float.
- **Retry-safe writes**: `POST` is idempotent via an `Idempotency-Key` header, protected by a transaction.

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
  api/expenses/route.ts     # POST + GET /api/expenses
  layout.tsx                # Mounts <Toaster />
  page.tsx                  # Server-seeds initial list, renders <ExpenseTracker />
components/
  expenses/                 # Feature UI
    expense-form.tsx        # RHF + zodResolver + stable idempotency key
    expense-filters.tsx     # Category filter + sort indicator
    expense-list.tsx        # Table with loading/empty states
    expense-total.tsx       # Total chip
    expense-tracker.tsx     # Client-side state container
  ui/                       # shadcn primitives (don't hand-edit)
lib/
  api-client.ts             # fetch wrapper with retry-with-same-key
  db.ts                     # Prisma client singleton
  money.ts                  # Decimal helpers + Intl formatter
  constants/categories.ts   # Fixed category enum
  http/
    errors.ts               # ApiError class
    responses.ts            # jsonOk / jsonCreated / jsonError
  schemas/
    expense.ts              # zod — shared by API + form
  services/
    expenses.ts             # Business logic (createExpense, listExpenses)
prisma/
  schema.prisma             # Expense + IdempotencyKey models
  migrations/               # Generated SQL
```

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
| `category` | `Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Health`, `Other`    | (none)       |
| `sort`     | `date_desc`                                                                     | `date_desc`  |

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

Per the spec, the following are nice-to-haves we didn't ship in the first pass but are one small change each:

- Per-category summary view (just another `groupBy` query).
- Automated tests (Vitest + Testing Library; the service is already easy to unit-test).
- Auth (would pull in `@supabase/ssr` + a session middleware).

See `AGENTS.md` for the full set of project conventions, architectural rules, and the definition-of-done checklist the code is held to.
