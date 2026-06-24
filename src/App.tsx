/**
 * Phase 1 scaffold placeholder.
 * The real app (lock screen, dashboard, input flows) is built from Phase 3 onward.
 * No financial logic lives here yet — see the build phases in README.md.
 */
export default function App() {
  return (
    <main className="flex min-h-full items-center justify-center bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm dark:border-slate-800">
        <h1 className="text-2xl font-semibold tracking-tight">Finance Guru</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Local-first personal finance &amp; budgeting · Malaysia
        </p>
        <p className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Scaffold ready (Phase 1). Calculation core, encrypted storage, budgeting, and UI are
          built in later phases.
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Estimates only — not financial or tax advice. Always confirm figures against your payslip
          and LHDN / KWSP / PERKESO.
        </p>
      </section>
    </main>
  );
}
