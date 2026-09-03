// Cek sintaks cepat (parse TS) untuk daftar berkas — alat dev internal.
import { readFileSync } from "node:fs";
import ts from "typescript";

const files = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ES2022, true);
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length === 0) {
    console.log("OK ", f);
  } else {
    bad++;
    for (const d of diags.slice(0, 3)) {
      const msg = typeof d.messageText === "string" ? d.messageText : d.messageText.messageText;
      console.log("ERR", f, "@", d.start, "—", msg);
    }
  }
}
process.exit(bad === 0 ? 0 : 1);