import { Suspense, lazy } from 'react';
import { useVault } from '../state/VaultContext';
import { useTheme } from './theme';
import { ThemeToggle } from './ThemeToggle';

const Hero3D = lazy(() => import('./Hero3D'));

function HeroFallback() {
  return (
    <div className="h-full w-full animate-pulse rounded-3xl bg-gradient-to-br from-indigo-500/20 to-amber-400/20" />
  );
}

const FEATURES = [
  {
    icon: '₪',
    title: 'Real Malaysian net pay',
    body: 'Gross → net after EPF, SOCSO, EIS and PCB, using the official statutory tables. Override any line from your payslip.',
  },
  {
    icon: '◑',
    title: 'Smart budgeting',
    body: 'Split what’s left into savings, investments and spending with your own percentages — no rigid rules.',
  },
  {
    icon: '◆',
    title: 'Emergency fund & goals',
    body: 'Track months of cover, set goals with deadlines, and see the monthly contribution to hit them.',
  },
  {
    icon: '◷',
    title: 'Dynamic daily budget',
    body: 'A live “spend today” number that recomputes every time you log an expense and as the month runs down.',
  },
];

export function Landing() {
  const { startGuest, goToAuth, initialized } = useVault();
  const { resolved } = useTheme();

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 80% 0%, rgba(99,102,241,.18), transparent), radial-gradient(50% 40% at 0% 100%, rgba(251,191,36,.14), transparent)',
        }}
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-sm text-white">
            FG
          </span>
          Finance Guru
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-8 px-5 pb-6 pt-6 md:grid-cols-2 md:pt-12">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            100% private · runs in your browser
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Know exactly what your{' '}
            <span className="bg-gradient-to-r from-indigo-500 to-amber-400 bg-clip-text text-transparent">
              salary becomes
            </span>
            .
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-600 dark:text-slate-300">
            A fast, private money manager for Malaysia. Turn your gross pay into net pay after
            statutory deductions, then budget savings, an emergency fund, goals and a live daily
            spending allowance.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={startGuest}
              className="animate-pulse-ring rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-indigo-500"
            >
              Try it now — no signup
            </button>
            <button
              onClick={goToAuth}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {initialized ? 'Unlock my saved data' : 'Save on this device'}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            “Try it now” saves nothing — close the tab and it’s gone.
          </p>
        </div>

        <div className="relative h-72 sm:h-80 md:h-96">
          <Suspense fallback={<HeroFallback />}>
            <Hero3D dark={resolved === 'dark'} />
          </Suspense>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-2xl">
              🔒
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                No data is stored.
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800/90 dark:text-emerald-300/90">
                There are <strong>no servers, no accounts, and no tracking</strong>. Everything runs
                entirely inside your browser. In “Try it now” mode <strong>nothing is saved at
                all</strong> — refresh and it’s gone. You can optionally choose “Save on this device,”
                and even then your data is <strong>encrypted with your passphrase and never leaves
                your device</strong>. We literally cannot see it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-5 pb-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-lg text-indigo-600 transition group-hover:scale-110 dark:text-indigo-300">
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Ready in seconds.</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-indigo-100">
            No account, no install. Enter your pay and start budgeting.
          </p>
          <button
            onClick={startGuest}
            className="mt-5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:-translate-y-0.5"
          >
            Open Finance Guru
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Estimates only — not financial or tax advice. Confirm against your payslip and LHDN / KWSP /
          PERKESO.
        </p>
      </section>
    </div>
  );
}
