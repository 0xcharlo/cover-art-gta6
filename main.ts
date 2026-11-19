// Vice City Cover Studio — the entry program (Node 22, standard library only).
//
// It hands the app in: copy this repository's app/ and screenshots/ beside this
// file into the output directory, then write output/dossier.json with the
// vendored make.fun library, which summarises the app for the judge. Outside
// the grader, MAKEFUN_OUTPUT_DIR stands in for /output, so a local check is:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader makes must write identical bytes, so this program
// does nothing time- or order-dependent: plain recursive copies, then the
// dossier the library derives from those files alone.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The gate's caps, from the kit's reference/gate.json: the dossier text is
// capped at 160 KiB, at most 4 screenshots of 256 KiB each, app/ at most 993
// entries and 48 MiB with no path over 1000 bytes. Enforcing them here keeps
// a local run honest about what the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
