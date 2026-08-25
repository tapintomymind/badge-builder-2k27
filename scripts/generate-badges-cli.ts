/**
 * CLI shell for the badge generator — THE SOLE fs CONSUMER IN THE REPO
 * (tech-strategy.md §9). Build-time only; never imported by src/ or tests/.
 *
 * Run:  npm run generate:badges
 *
 * Node 23.6+ executes the TypeScript directly (type stripping); this file is
 * deliberately outside the tsc include graph (nothing under src/ or tests/
 * imports it), so the browser-typed tsconfig needs no Node ambient types.
 * All parsing logic — and its type checking — lives in generate-badges.ts.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generate, serializeDataset } from "./generate-badges.ts";

const SOURCE_PATH = new URL("../src/data/badges.source.txt", import.meta.url);
/** F4: the second source file — the official page's descriptions + NEW flags.
 * Read here, in the SOLE fs consumer; the pure parser never touches disk. */
const ENRICHMENT_PATH = new URL("../src/data/badges.enrichment.source.txt", import.meta.url);
const OUTPUT_PATH = new URL("../src/data/badges.json", import.meta.url);

const sourceText = readFileSync(SOURCE_PATH, "utf8");
const enrichmentText = readFileSync(ENRICHMENT_PATH, "utf8");
const dataset = generate(sourceText, enrichmentText);
writeFileSync(OUTPUT_PATH, serializeDataset(dataset), "utf8");
console.log(
  `generate-badges: wrote ${dataset.badges.length} badges to ${fileURLToPath(OUTPUT_PATH)} (dataVersion ${dataset.dataVersion})`,
);
