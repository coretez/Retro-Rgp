#!/usr/bin/env node
import http from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.DND_ROGUE_PORT ?? 4321);
const database = resolve(
  process.env.DND_ROGUE_DB ?? resolve(root, "var/rogue-demo.sqlite"),
);
const activeRunFile = resolve(
  process.env.DND_ROGUE_ACTIVE_RUN_FILE ??
    resolve(root, "var/rogue-active-run.txt"),
);
const client = new Client({ name: "rogue-html-workbench", version: "1" });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [resolve(root, "src/rogue-server.js")],
    env: { ...process.env, DND_ROGUE_DB: database },
    stderr: "inherit",
  }),
);
await client.listTools();

async function call(name, args) {
  const response = await client.callTool({ name, arguments: args });
  if (response.isError)
    throw new Error(
      response.structuredContent?.error?.message ?? response.content[0].text,
    );
  return response.structuredContent;
}

let active;
const rememberedRunId = existsSync(activeRunFile)
  ? readFileSync(activeRunFile, "utf8").trim()
  : "";
if (rememberedRunId) {
  try {
    active = await call("rogue_run_get", { runId: rememberedRunId });
  } catch {
    active = null;
  }
}
active ??= await call("rogue_run_create", {
  requestId: "rogue-viewer-default-v3",
  seed: "the-river-below",
  heroName: "The Delver",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 5,
});
let runId = active.runId;
writeFileSync(activeRunFile, `${runId}\n`);
let queue = Promise.resolve();

const originAllowed = (request) =>
  request.headers.origin === `http://127.0.0.1:${port}` ||
  request.headers.origin === `http://localhost:${port}`;

async function jsonBody(request) {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new Error("JSON required");
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 8192) throw new Error("Request too large");
  }
  return JSON.parse(body);
}

function sendJson(response, value) {
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

function sendHtml(response, file) {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(readFileSync(resolve(root, "viewer", file), "utf8"));
}

async function handleGet(pathname, response) {
  if (pathname === "/") return sendHtml(response, "rogue.html");
  if (pathname === "/manual") return sendHtml(response, "monster-manual.html");
  if (pathname === "/api/state")
    return sendJson(response, await call("rogue_run_get", { runId }));
  if (pathname === "/api/bestiary")
    return sendJson(response, await call("rogue_bestiary_get", {}));
  return false;
}

async function createRun(request, response) {
  const body = await jsonBody(request);
  const created = await call("rogue_run_create", {
    requestId: randomUUID(),
    seed: String(body.seed ?? "").trim(),
    heroName: String(body.heroName ?? "").trim(),
    heroClass: ["fighter", "mage", "cleric"].includes(body.heroClass)
      ? body.heroClass
      : "fighter",
    form: body.form,
    size: body.size === "medium" ? "medium" : "small",
    levels: [3, 5, 8].includes(Number(body.levels)) ? Number(body.levels) : 5,
  });
  runId = created.runId;
  writeFileSync(activeRunFile, `${runId}\n`);
  sendJson(response, created.view);
}

async function performAction(request, response) {
  const body = await jsonBody(request);
  const task = queue.then(async () => {
    const view = await call("rogue_run_get", { runId });
    return call("rogue_act", {
      runId,
      expectedRevision: view.revision,
      requestId: randomUUID(),
      intent: body.intent,
    });
  });
  queue = task.catch(() => {});
  sendJson(response, await task);
}

async function handlePost(pathname, request, response) {
  if (!originAllowed(request)) throw new Error("Same-origin request required");
  if (pathname === "/api/new") return createRun(request, response);
  if (pathname === "/api/action") return performAction(request, response);
  return false;
}

function validHost(request) {
  return [`127.0.0.1:${port}`, `localhost:${port}`].includes(
    request.headers.host,
  );
}

async function handleRequest(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!validHost(request)) throw new Error("Invalid host");
    const { pathname } = new URL(request.url, `http://127.0.0.1:${port}`);
    const handled =
      request.method === "GET"
        ? await handleGet(pathname, response)
        : request.method === "POST"
          ? await handlePost(pathname, request, response)
          : false;
    if (!handled && !response.writableEnded) {
      response.statusCode = 404;
      response.end("Not found");
    }
  } catch (error) {
    response.statusCode = 400;
    sendJson(response, { error: error.message });
  }
}

const server = http.createServer(handleRequest);

server.listen(port, "127.0.0.1", () => {
  console.log(`Solo roguelike ready: http://127.0.0.1:${port}`);
  console.log(`Database: ${database}`);
  console.log(`Run: ${runId}`);
});

async function shutdown() {
  server.close();
  await client.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
