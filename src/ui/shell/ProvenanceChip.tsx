/**
 * ProvenanceChip (design-spec §3.2) — H8's "small dataVersion/provenance
 * indicator": `dataset <version>` with an adjacent disclosure expanding a
 * one-line source · asOf · confidence readout. Values come from the shipped
 * dataset's provenance fields — never authored here.
 */

import type { BadgeDataset } from "../../engine/types";

export interface ProvenanceChipProps {
  dataset: Pick<BadgeDataset, "dataVersion" | "source" | "asOf" | "confidence">;
}

export function ProvenanceChip({ dataset }: ProvenanceChipProps) {
  return (
    <details className="provenance">
      <summary>
        <span className="num">dataset {dataset.dataVersion}</span>
        <span aria-hidden="true">ⓘ</span>
      </summary>
      <div className="provenance__body">
        {dataset.source} · as of {dataset.asOf} · confidence: {dataset.confidence}
      </div>
    </details>
  );
}
