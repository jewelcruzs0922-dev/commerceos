const baseUrl = process.env.STAGING_BASE_URL;
const username = process.env.STAGING_BASIC_USER;
const password = process.env.STAGING_BASIC_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Set STAGING_BASE_URL, STAGING_BASIC_USER, and STAGING_BASIC_PASSWORD.");
  process.exit(1);
}

const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
const url = (path) => new URL(path, baseUrl).toString();

const protectedRequests = [
  ["GET", "/"],
  ["GET", "/login"],
  ["GET", "/%6cogin"],
  ["GET", "/dashboard"],
  ["GET", "/orders/export"],
  ["GET", "/analytics/export"],
  ["GET", "/auth/callback"],
  ["GET", "/setup"],
  ["GET", "/README.md"],
  ["GET", "/docs/security.md"],
  ["GET", "/.env.local"],
  ["POST", "/login"],
];

async function request(path, method = "GET", authenticated = false, redirect = "manual") {
  const headers = authenticated ? { Authorization: authorization } : {};
  if (method === "POST") {
    headers["Next-Action"] = "release-check";
    headers["Content-Type"] = "text/plain";
  }
  return fetch(url(path), {
    method,
    headers,
    body: method === "POST" ? "release-check" : undefined,
    redirect,
  });
}

const failures = [];
for (const [method, path] of protectedRequests) {
  const response = await request(path, method, false);
  if (response.status !== 401) {
    failures.push(`${method} ${path} without credentials returned ${response.status}, expected 401`);
  }
}

const trailingSlash = await request("/login/", "GET", false, "follow");
if (trailingSlash.status !== 401) {
  failures.push(`GET /login/ following redirects returned ${trailingSlash.status}, expected 401`);
}

const authenticatedChecks = [
  ["GET", "/login", [200]],
  ["GET", "/dashboard", [307, 308]],
  ["GET", "/orders/export", [307, 308, 401]],
];
for (const [method, path, allowed] of authenticatedChecks) {
  const response = await request(path, method, true);
  if (!allowed.includes(response.status)) {
    failures.push(`${method} ${path} with credentials returned ${response.status}, expected ${allowed.join("/")}`);
  }
}

const publicAsset = await request("/brand/app-icon.svg", "GET", false);
if (publicAsset.status !== 200) {
  failures.push(`public brand asset returned ${publicAsset.status}, expected 200`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  protectedRequests: protectedRequests.length,
  authenticatedChecks: authenticatedChecks.length,
  publicAsset: publicAsset.status,
  failures: 0,
}));