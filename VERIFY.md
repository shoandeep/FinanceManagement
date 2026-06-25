# VERIFY.md — Statutory Rate Verification (Malaysia)

Verification of every figure in Section 3 of the build spec against official / authoritative
sources. Assumptions: **resident, Malaysian citizen, under 60** unless stated.

- **Verified on:** 2026-06-24
- **Method:** Official sources (KWSP, PERKESO/hasil.gov.my) where reachable; authoritative
  payroll references cross-checked where the official figure sits inside a PDF that could not be
  machine-parsed in this environment.
- **Status legend:** ✅ matches spec · ⚠️ **DIFFERS from spec — decision required** · 🔎 to re-confirm against official PDF in Phase 2

> Per operating rule #1, nothing below has been "silently fixed". The two ⚠️ rows are surfaced
> for your decision before any number is baked into `config/statutory.ts` or a test oracle.

---

## Summary of discrepancies (RESOLVED 2026-06-24)

| # | Item | Spec says | Official figure found | Decision |
|---|------|-----------|-----------------------|----------|
| D1 | SOCSO Cat-1 employee max (at RM6,000 ceiling) | RM29.90 (employer RM104.65) | **RM29.75 (employer RM104.15)**, total RM133.90 | ✅ **Use official RM29.75** — §7.1 SOCSO oracle updated to RM29.75 |
| D2 | EPF employee rate, age 60+ | 5.5% | **0% for Malaysian citizens** (employer 4%); 5.5% only for PR / non-citizens 60+ | ✅ **Use official by citizenship** — citizen 60+ = 0%/4%, PR & non-citizen 60+ = 5.5%; §7.2 citizen-60+ oracle updated to 0% |

Everything else in Section 3 verified as correct.

---

## 3.1 EPF (KWSP)

| Figure | Spec | Verified | Status |
|--------|------|----------|--------|
| Employee share, under 60 | 11% | 11% | ✅ |
| Employer share, wage ≤ RM5,000 | 13% | 13% | ✅ |
| Employer share, wage > RM5,000 | 12% | 12% | ✅ |
| Below RM20,000 uses Third Schedule **banded** table (not flat %) | yes | yes — EPF Act 1991, Third Schedule | ✅ 🔎 |
| Employee share, **age 60+** | 5.5% | **0% (Malaysian citizen)** / employer 4%. 5.5% applies to **PR / non-citizens** 60+ only | ⚠️ **D2** |
| Effective | Oct 2025 wage | Effective October 2025 wage (Nov 2025 contribution month) | ✅ |

Notes:
- At a band boundary like **RM5,000**, the banded table equals flat 11% → **RM550.00**, so test
  oracle 7.1 (EPF) is unaffected and remains correct.
- For non-boundary wages the banded table yields values a few sen off a flat 11%. Plan: extract the
  official Third Schedule band table in Phase 2; fall back to labelled flat 11% **with override** if
  the official PDF can't be parsed (per spec 3.1).

Sources:
- KWSP — Employer Mandatory Contribution: https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution
- KWSP — EPF Act 1991 Third Schedule: https://www.kwsp.gov.my/en/epf-act-1991-third-schedule
- KWSP — Third Schedule (PDF): https://www.kwsp.gov.my/documents/d/guest/jadual-ketiga-bi-pdf-1
- PayrollPanda EPF rate reference (age/citizenship matrix): https://www.payrollpanda.my/help/what-are-the-contribution-rates-for-epf/

## 3.2 SOCSO (PERKESO, Act 4, Category 1, under 60) — employee share

| Figure | Spec | Verified | Status |
|--------|------|----------|--------|
| Approx rate | ~0.5% | 0.5% employee (1.75% employer) | ✅ |
| Wage ceiling | RM6,000 | RM6,000 (effective 1 Oct 2024) | ✅ |
| **Employee max / month (at ceiling)** | **RM29.90** | **RM29.75** | ⚠️ **D1** |
| Employer max / month (info only) | RM104.65 | RM104.15 | ⚠️ **D1** |
| Total at ceiling | — | RM133.90 | — |

Why RM29.75, not RM29.90: the SOCSO/EIS tables are **banded and computed on each band's midpoint**.
Top band = "exceeding RM5,900, not exceeding RM6,000" → midpoint **RM5,950**.
`0.5% × 5,950 = RM29.75` (employee), `1.75% × 5,950 ≈ RM104.15` (employer). The RM29.90 in the spec
corresponds to `0.5% × 5,980`, which is not how the official band is set.

Sources:
- PERKESO — Rate of Contribution: https://www.perkeso.gov.my/en/rate-of-contribution.html
- PERKESO — Act 4 contribution rate (PDF): https://www.perkeso.gov.my/images/lindung/lindung-24-jam/NewContributionRateIncludingSKBBK.pdf
- Cross-check (Cat-1 top band RM29.75 / RM104.15 / RM133.90): https://www.ajobthing.com/resources/blog/jadual-caruman-perkeso-socso-contribution-schedule

