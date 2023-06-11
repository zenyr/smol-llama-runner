export const dirs = {
  repo: process.env.REPO!,
  models: process.env.MODELS!,
  sql: process.env.SQL!,
};

if (!process.env.REPO) {
  throw new Error("REPO env var not set");
}
if (!process.env.MODELS) {
  throw new Error("MODELS env var not set");
}
if (!process.env.SQL) {
  throw new Error("SQL env var not set");
}
