import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const distDir = new URL("../dist/", import.meta.url);
const clientDir = new URL("../dist/client/", import.meta.url);
const serverDir = new URL("../dist/server/", import.meta.url);

await mkdir(clientDir, { recursive: true });

for (const entry of await readdir(distDir, { withFileTypes: true })) {
  if (entry.name === "client" || entry.name === "server" || entry.name === ".openai") continue;
  await rename(join(distDir.pathname, entry.name), join(clientDir.pathname, entry.name));
}

await mkdir(serverDir, { recursive: true });
await writeFile(
  new URL("index.js", serverDir),
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") return response;

    const url = new URL(request.url);
    if (url.pathname.includes(".")) return response;

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
`,
);