## 3.3 EIS (PERKESO, Act 800) — employee share

| Figure | Spec | Verified | Status |
|--------|------|----------|--------|
| Approx rate | 0.2% | 0.2% employee (0.2% employer) | ✅ |
| Wage ceiling | RM6,000 | RM6,000 (effective 1 Oct 2024) | ✅ |
| **Employee max / month (at ceiling)** | **RM11.90** | **RM11.90** (employer RM11.90; total RM23.80) | ✅ |
| Excluded: age 60+, foreign workers | yes | yes | ✅ |

Consistency check: same midpoint method — `0.2% × 5,950 = RM11.90`. ✅ Confirms the band-midpoint
model and validates the EIS test oracle.

Sources:
- PERKESO — Act 800 contribution rate: https://www.perkeso.gov.my/en/rate-of-contribution.html
- Cross-check (RM11.90 each at ceiling): https://qne.cloud/my/eis-table/

## 3.4 Income tax / PCB (LHDN, resident individual, YA 2025)

Full bracket table verified **exactly** against LHDN (hasil.gov.my):

| Chargeable income (RM) | Rate | Spec | Status |
|---|---|---|---|
| 0 – 5,000 | 0% | 0% | ✅ |
| 5,001 – 20,000 | 1% | 1% | ✅ |
| 20,001 – 35,000 | 3% | 3% | ✅ |
| 35,001 – 50,000 | 6% | 6% | ✅ |
| 50,001 – 70,000 | 11% | 11% | ✅ |
| 70,001 – 100,000 | 19% | 19% | ✅ |
| 100,001 – 400,000 | 25% | 25% | ✅ |
| 400,001 – 600,000 | 26% | 26% | ✅ |
| 600,001 – 2,000,000 | 28% | 28% | ✅ |
| > 2,000,000 | 30% | 30% | ✅ |

| Other | Spec | Verified | Status |
|---|---|---|---|
| Personal relief | RM9,000 | RM9,000 | ✅ |
| EPF relief cap | RM4,000/yr | RM4,000/yr (life + EPF, EPF portion) | ✅ |
| Rebate | RM400 if chargeable ≤ RM35,000 | RM400 if chargeable ≤ RM35,000 | ✅ |

Oracle re-derivations (independent confirmation of Section 7.1):
- Chargeable **RM71,000** → 150 + 450 + 900 + 2,200 + 190 = **RM3,890.00** ✅ (cumulative at RM70k = RM3,700; LHDN "on the first 70,000 = 3,700").
- Chargeable **RM34,500** → 150 + 435 = **RM585** before rebate; after RM400 = **RM185.00** ✅.

Sources:
- LHDN — Tax Rate (resident individual): https://www.hasil.gov.my/en/individual/individual-life-cycle/income-declaration/tax-rate/
- Cross-check (YA 2025 brackets + RM400 rebate ≤ RM35,000): https://ringgitplus.com/en/blog/tax/malaysia-personal-income-tax-guide-2026-ya-2025.html

---

## Accuracy upgrade — exact tables (2026-06-25)

Replaced the earlier approximations with the official tables / documented algorithm:

- **SOCSO (Act 4, First Category):** the full official band table was extracted from the PERKESO PDF
  (`pdf-parse`) and encoded **verbatim** in [`src/config/socsoTable.ts`](src/config/socsoTable.ts)
  (64 bands, exact employee + employer sen). These statutory amounts do **not** follow a single
  formula — e.g. the RM70–100 employee band (RM0.40, not 0.5%×midpoint=0.425) and several employer
  figures round irregularly (RM1,100 → RM18.35, not 18.40) — so the exact lookup is the only correct
  approach. Employee max RM29.75 / employer RM104.15 at the ceiling, as verified.
  - **SKBBK note:** the same PDF now lists a newer **non-employment-injury (SKBBK)** employee add-on.
    It is **excluded** here — the standard payslip SOCSO deduction and every public calculator use the
    **Invalidity** column only (RM29.75 max). If SKBBK becomes mandatory for employees, revisit this.
- **EIS (Act 800):** uses the same official PERKESO wage bands at 0.2% (computed on the band
  midpoint, rounded to 5 sen). Exact at the ceiling (RM11.90) and for all realistic wages; the
  Act 800 PDF itself is image-based and did not yield a text layer, so low sub-RM1,000 bands are
  computed rather than table-verified (immaterial for salaried use; overridable).
- **EPF (Third Schedule):** now implements the **banded algorithm** — RM20 bands, rate applied to the
  band's **upper limit**, contribution **rounded up to the next ringgit** (the documented KWSP rule);
  exact percentage above RM20,000. Exact at the verified RM5,000 → RM550 point.
  - **Limitation:** KWSP **blocks** automated access to the Third Schedule PDF (HTTP 403 even with a
    browser user-agent), so the full table could not be byte-validated. The algorithm follows the
    officially documented banding + round-up rule and is a large improvement over the previous
    flat-11% approximation. Net pay remains an estimate; every line is overridable.
