/**
 * Meter (design-spec §3.1) — the points bar inside a CategoryLedger.
 * Overflow variant: when value > max the fill saturates at 100% and an
 * over-bar segment renders beyond the track's right edge with a hatched
 * pattern — overflow is visible as SHAPE, not only color (WCAG 1.4.1).
 */

export interface MeterProps {
  label: string;
  value: number;
  max: number;
}

export function Meter({ label, value, max }: MeterProps) {
  const over = max >= 0 && value > max;
  const fillPercent = max <= 0 ? (value > 0 ? 100 : 0) : Math.min(100, (value / max) * 100);
  /** The over-bar's width, proportional to the overflow (capped so it never
   * dominates the row). */
  const overflowPercent = over ? Math.min(30, ((value - max) / Math.max(max, 1)) * 100) : 0;
  return (
    <div
      className={`meter${over ? " meter--over" : ""}`}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${value} of ${max}${over ? `, over by ${value - max}` : ""}`}
      aria-label={label}
    >
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${fillPercent}%` }} />
      </div>
      {over ? <div className="meter__overflow" style={{ width: `${overflowPercent}%` }} /> : null}
    </div>
  );
}
