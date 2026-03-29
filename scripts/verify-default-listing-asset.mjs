/**
 * Repo-safe check: default listing JPEG exists and policy references the same path.
 * Does not touch DB or network.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assetPath = path.join(root, "public/images/default-listing.jpg");
const policyPath = path.join(root, "lib/listing-photo-url.ts");

if (!fs.existsSync(assetPath)) {
  console.error("FAIL: missing", path.relative(root, assetPath));
  process.exit(1);
}

const st = fs.statSync(assetPath);
if (st.size < 200 || st.size > 512 * 1024) {
  console.warn("WARN: unexpected file size (bytes):", st.size);
}

const policy = fs.readFileSync(policyPath, "utf8");
const expected = '"/images/default-listing.jpg"';
if (!policy.includes(expected)) {
  console.error("FAIL: lib/listing-photo-url.ts must contain", expected);
  process.exit(1);
}

console.log("OK: default listing asset and policy path match.");
console.log("  ", path.relative(root, assetPath), `(${st.size} bytes)`);
