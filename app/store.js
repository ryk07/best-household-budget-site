// HomeLedger store — state, persistence and the arithmetic behind the site.
// The demo household's figures load first; anything the household adds,
// edits or deletes is saved in this browser's localStorage and wins over
// the demo data on the next visit. Nothing leaves the device.

import { HOUSEHOLD, CATEGORIES, BUDGETS, GOALS, BILLS, TRANSACTIONS } from "./data.js";

const KEY = "homeledger-v1";

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const base = {
    tx: deepCopy(TRANSACTIONS),
    budgets: { ...BUDGETS },
    goals: deepCopy(GOALS),
    billsPaid: {}, // "YYYY-MM:billId" -> true
    nextTxId: 1000,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    if (saved && saved.tx) return { ...base, ...saved };
  } catch (e) { /* private mode or corrupt save: fall back to demo data */ }
  return base;
}

export const state = loadState();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      tx: state.tx,
      budgets: state.budgets,
      goals: state.goals,
      billsPaid: state.billsPaid,
      nextTxId: state.nextTxId,
    }));
  } catch (e) { /* storage full or unavailable: the site still works in memory */ }
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  const fresh = loadState();
  state.tx = fresh.tx;
  state.budgets = fresh.budgets;
  state.goals = fresh.goals;
  state.billsPaid = {};
  state.nextTxId = 1000;
}

// --- Lookups ---------------------------------------------------------------

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, name: "Other", color: "#78716c" };
}

export function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthShort(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

// --- Transactions ----------------------------------------------------------

export function allTransactions(month) {
  const rows = [];
  for (const [m, list] of Object.entries(state.tx)) {
    if (month && m !== month) continue;
    for (const [day, desc, cat, amount] of list) {
      rows.push({ month: m, day, desc, cat, amount, id: `${m}-${day}-${desc}` });
    }
  }
  rows.sort((a, b) => (a.month + String(a.day).padStart(2, "0")).localeCompare(b.month + String(b.day).padStart(2, "0")));
  return rows;
}

export function monthSummary(month) {
  const rows = allTransactions(month);
  let income = 0, spending = 0;
  const byCat = {};
  for (const r of rows) {
    if (r.cat === "income" || r.amount > 0) income += r.amount;
    else {
      spending += -r.amount;
      byCat[r.cat] = (byCat[r.cat] || 0) + -r.amount;
    }
  }
  return { income, spending, left: income - spending, count: rows.length, byCat };
}

export function addTransaction(month, day, desc, cat, amount) {
  if (!state.tx[month]) state.tx[month] = [];
  state.tx[month].push([day, desc, cat, amount]);
  save();
}

export function deleteTransaction(month, day, desc) {
  const list = state.tx[month] || [];
  const i = list.findIndex((r) => r[0] === day && r[1] === desc);
  if (i >= 0) { list.splice(i, 1); save(); return true; }
  return false;
}

// --- Budgets ---------------------------------------------------------------

export function budgetRows(month) {
  const { byCat } = monthSummary(month);
  return CATEGORIES.filter((c) => state.budgets[c.id] !== undefined).map((c) => {
    const planned = state.budgets[c.id];
    const spent = byCat[c.id] || 0;
    return { ...c, planned, spent, left: planned - spent, pct: planned ? spent / planned : 0 };
  });
}

export function setBudget(catId, amount) {
  state.budgets[catId] = amount;
  save();
}

// --- Goals -----------------------------------------------------------------

export function goalProgress(goal) {
  return goal.target ? goal.saved / goal.target : 0;
}

export function addToGoal(goalId, amount) {
  const g = state.goals.find((x) => x.id === goalId);
  if (g) { g.saved = Math.max(0, g.saved + amount); save(); }
}

export function addGoal(name, target) {
  state.goals.push({ id: "goal-" + state.nextTxId++, name, note: "Added by the household", target, saved: 0 });
  save();
}

// --- Bills -----------------------------------------------------------------

export function billStatus(month, bill) {
  const key = month + ":" + bill.id;
  // A bill counts as paid when the ledger holds a payment for it: the
  // same name (before the " — ") and an amount within $5 of the bill,
  // since utility bills vary a little from the estimate.
  const nameKey = bill.name.split("—")[0].trim().toLowerCase();
  const paidInTx = (state.tx[month] || []).some((r) =>
    r[1].toLowerCase().includes(nameKey) &&
    Math.abs(Math.abs(r[3]) - bill.amount) <= 5
  );
  // An explicit tap on "Mark paid / unpaid" wins over the ledger check.
  if (key in state.billsPaid) return state.billsPaid[key];
  return paidInTx;
}

export function toggleBill(month, billId) {
  const key = month + ":" + billId;
  const bill = BILLS.find((b) => b.id === billId);
  // Flip the effective status (ledger-paid counts as paid), so the button
  // always does what its label says.
  state.billsPaid[key] = bill ? !billStatus(month, bill) : !state.billsPaid[key];
  save();
}

export function billsForMonth(month) {
  const day = month === HOUSEHOLD.currentMonth ? 26 : 31;
  return BILLS.map((b) => ({ ...b, paid: billStatus(month, b), overdue: !billStatus(month, b) && b.due < day }));
}

// --- Cross-month -----------------------------------------------------------

export function monthsAvailable() {
  return [...HOUSEHOLD.months].sort();
}

export function trend() {
  return monthsAvailable().map((m) => ({ month: m, ...monthSummary(m) }));
}

export function topCategories(month, n = 5) {
  const { byCat } = monthSummary(month);
  return Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([id, amount]) => ({ ...categoryById(id), amount }));
}

// --- Formatting ------------------------------------------------------------

export function money(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money0(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

export function pct(n) {
  return Math.round(n * 100) + "%";
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
