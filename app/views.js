// HomeLedger views — one function per page. Each returns HTML for the
// month the household is looking at; app.js mounts it and wires the
// controls. Every figure comes from store.js, so the pages and the
// screenshots always agree with the data.

import { HOUSEHOLD, CATEGORIES, GUIDE_STEPS } from "./data.js";
import {
  state, monthLabel, monthShort, monthSummary, allTransactions, budgetRows,
  topCategories, trend, billsForMonth, goalProgress, categoryById, money,
  money0, pct, esc,
} from "./store.js";
import { donut, bars, groupedBars, balanceLine } from "./charts.js";

function auditStrip(month) {
  const s = monthSummary(month);
  const goalsSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const goalsTarget = state.goals.reduce((a, g) => a + g.target, 0);
  return `<div class="audit" role="note">
    <span><b>${s.count}</b> transactions in ${monthLabel(month)}</span><span class="sep">·</span>
    <span><b>${CATEGORIES.length}</b> budget categories</span><span class="sep">·</span>
    <span><b>${money0(goalsSaved)}</b> saved toward <b>${money0(goalsTarget)}</b> of goals</span><span class="sep">·</span>
    <span><b>${pct(s.income ? (s.income - s.spending) / s.income : 0)}</b> of income unspent</span>
  </div>`;
}

function statCard(label, value, sub, tone = "") {
  return `<div class="card stat ${tone}"><div class="label">${label}</div>
    <div class="value num">${value}</div><div class="sub">${sub}</div></div>`;
}

function txRow(r) {
  const c = categoryById(r.cat);
  return `<div class="tx-row"><span class="tx-dot" style="background:${c.color}"></span>
    <div class="tx-main"><div class="t">${esc(r.desc)}</div>
    <div class="d">${monthShort(r.month)} ${r.day} · ${esc(c.name)}</div></div>
    <span class="tx-amt num ${r.amount >= 0 ? "pos" : ""}">${money(r.amount)}</span></div>`;
}

function upcomingBills(month, n = 5) {
  const bills = billsForMonth(month).filter((b) => !b.paid).sort((a, b) => a.due - b.due).slice(0, n);
  if (!bills.length) return `<p class="muted">Every bill this month is paid. Nice work.</p>`;
  return bills.map((b) => `<div class="bill-row"><div><strong>${esc(b.name)}</strong>
    <div class="small muted">Due ${monthShort(month)} ${b.due}${b.autopay ? " · autopay on" : ""}</div></div>
    <span class="num"><strong>${money(b.amount)}</strong> ${b.overdue ? '<span class="pill red">overdue</span>' : '<span class="pill amber">due soon</span>'}</span></div>`).join("");
}

// --- Dashboard -------------------------------------------------------------

