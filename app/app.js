// HomeLedger app shell — routing, the month picker, and the wiring for
// every control on every page. The site is a hash-routed single page:
// #/dashboard, #/transactions, #/budgets, #/goals, #/bills, #/reports,
// #/tools and #/guide, so each section is a link the household can reach.

import { HOUSEHOLD } from "./data.js";
import {
  state, monthsAvailable, monthLabel, addTransaction, deleteTransaction,
  setBudget, addToGoal, addGoal, toggleBill, resetDemo, money0, esc,
} from "./store.js";
import {
  viewDashboard, viewTransactions, viewBudgets, viewGoals,
  viewBills, viewReports, viewTools, viewGuide,
} from "./views.js";

const app = document.getElementById("app");
const monthPick = document.getElementById("monthPick");
let month = HOUSEHOLD.currentMonth;
let txFilter = { q: "", cat: "all" };

const ROUTES = {
  dashboard: viewDashboard,
  transactions: viewTransactions,
  budgets: viewBudgets,
  goals: viewGoals,
  bills: viewBills,
  reports: viewReports,
  tools: viewTools,
  guide: viewGuide,
};

for (const m of monthsAvailable()) {
  const opt = document.createElement("option");
  opt.value = m;
  opt.textContent = monthLabel(m);
  if (m === month) opt.selected = true;
  monthPick.appendChild(opt);
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function render() {
  const hash = (location.hash || "#/dashboard").replace(/^#\//, "");
  const route = ROUTES[hash] ? hash : "dashboard";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === route);
  });
  app.innerHTML = route === "transactions"
    ? viewTransactions(month, txFilter)
    : ROUTES[route](month);
  window.scrollTo(0, 0);
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function toCSV(rows) {
  const head = "month,day,description,category,amount\n";
  return head + rows.map((r) => `${r.month},${r.day},"${r.desc.replace(/"/g, '""')}",${r.cat},${r.amount}`).join("\n");
}

monthPick.addEventListener("change", () => {
  month = monthPick.value;
  render();
});

window.addEventListener("hashchange", render);

// --- Delegated controls: every button and form on every page ---------------

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "delete-tx") {
    if (deleteTransaction(month, Number(btn.dataset.day), btn.dataset.desc)) {
      toast("Transaction deleted.");
      render();
    }
  } else if (action === "toggle-bill") {
    toggleBill(month, btn.dataset.bill);
    render();
  } else if (action === "export-csv") {
    import("./store.js").then((s) => {
      download(`homeledger-${month}.csv`, toCSV(s.allTransactions(month)), "text/csv");
      toast("CSV downloaded.");
    });
  } else if (action === "export-json") {
    import("./store.js").then((s) => {
      download(`homeledger-${month}.json`, JSON.stringify(s.allTransactions(month), null, 2), "application/json");
      toast("JSON downloaded.");
    });
  } else if (action === "reset-demo") {
    if (window.confirm("Reset all figures to the original demo household data? Your added transactions, budget changes and goal contributions will be removed.")) {
      resetDemo();
      toast("Demo data restored.");
      render();
    }
  }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === "addTx") {
    const day = Number(document.getElementById("txDay").value);
    const desc = document.getElementById("txDesc").value.trim();
    const cat = document.getElementById("txCat").value;
    const amount = Number(document.getElementById("txAmt").value);
    if (!desc || !amount || day < 1 || day > 31) { toast("Fill in a day, a description and an amount."); return; }
    addTransaction(month, day, desc, cat, amount);
    toast("Transaction added.");
    render();
  } else if (form.id === "addGoal") {
    const name = document.getElementById("goalName").value.trim();
    const target = Number(document.getElementById("goalTarget").value);
    if (!name || !target || target < 1) { toast("Give the goal a name and a target."); return; }
    addGoal(name, target);
    toast("Goal created.");
    render();
  } else if (form.dataset.budgetForm) {
    const input = form.querySelector("[data-budget-input]");
    const amount = Number(input.value);
    if (Number.isNaN(amount) || amount < 0) { toast("Enter a limit of $0 or more."); return; }
    setBudget(form.dataset.budgetForm, amount);
    toast("Budget limit saved.");
    render();
  } else if (form.dataset.goalForm) {
    const input = form.querySelector("[data-goal-input]");
    const amount = Number(input.value);
    if (!amount || amount < 1) { toast("Enter an amount of $1 or more."); return; }
    addToGoal(form.dataset.goalForm, amount);
    toast("Added " + money0(amount) + " to the goal.");
    render();
  } else if (form.id === "efCalc") {
    const essentials = Number(document.getElementById("efMonthly").value) || 0;
    const months = Number(document.getElementById("efMonths").value) || 6;
    const target = essentials * months;
    const have = state.goals.find((g) => g.id === "emergency")?.saved || 0;
    document.getElementById("efResult").innerHTML =
      `Target for ${months} months of essentials: <strong>${money0(target)}</strong>. ` +
      `The household has <strong>${money0(have)}</strong> — ${money0(Math.max(target - have, 0))} to go. ` +
      `At $400/month that's about <strong>${Math.max(Math.ceil((target - have) / 400), 0)} months</strong>.`;
  } else if (form.id === "debtCalc") {
    const bal = Number(document.getElementById("debtBal").value) || 0;
    const apr = Number(document.getElementById("debtApr").value) || 0;
    const pay = Number(document.getElementById("debtPay").value) || 0;
    const r = apr / 100 / 12;
    let b = bal, months = 0, interest = 0;
    while (b > 0 && months < 600) {
      const i = b * r;
      interest += i;
      b = b + i - pay;
      months++;
      if (pay <= i) { months = -1; break; }
    }
    const el = document.getElementById("debtResult");
    if (months < 0) {
      el.innerHTML = `The monthly payment of <strong>${money0(pay)}</strong> doesn't cover the interest — the balance would grow. Raise the payment above <strong>${money0(bal * r)}</strong> a month.`;
    } else {
      const faster = pay + 50;
      let b2 = bal, m2 = 0, int2 = 0;
      while (b2 > 0 && m2 < 600) { const i2 = b2 * r; int2 += i2; b2 = b2 + i2 - faster; m2++; }
      el.innerHTML = `A ${money0(bal)} balance at ${apr}% APR, paying ${money0(pay)}/month, clears in about <strong>${months} months</strong> and costs about <strong>${money0(interest)}</strong> in interest. ` +
        `Paying ${money0(faster)}/month clears it in <strong>${m2} months</strong> and saves about <strong>${money0(interest - int2)}</strong>.`;
    }
  }
});

// Search + category filter on the Transactions page (re-render on input).
document.addEventListener("input", (e) => {
  if (e.target.id === "txSearch") {
    txFilter.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const next = document.getElementById("txSearch");
    if (next) { next.focus(); next.setSelectionRange(pos, pos); }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "txCatFilter") {
    txFilter.cat = e.target.value;
    render();
  }
});

render();
