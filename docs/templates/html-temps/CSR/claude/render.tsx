import { writeFileSync } from "node:fs";
import { renderDocumentWithLayout } from "@formepdf/core";
import { CommandCsrReport } from "./components/command-csr-report";
import { sampleCsr } from "./sample-data";

const out = await renderDocumentWithLayout(<CommandCsrReport data={sampleCsr} />);
writeFileSync("out.pdf", out.pdf ?? (out as any));
console.log("pages:", (out as any).pages?.length ?? "?", "warnings:", (out as any).warnings);
