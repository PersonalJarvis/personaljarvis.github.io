#!/usr/bin/env node
/**
 * Answer "which file would the download button hand this browser?" from the
 * command line, with the site's own rules (src/lib/install.ts).
 *
 * The `downloads` workflow uses it so its per-OS package jobs download exactly
 * what a visitor on that OS would get from the button — not a name retyped
 * into the workflow, which could pass while the site sends people elsewhere.
 *
 *   node --experimental-strip-types scripts/resolve-download.mjs \
 *     --ua "<user agent>" [--touch 0] [--arch x86|arm]
 *
 * Prints one JSON object: { id, label, asset, href }.
 */
import { parseArgs } from "node:util";
import {
  detectDownload,
  downloadTargetFor,
  installerLabelFor,
  refineMacArchitecture,
} from "../src/lib/install.ts";

const { values } = parseArgs({
  options: {
    ua: { type: "string", default: "" },
    touch: { type: "string", default: "0" },
    arch: { type: "string" },
  },
});

let id = detectDownload(values.ua, Number(values.touch) || 0);
id = refineMacArchitecture(id, values.arch);
const target = downloadTargetFor(id);

console.log(JSON.stringify({ id, label: installerLabelFor(id), asset: target.asset, href: target.href }));
