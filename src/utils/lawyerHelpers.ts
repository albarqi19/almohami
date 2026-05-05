/**
 * Helpers for resolving the "primary lawyer" (المحامي المسؤول) on a case.
 *
 * Source of truth: `case_lawyers.is_primary` pivot column.
 * Backend exposes it two ways:
 *   1. `case.primaryLawyer[]` — pre-filtered relation (preferred when present).
 *   2. `case.lawyers[]` with `lawyer.pivot.is_primary === true` — fallback.
 *
 * Behavior contract (per product spec):
 *   - If a lawyer is marked is_primary, that's the responsible lawyer.
 *   - Otherwise fall back to the first lawyer in the array (legacy behavior).
 *   - If no lawyers at all, return null.
 */

interface LawyerLike {
  id?: number | string;
  name?: string;
  pivot?: { is_primary?: boolean | number | null };
}

interface CaseLikeWithLawyers {
  primaryLawyer?: LawyerLike[] | LawyerLike | null;
  lawyers?: LawyerLike[] | null;
}

export function getPrimaryLawyer(input: CaseLikeWithLawyers | LawyerLike[] | null | undefined): LawyerLike | null {
  if (!input) return null;

  if (Array.isArray(input)) {
    return pickPrimaryFromList(input);
  }

  if (input.primaryLawyer) {
    if (Array.isArray(input.primaryLawyer)) {
      if (input.primaryLawyer.length > 0) return input.primaryLawyer[0];
    } else if (typeof input.primaryLawyer === 'object') {
      return input.primaryLawyer;
    }
  }

  if (Array.isArray(input.lawyers)) {
    return pickPrimaryFromList(input.lawyers);
  }

  return null;
}

function pickPrimaryFromList(list: LawyerLike[]): LawyerLike | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const flagged = list.find(l => {
    const v = l?.pivot?.is_primary;
    return v === true || v === 1 || (v as unknown) === '1';
  });
  return flagged || list[0];
}

export function getPrimaryLawyerName(
  input: CaseLikeWithLawyers | LawyerLike[] | null | undefined,
  fallback = '-'
): string {
  const lawyer = getPrimaryLawyer(input);
  return lawyer?.name || fallback;
}
