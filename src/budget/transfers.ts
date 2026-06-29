/**
 * Logged manual transfers into the savings / investment / emergency trackers.
 * A transfer increments its target's running balance; editing or deleting one
 * reverses that effect. These helpers keep the balance and the ledger in step.
 */
import type { AppData, Transfer, TransferKind } from '../model/types';

/**
 * Apply (sign = +1) or reverse (sign = -1) a transfer's effect on its target
 * tracker's balance, mutating the draft in place. A missing target is a no-op
 * (e.g. the goal was deleted), so callers stay robust.
 */
export function applyTransferEffect(draft: AppData, t: Transfer, sign: 1 | -1): void {
  const delta = sign * t.amountSen;
  if (t.kind === 'emergency') {
    draft.emergencyFund.currentSen += delta;
  } else if (t.kind === 'savings') {
    const g = draft.goals.find((x) => x.id === t.targetId);
    if (g) g.currentSen += delta;
  } else {
    const inv = draft.investments.find((x) => x.id === t.targetId);
    if (inv) inv.currentSen += delta;
  }
}

/** Transfers feeding a given target (emergency uses kind only), newest first. */
export function transfersFor(transfers: Transfer[], kind: TransferKind, targetId: string): Transfer[] {
  return transfers
    .filter((t) => t.kind === kind && (kind === 'emergency' || t.targetId === targetId))
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));
}

/** Total moved into a target across all its logged transfers. */
export function totalTransferred(transfers: Transfer[], kind: TransferKind, targetId: string): number {
  return transfersFor(transfers, kind, targetId).reduce((sum, t) => sum + t.amountSen, 0);
}
