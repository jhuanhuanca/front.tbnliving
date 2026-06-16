/**
 * Verifica que el build de producción no apunte al API legacy (imparablesjhn.shop).
 */
const fs = require("fs");
const path = require("path");

const LEGACY_API_HOSTS = [
  "imparablesjhn.shop",
  "app.imparablesjhn.shop",
  "imparables.shop",
];
const TBN_API_ROOT = "https://api.tbnliving.com";
const TBN_API_V1 = "https://api.tbnliving.com/api/v1";

function readEnvFile(name) {
  const filePath = path.join(__dirname, "..", name);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function extractEnv(content, key) {
  const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

const prodFile = readEnvFile(".env.production");
const apiRoot = process.env.VUE_APP_API_ROOT || extractEnv(prodFile, "VUE_APP_API_ROOT");
const apiUrl = process.env.VUE_APP_API_URL || extractEnv(prodFile, "VUE_APP_API_URL");
const combined = `${apiRoot} ${apiUrl}`.toLowerCase();

for (const host of LEGACY_API_HOSTS) {
  if (combined.includes(host)) {
    console.error("");
    console.error("ERROR: El build apunta al API antiguo (" + host + ").");
    console.error("Actualiza .env.production en el servidor:");
    console.error("  VUE_APP_API_ROOT=" + TBN_API_ROOT);
    console.error("  VUE_APP_API_URL=" + TBN_API_V1);
    console.error("");
    process.exit(1);
  }
}

const resolvedRoot = apiRoot || TBN_API_ROOT;
const resolvedV1 = apiUrl || TBN_API_V1;

console.log("[verify-api-env] Registro socio:     " + resolvedRoot + "/api/register");
console.log("[verify-api-env] Cliente preferente: " + resolvedRoot + "/api/register/preferred-customer");
console.log("[verify-api-env] API v1:             " + resolvedV1);
