# HomeLedger — Household Budget Planner

A working household budget site that runs entirely in the browser from static
files — no build step, no network requests, no account. Open `app/index.html`
(or serve `app/` with any static server) and it works on desktop and on a phone.

## What it does

- **Dashboard** — income, spending, what's left, savings rate, where the money
  went (donut), income vs spending across three months, envelopes running low,
  balance through the month, upcoming bills and recent transactions.
- **Transactions** — the full ledger with a running balance, search and category
  filters, add/delete, and CSV/JSON export. Saved in the browser.
- **Budgets** — one envelope per category with a limit you can change; bars turn
  amber past 80% and red when over.
- **Goals** — savings goals with progress, add money to a goal, create new goals.
- **Bills** — every recurring bill with its due day, paid automatically when the
  payment shows in the ledger, or ticked off by hand.
- **Reports** — month-by-month comparison, top categories, what changed vs last
  month, and the story the numbers tell.
- **Tools** — a 50/30/20 check against the real month, an emergency-fund
  calculator, a debt payoff planner, and a grocery check.
- **Guide** — plain-language budgeting: six steps, the envelope method, and the
  questions households actually ask.

## Demo household

The site ships with the Rivera household's own figures: three months of real
transactions (September–November 2026), 14 budget envelopes, 4 savings goals
and 13 recurring bills. Add, edit or delete anything — changes are saved in
this browser only, and the demo data can be restored from the Transactions page.

## Run it

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into the output directory and writes `dossier.json` with the vendored
`vendor/makefun-frontend.ts` library.

Built as an entry for the make.fun "Make the best household budget site"
bounty, as @ryk07. License: MIT.