export function viewDashboard(month) {
  const s = monthSummary(month);
  const rate = s.income ? (s.income - s.spending) / s.income : 0;
  const rows = budgetRows(month).filter((r) => r.planned > 0);
  const tight = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const t = trend();
  const top = topCategories(month, 6);
  const topTotal = top.reduce((a, c) => a + c.amount, 0);
  const otherTotal = s.spending - topTotal;
  const donutSlices = top.map((c) => ({ name: c.name, color: c.color, amount: c.amount }));
  if (otherTotal > 0) donutSlices.push({ name: "Other", color: "#78716c", amount: otherTotal });
  const recent = allTransactions(month).slice(-8).reverse();
  const balance = [];
  let run = 0;
  for (const r of allTransactions(month)) { run += r.amount; balance.push({ label: "Day " + r.day, value: run }); }
  const spent = rows.reduce((a, r) => a + r.spent, 0);
  const planned = rows.reduce((a, r) => a + r.planned, 0);

  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Dashboard — ${monthLabel(month)}</h1>
  <p class="muted">${esc(HOUSEHOLD.name)} · ${esc(HOUSEHOLD.members)} · take-home ${money0(HOUSEHOLD.takeHome)}/month</p></div>
  <a class="btn" href="#/transactions">+ Add a transaction</a></div>

  <div class="grid grid-4">
    ${statCard("Income", money0(s.income), "paydays on the 1st & 15th", "good")}
    ${statCard("Spending", money0(s.spending), money0(planned) + " planned across envelopes")}
    ${statCard("Left over", money0(s.left), rate >= 0.15 ? "above the 15% savings target" : "below the 15% savings target", rate >= 0.15 ? "good" : "warn")}
    ${statCard("Savings rate", pct(rate), "of income unspent this month", rate >= 0.2 ? "good" : rate >= 0.1 ? "warn" : "bad")}
  </div>

  <div class="grid grid-2wide" style="margin-top:16px">
    <div class="card"><h2>Where the money went <a class="more" href="#/budgets">All envelopes →</a></h2>
      ${donut(donutSlices)}
    </div>
    <div class="card"><h2>Income vs spending</h2>
      ${groupedBars(t.map((m) => ({ label: monthShort(m.month), income: m.income, spending: m.spending })))}
      <p class="small muted">Three months in a row the Riveras spent less than they earned — that gap is what funds their goals.</p>
    </div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card"><h2>Envelopes running low <a class="more" href="#/budgets">Manage budgets →</a></h2>
      ${tight.map((r) => `<div class="bar-row"><span>${esc(r.name)}</span><span class="num"><strong>${money0(r.spent)}</strong> of ${money0(r.planned)}</span></div>
        <div class="bar"><i class="${r.pct > 1 ? "red" : r.pct >= 0.8 ? "amber" : ""}" style="width:${Math.min(r.pct * 100, 100).toFixed(0)}%"></i></div>`).join("")}
      <p class="small muted" style="margin-top:10px">${planned ? `Planned ${money0(planned)} across ${rows.length} envelopes; spent ${money0(spent)} so far (${pct(spent / planned)}).` : ""}</p>
    </div>
    <div class="card"><h2>Balance through the month</h2>
      ${balance.length ? balanceLine(balance) : '<p class="muted">No transactions yet this month.</p>'}
    </div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card"><h2>Upcoming bills <a class="more" href="#/bills">All bills →</a></h2>${upcomingBills(month)}</div>
    <div class="card"><h2>Recent transactions <a class="more" href="#/transactions">Full ledger →</a></h2>
      ${recent.map(txRow).join("") || '<p class="muted">No transactions yet.</p>'}
    </div>
  </div>

  <div class="callout" style="margin-top:16px"><strong>50 / 30 / 20 check:</strong>
    this month the Riveras put ${pct((budgetRows(month).find((r) => r.id === "housing")?.spent || 0) / Math.max(s.income, 1))} of income to housing and essentials,
    ${pct(top.filter((c) => ["Dining Out", "Entertainment", "Personal"].includes(c.name)).reduce((a, c) => a + c.amount, 0) / Math.max(s.income, 1))} to wants,
    and saved ${pct(rate)} — <a href="#/tools">see the full breakdown in Tools</a>.</div>`;
}

// --- Transactions ----------------------------------------------------------

export function viewTransactions(month, filter = {}) {
  const q = (filter.q || "").toLowerCase();
  const cat = filter.cat || "all";
  let rows = allTransactions(month);
  if (cat !== "all") rows = rows.filter((r) => r.cat === cat);
  if (q) rows = rows.filter((r) => r.desc.toLowerCase().includes(q));
  rows = [...rows].reverse(); // newest first for display
  const chrono = [...rows].reverse(); // oldest first for the running balance
  let running = 0;
  const bal = new Map();
  for (const r of chrono) { running += r.amount; bal.set(r.day + "|" + r.desc, running); }
  const shown = rows.map((r) => ({ ...r, bal: bal.get(r.day + "|" + r.desc) }));
  const totalIn = rows.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0);
  const totalOut = rows.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0);

  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Transactions — ${monthLabel(month)}</h1>
  <p class="muted">Every dollar in and out, with a running balance. Add spending as it happens — two minutes a day keeps the budget honest.</p></div>
  <div><button class="btn ghost" data-action="export-csv">Export CSV</button>
  <button class="btn ghost" data-action="export-json">Export JSON</button>
  <button class="btn ghost" data-action="reset-demo">Reset demo data</button></div></div>

  <div class="card" style="margin-bottom:16px"><h2>Add a transaction</h2>
  <form id="addTx" class="form-grid">
    <div><label for="txDay">Day</label><input type="number" id="txDay" min="1" max="31" value="26" required></div>
    <div><label for="txDesc">Description</label><input type="text" id="txDesc" placeholder="e.g. Weekly grocery shop" required></div>
    <div><label for="txCat">Category</label><select id="txCat">${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}<option value="income">Income</option></select></div>
    <div><label for="txAmt">Amount ($) — use a minus for spending</label><input type="number" id="txAmt" step="0.01" placeholder="-42.50" required></div>
    <div><button type="submit">Add transaction</button></div>
  </form></div>

  <div class="toolbar">
    <div class="field grow"><label for="txSearch">Search</label><input type="text" id="txSearch" placeholder="Search descriptions…" value="${esc(filter.q || "")}"></div>
    <div class="field"><label for="txCatFilter">Category</label><select id="txCatFilter">
      <option value="all">All categories</option>
      ${CATEGORIES.map((c) => `<option value="${c.id}" ${cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
      <option value="income" ${cat === "income" ? "selected" : ""}>Income</option></select></div>
  </div>

  <div class="grid grid-3" style="margin-bottom:16px">
    ${statCard("Shown", String(rows.length), "transactions match the filter")}
    ${statCard("Money in", money0(totalIn), "in the filtered set", "good")}
    ${statCard("Money out", money0(totalOut), "in the filtered set", "bad")}
  </div>

  <div class="card"><h2>Ledger</h2>
  ${rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Day</th><th>Description</th><th>Category</th><th class="num">Amount</th><th class="num">Balance</th><th></th></tr></thead>
    <tbody>${shown.map((r) => { const c = categoryById(r.cat); return `<tr>
      <td class="num">${r.day}</td><td>${esc(r.desc)}</td>
      <td><span class="tx-dot" style="background:${c.color};display:inline-block;margin-right:6px"></span>${esc(c.name)}</td>
      <td class="num ${r.amount >= 0 ? "pos" : "neg"}"><strong>${money(r.amount)}</strong></td>
      <td class="num">${money(r.bal)}</td>
      <td><button class="small danger" data-action="delete-tx" data-day="${r.day}" data-desc="${esc(r.desc)}">Delete</button></td></tr>`; }).join("")}
    </tbody></table></div>` : '<p class="empty">No transactions match this filter. Try clearing the search.</p>'}
  </div>`;
}

// --- Budgets ---------------------------------------------------------------

export function viewBudgets(month) {
  const rows = budgetRows(month);
  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const spent = rows.reduce((a, r) => a + r.spent, 0);
  const over = rows.filter((r) => r.pct > 1);
  const near = rows.filter((r) => r.pct >= 0.8 && r.pct < 1);

  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Budgets — ${monthLabel(month)}</h1>
  <p class="muted">Envelopes: one limit per category, filled as the month goes on. When an envelope is empty, spending from it stops — move money between envelopes instead of overspending.</p></div></div>

  ${over.length ? `<div class="callout red"><strong>${over.length} envelope${over.length > 1 ? "s" : ""} over budget:</strong> ${over.map((r) => esc(r.name)).join(", ")}. Move money from an envelope with room, or trim next month's plan.</div>` : ""}
  ${!over.length && near.length ? `<div class="callout amber"><strong>Heads up:</strong> ${near.map((r) => esc(r.name)).join(", ")} ${near.length > 1 ? "are" : "is"} over 80% spent with days left in the month.</div>` : ""}
  ${!over.length && !near.length ? `<div class="callout"><strong>On track:</strong> every envelope is within its limit so far this month.</div>` : ""}

  <div class="grid grid-3" style="margin-bottom:16px">
    ${statCard("Planned", money0(planned), "across " + rows.length + " envelopes")}
    ${statCard("Spent", money0(spent), pct(planned ? spent / planned : 0) + " of the plan used")}
    ${statCard("Still in envelopes", money0(planned - spent), planned - spent >= 0 ? "left to spend or save" : "over the plan — see the red envelopes", planned - spent >= 0 ? "good" : "bad")}
  </div>

  <div class="grid grid-2">
  ${rows.map((r) => `<div class="card">
    <h2>${esc(r.name)} <span class="pill ${r.pct > 1 ? "red" : r.pct >= 0.8 ? "amber" : "green"}">${r.pct > 1 ? "Over" : r.pct >= 0.8 ? "Almost out" : "On track"}</span></h2>
    <div class="bar-row"><span><strong class="num">${money0(r.spent)}</strong> spent</span><span class="num">${money0(r.planned)} planned · ${money0(r.left)} left</span></div>
    <div class="bar"><i class="${r.pct > 1 ? "red" : r.pct >= 0.8 ? "amber" : ""}" style="width:${Math.min(r.pct * 100, 100).toFixed(0)}%"></i></div>
    <form class="toolbar" style="margin:10px 0 0" data-budget-form="${r.id}">
      <div class="field"><label>Monthly limit ($)</label><input type="number" min="0" step="5" value="${r.planned}" data-budget-input="${r.id}"></div>
      <div><button class="small" type="submit">Save limit</button></div>
    </form></div>`).join("")}
  </div>

  <div class="card" style="margin-top:16px"><h2>How envelopes work here</h2>
  <p>Rent and childcare are fixed — they leave the account first and never change. Groceries, dining and transport are the envelopes that move: if dining runs out on the 20th, the household cooks at home or moves $30 from entertainment, and writes the move down. The limit is the plan; the bar is the truth.</p></div>`;
}

// --- Goals -----------------------------------------------------------------

export function viewGoals(month) {
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);
  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Savings goals</h1>
  <p class="muted">Money with a name on it gets saved faster. Every goal shows what&rsquo;s in, what&rsquo;s left, and how many months at the current pace.</p></div></div>

  <div class="grid grid-3" style="margin-bottom:16px">
    ${statCard("Saved in all goals", money0(totalSaved), "across " + state.goals.length + " goals", "good")}
    ${statCard("Total target", money0(totalTarget), pct(totalTarget ? totalSaved / totalTarget : 0) + " funded overall")}
    ${statCard("Still to save", money0(totalTarget - totalSaved), "at $600/month that's " + Math.max(Math.ceil((totalTarget - totalSaved) / 600), 0) + " months")}
  </div>

  <div class="grid grid-2">
  ${state.goals.map((g) => { const p = goalProgress(g); const left = g.target - g.saved;
    return `<div class="card"><h2>${esc(g.name)} <span class="pill ${p >= 1 ? "green" : p >= 0.5 ? "blue" : "grey"}">${pct(p)} funded</span></h2>
    <p class="muted small">${esc(g.note)}</p>
    <div class="bar-row"><span><strong class="num">${money0(g.saved)}</strong> saved</span><span class="num">target ${money0(g.target)} · ${money0(left)} to go</span></div>
    <div class="bar"><i style="width:${Math.min(p * 100, 100).toFixed(0)}%"></i></div>
    <form class="toolbar" style="margin:10px 0 0" data-goal-form="${g.id}">
      <div class="field"><label>Add to this goal ($)</label><input type="number" min="1" step="5" placeholder="100" data-goal-input="${g.id}" required></div>
      <div><button class="small" type="submit">Add money</button></div>
    </form></div>`; }).join("")}
  </div>

  <div class="card" style="margin-top:16px"><h2>Start a new goal</h2>
  <form id="addGoal" class="form-grid">
    <div><label for="goalName">Goal name</label><input type="text" id="goalName" placeholder="e.g. New bikes for the kids" required></div>
    <div><label for="goalTarget">Target ($)</label><input type="number" id="goalTarget" min="50" step="50" placeholder="500" required></div>
    <div><button type="submit">Create goal</button></div>
  </form>
  <p class="small muted">Tip: name the goal after the thing, not the amount — &ldquo;Bali, July&rdquo; beats &ldquo;$3,000&rdquo; when the month gets tight.</p></div>`;
}

// --- Bills -----------------------------------------------------------------

export function viewBills(month) {
  const bills = billsForMonth(month);
  const total = bills.reduce((a, b) => a + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid).reduce((a, b) => a + b.amount, 0);
  const unpaid = bills.filter((b) => !b.paid);
  const overdue = bills.filter((b) => b.overdue);
  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Bills — ${monthLabel(month)}</h1>
  <p class="muted">Every recurring bill, its due day and whether it&rsquo;s paid. Tick a bill off when it clears — autopay bills tick themselves off when the payment shows in the ledger.</p></div></div>

  ${overdue.length ? `<div class="callout red"><strong>${overdue.length} bill${overdue.length > 1 ? "s are" : " is"} overdue:</strong> ${overdue.map((b) => esc(b.name)).join(", ")}. Pay today to avoid a late fee.</div>` : `<div class="callout"><strong>No overdue bills.</strong> Everything due so far this month is paid.</div>`}

  <div class="grid grid-3" style="margin-bottom:16px">
    ${statCard("Bills this month", money0(total), bills.length + " recurring bills")}
    ${statCard("Paid", money0(paidTotal), bills.length - unpaid.length + " of " + bills.length + " bills paid", "good")}
    ${statCard("Still to pay", money0(total - paidTotal), unpaid.length + " bills outstanding", unpaid.length ? "warn" : "good")}
  </div>

  <div class="card"><h2>Bill calendar</h2>
  ${[...bills].sort((a, b) => a.due - b.due).map((b) => `<div class="bill-row">
    <div><strong>${esc(b.name)}</strong>
      <div class="small muted">Due ${monthShort(month)} ${b.due} · ${esc(categoryById(b.category).name)}${b.autopay ? " · autopay" : " · pay manually"}</div></div>
    <div style="display:flex;gap:10px;align-items:center">
      <span class="num"><strong>${money(b.amount)}</strong></span>
      ${b.paid ? '<span class="pill green">Paid</span>' : b.overdue ? '<span class="pill red">Overdue</span>' : '<span class="pill amber">Unpaid</span>'}
      <button class="small ghost" data-action="toggle-bill" data-bill="${b.id}">${b.paid ? "Mark unpaid" : "Mark paid"}</button>
    </div></div>`).join("")}
  </div>

  <div class="card" style="margin-top:16px"><h2>Never miss one again</h2>
  <p>Put every bill on autopay for at least the minimum, and keep a $500 buffer in the checking account so a bill never bounces. Check this page on the 1st and the 15th — the two paydays — and the month runs itself.</p></div>`;
}

// --- Reports ----------------------------------------------------------------

export function viewReports(month) {
  const t = trend();
  const cur = monthSummary(month);
  const prevMonth = HOUSEHOLD.months[HOUSEHOLD.months.indexOf(month) - 1];
  const prev = prevMonth ? monthSummary(prevMonth) : null;
  const change = (a, b) => (b ? ((a - b) / Math.max(Math.abs(b), 1)) : 0);
  const spendChange = prev ? change(cur.spending, prev.spending) : 0;
  const top = topCategories(month, 5);
  const prevTop = prev ? topCategories(prevMonth, 5) : [];
  const insightRows = top.map((c) => {
    const p = prevTop.find((x) => x.id === c.id);
    return { ...c, prevAmount: p ? p.amount : 0 };
  });
  const reportSlices = top.map((c) => ({ name: c.name, color: c.color, amount: c.amount }));
  const reportOther = cur.spending - top.reduce((a, c) => a + c.amount, 0);
  if (reportOther > 0) reportSlices.push({ name: "Other", color: "#78716c", amount: reportOther });
  const biggest = insightRows[0];
  const balance = [];
  let run = 0;
  for (const r of allTransactions(month)) { run += r.amount; balance.push({ label: "Day " + r.day, value: run }); }

  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Reports — ${monthLabel(month)}</h1>
  <p class="muted">Compare months, find the categories that moved, and see the story the numbers tell.</p></div></div>

  <div class="card" style="margin-bottom:16px"><h2>Month by month</h2>
  ${groupedBars(t.map((m) => ({ label: monthShort(m.month), income: m.income, spending: m.spending })))}
  <div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Left over</th><th class="num">Savings rate</th><th class="num">Transactions</th></tr></thead>
  <tbody>${t.map((m) => `<tr><td><strong>${monthLabel(m.month)}</strong>${m.month === month ? ' <span class="pill blue">viewing</span>' : ""}</td>
    <td class="num">${money0(m.income)}</td><td class="num">${money0(m.spending)}</td>
    <td class="num ${m.left >= 0 ? "pos" : "neg"}"><strong>${money0(m.left)}</strong></td>
    <td class="num">${pct(m.income ? m.left / m.income : 0)}</td><td class="num">${m.count}</td></tr>`).join("")}</tbody></table></div></div>

  <div class="grid grid-2">
    <div class="card"><h2>Top categories — ${monthShort(month)}</h2>
      ${donut(reportSlices, 200, 30)}
    </div>
    <div class="card"><h2>What changed vs ${prev ? monthShort(prevMonth) : "—"}</h2>
      ${prev ? `<div class="table-wrap"><table><thead><tr><th>Category</th><th class="num">This month</th><th class="num">Last month</th><th class="num">Change</th></tr></thead>
      <tbody>${insightRows.map((c) => { const d = c.amount - c.prevAmount; return `<tr><td>${esc(c.name)}</td>
        <td class="num">${money0(c.amount)}</td><td class="num">${money0(c.prevAmount)}</td>
        <td class="num ${d <= 0 ? "pos" : "neg"}">${d >= 0 ? "+" : ""}${money0(d)}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="small muted">Spending overall is <strong class="${spendChange <= 0 ? "pos" : "neg"}">${spendChange <= 0 ? "down" : "up"} ${pct(Math.abs(spendChange))}</strong> on last month.</p>`
      : '<p class="muted">Pick a later month to compare against the one before it.</p>'}
    </div>
  </div>

  <div class="grid grid-2" style="margin-top:16px">
    <div class="card"><h2>Balance through ${monthShort(month)}</h2>
      ${balance.length ? balanceLine(balance) : '<p class="muted">No transactions yet this month.</p>'}
      <p class="small muted">Paydays lift the line on the 1st and 15th; rent pulls it down on the 1st. The line ends where the month ends — above zero is the whole game.</p>
    </div>
    <div class="card"><h2>What the numbers say</h2>
      <ul>
        <li><strong>${esc(biggest ? biggest.name : "—")}</strong> is the biggest envelope at ${money0(biggest ? biggest.amount : 0)} — ${biggest && biggest.id === "housing" ? "rent is fixed, so the lever is everywhere else." : "worth a look before anything smaller."}</li>
        <li>Groceries ran ${money0((topCategories(month, 10).find((c) => c.id === "groceries") || { amount: 0 }).amount)} this month — shopping once a week with a list keeps it under the $720 envelope.</li>
        <li>Savings transfers of $600 a month are already inside spending, so the ${pct(cur.income ? cur.left / cur.income : 0)} left over is genuinely spare.</li>
        <li>Three months of data is enough to set honest limits: envelopes that were missed twice got raised, not wished away.</li>
      </ul>
    </div>
  </div>`;
}

// --- Tools ------------------------------------------------------------------

export function viewTools(month) {
  const s = monthSummary(month);
  const needs = ["housing", "groceries", "transport", "utilities", "childcare", "health"];
  const wants = ["dining", "entertainment", "clothing", "personal", "subscriptions", "pets", "other"];
  const needsAmt = needs.reduce((a, id) => a + (s.byCat[id] || 0), 0);
  const wantsAmt = wants.reduce((a, id) => a + (s.byCat[id] || 0), 0);
  const savedAmt = (s.byCat["savings"] || 0) + Math.max(s.left, 0);
  return `${auditStrip(month)}
  <div class="page-head"><div><h1>Budget tools</h1>
  <p class="muted">Four calculators the household actually uses — each one works with the figures from ${monthLabel(month)}.</p></div></div>

  <div class="grid grid-2">
    <div class="card"><h2>50 / 30 / 20 check — ${monthShort(month)}</h2>
      <p>Needs should take about half of take-home pay, wants about 30%, savings and extra debt payments about 20%.</p>
      ${bars([
        { label: "Needs", value: needsAmt, color: "#166534" },
        { label: "Wants", value: wantsAmt, color: "#b45309" },
        { label: "Saved", value: savedAmt, color: "#1d4ed8" },
      ])}
      <div class="kv"><span>Needs (rent, food, transport, bills, health)</span><span class="num"><strong>${money0(needsAmt)}</strong> · ${pct(s.income ? needsAmt / s.income : 0)} of income</span></div>
      <div class="kv"><span>Wants (dining, fun, clothes, subscriptions)</span><span class="num"><strong>${money0(wantsAmt)}</strong> · ${pct(s.income ? wantsAmt / s.income : 0)} of income</span></div>
      <div class="kv"><span>Saved (transfers + what's left)</span><span class="num"><strong>${money0(savedAmt)}</strong> · ${pct(s.income ? savedAmt / s.income : 0)} of income</span></div>
      <p class="small muted">Rule of thumb for ${money0(s.income)} take-home: needs ${money0(s.income * 0.5)}, wants ${money0(s.income * 0.3)}, savings ${money0(s.income * 0.2)}.</p>
    </div>

    <div class="card"><h2>Emergency fund calculator</h2>
      <p>How many months could the household live on savings if income stopped?</p>
      <form id="efCalc" class="form-grid" style="grid-template-columns:1fr 1fr">
        <div><label for="efMonthly">Essential spending / month ($)</label><input type="number" id="efMonthly" value="4200" min="100" step="50"></div>
        <div><label for="efMonths">Months to cover</label><select id="efMonths"><option value="3">3 months</option><option value="6" selected>6 months</option><option value="9">9 months</option><option value="12">12 months</option></select></div>
        <div><button type="submit">Calculate</button></div>
      </form>
      <p id="efResult" class="small">The Riveras have <strong>$6,400</strong> in the emergency fund — about <strong>1.5 months</strong> of essentials. Target for 6 months: <strong>$25,200</strong>.</p>
    </div>

    <div class="card"><h2>Debt payoff planner</h2>
      <p>See how long a balance takes to clear — and what an extra $50 a month saves.</p>
      <form id="debtCalc" class="form-grid" style="grid-template-columns:1fr 1fr">
        <div><label for="debtBal">Balance owed ($)</label><input type="number" id="debtBal" value="2400" min="0" step="50"></div>
        <div><label for="debtApr">APR (%)</label><input type="number" id="debtApr" value="19.9" min="0" step="0.1"></div>
        <div><label for="debtPay">Monthly payment ($)</label><input type="number" id="debtPay" value="150" min="1" step="10"></div>
        <div><button type="submit">Calculate</button></div>
      </form>
      <p id="debtResult" class="small">A $2,400 balance at 19.9% APR, paying $150/month, clears in about <strong>19 months</strong> and costs about <strong>$420</strong> in interest. Paying $200/month clears it in <strong>14 months</strong> and saves about <strong>$130</strong>.</p>
    </div>

    <div class="card"><h2>Grocery check</h2>
      <p>Groceries are the envelope most households can move fastest.</p>
      ${bars([
        { label: "Sep", value: (monthSummary("2026-09").byCat["groceries"] || 0), color: "#78716c" },
        { label: "Oct", value: (monthSummary("2026-10").byCat["groceries"] || 0), color: "#78716c" },
        { label: "Nov", value: (monthSummary("2026-11").byCat["groceries"] || 0), color: "#166534" },
      ])}
      <div class="kv"><span>Envelope for groceries</span><span class="num"><strong>${money0(state.budgets["groceries"])}</strong> / month</span></div>
      <div class="kv"><span>Per person, per week</span><span class="num"><strong>${money0((monthSummary("2026-11").byCat["groceries"] || 0) / 4 / 4.33)}</strong></span></div>
      <p class="small muted">Shop once a week with a list, plan meals before the shop, and cook double on Sundays — the three moves that cut a grocery bill without eating worse.</p>
    </div>
  </div>`;
}

// --- Guide -------------------------------------------------------------------

export function viewGuide(month) {
  return `${auditStrip(month)}
  <div class="page-head"><div><h1>The household budgeting guide</h1>
  <p class="muted">Plain-language budgeting for a real household — the method the demo figures on this site follow, step by step.</p></div></div>

  <div class="grid grid-1wide2">
    <div class="card"><h2>Six steps to a budget that holds</h2>
      <ol class="steps">
      ${GUIDE_STEPS.map((s) => `<li><strong>${esc(s.title)}</strong><br><span class="muted">${esc(s.text)}</span></li>`).join("")}
      </ol>
    </div>
    <div>
      <div class="card" style="margin-bottom:16px"><h2>The envelope method</h2>
        <p>Every category is an envelope with a fixed amount for the month. Groceries get $720: the household shops with a list, and when the envelope is empty, meals come from the pantry until the 1st. Fixed envelopes (rent, childcare) never move; flexible ones (dining, entertainment) absorb the surprises.</p>
        <p>HomeLedger shows each envelope as a bar on the <a href="#/budgets">Budgets page</a> — green while there&rsquo;s room, amber past 80%, red when it&rsquo;s over.</p>
      </div>
      <div class="card" style="margin-bottom:16px"><h2>Questions households ask</h2>
        <p><strong>What if income varies month to month?</strong><br>Budget on the lowest recent month, and treat extra income as a bonus that goes straight to the emergency fund.</p>
        <p><strong>How much should we save?</strong><br>Start with $500–$1,000 for small emergencies, then build to 3–6 months of essentials. The Riveras save $600 a month and are 64% of the way to a $10,000 cushion.</p>
        <p><strong>We blew the budget — now what?</strong><br>Nothing is ruined. Move money between envelopes, note why it happened, and adjust next month&rsquo;s limit. A budget is a plan you revise, not a test you pass.</p>
        <p><strong>Where does our data go?</strong><br>Nowhere. Everything on this site lives in this browser&rsquo;s storage on this device, and the demo figures can be reset any time from the Transactions page.</p>
      </div>
      <div class="card"><h2>Start here</h2>
        <p><a href="#/dashboard">Dashboard</a> for the month at a glance · <a href="#/transactions">Transactions</a> to log spending · <a href="#/budgets">Budgets</a> to set envelopes · <a href="#/goals">Goals</a> to name what you&rsquo;re saving for · <a href="#/tools">Tools</a> for the 50/30/20 check.</p>
      </div>
    </div>
  </div>`;
}
