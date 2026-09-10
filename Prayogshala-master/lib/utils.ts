export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function calculatePH(volumeNaOH: number): number {
  const HCL_CONC = 0.1;
  const NAOH_CONC = 0.1;
  const HCL_VOL = 25;

  // Convert mL to L for both moles and total volume. Include water at 25 C
  // so the model remains continuous even extremely close to equivalence.
  const nHCl = HCL_CONC * HCL_VOL / 1000;
  const nNaOH = NAOH_CONC * volumeNaOH / 1000;
  const totalVol = (HCL_VOL + volumeNaOH) / 1000;
  const excess = (nNaOH - nHCl) / totalVol;
  const concentration = (Math.abs(excess) + Math.sqrt(excess * excess + 4e-14)) / 2;
  return excess <= 0 ? -Math.log10(concentration) : 14 + Math.log10(concentration);
}

export function getFlaskColor(pH: number, hasIndicator: boolean): string {
  if (!hasIndicator || pH <= 8.2) return 'rgba(200, 230, 255, 0.25)';
  const t = Math.min(1, (pH - 8.2) / 1.8);
  return `rgba(${Math.round(200 + 20 * t)}, ${Math.round(230 - 180 * t)}, ${Math.round(255 - 135 * t)}, ${0.25 + t * 0.4})`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
