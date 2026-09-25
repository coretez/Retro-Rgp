import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = fileURLToPath(
  new URL("../src/rogue-server.js", import.meta.url),
);

test("real rogue MCP creates, advances, retries and resumes a solo run", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rogue-mcp-"));
  const database = join(directory, "rogue.sqlite");
  let client;
  const connect = async () => {
    client = new Client({ name: "rogue-test", version: "1" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [server],
        env: { ...process.env, DND_ROGUE_DB: database },
        stderr: "pipe",
      }),
    );
  };
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    assert.equal(response.isError, undefined, JSON.stringify(response.content));
    assert.deepEqual(
      response.structuredContent,
      JSON.parse(response.content[0].text),
    );
    return response.structuredContent;
  };
  t.after(async () => {
    await client?.close();
    rmSync(directory, { recursive: true, force: true });
  });
  await connect();
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
    "rogue_act",
    "rogue_bestiary_get",
    "rogue_log",
    "rogue_run_create",
    "rogue_run_export",
    "rogue_run_get",
  ]);
  const bestiary = await call("rogue_bestiary_get", {});
  assert.equal(bestiary.creatures.length, 25);
  assert.ok(bestiary.creatures.every((entry) => entry.lore.length === 2));
  assert.equal(
    new Set(bestiary.creatures.map((entry) => entry.id)).size,
    bestiary.creatures.length,
  );
  assert.equal(
    new Set(bestiary.creatures.map((entry) => entry.glyph)).size,
    bestiary.creatures.length,
  );
  assert.ok(
    bestiary.creatures.every(
      (entry) =>
        entry.name &&
        entry.glyphLanguage &&
        entry.glyphReading &&
        entry.glyphMeaning &&
        entry.role &&
        entry.faction &&
        entry.ecology &&
        entry.damageType,
    ),
  );
  const created = await call("rogue_run_create", {
    requestId: "mcp-create",
    seed: "mcp-seed",
    heroName: "Mara",
    form: "natural_caves",
    size: "small",
  });
  const action = {
    runId: created.runId,
    expectedRevision: 0,
    requestId: "mcp-turn-1",
    intent: { kind: "wait" },
  };
  const first = await call("rogue_act", action);
  assert.equal(first.revision, 1);
  assert.deepEqual(await call("rogue_act", action), {
    ...first,
    replayed: true,
  });
  assert.equal(
    (await call("rogue_log", { runId: created.runId })).turns.length,
    1,
  );
  await client.close();
  await connect();
  const resumed = await call("rogue_run_get", { runId: created.runId });
  assert.equal(resumed.revision, 1);
  assert.equal(resumed.tick, 1);
});
