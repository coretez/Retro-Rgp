#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DUNGEON_FORMS } from "./dungeon-generator.js";
import { bestiaryView } from "./rogue-bestiary.js";
import { RogueStore, rogueError } from "./rogue-store.js";

const text = () => z.string().trim().min(1).max(200);
const id = z.string().uuid();
const errorSchema = z
  .object({ code: z.string(), message: z.string(), details: z.unknown() })
  .strict();
const outputSchema = z.object({ error: errorSchema.optional() }).passthrough();
const result = (value) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  structuredContent: value,
});
const wrap = (handler) => async (args) => {
  try {
    return result(await handler(args));
  } catch (error) {
    return { ...result({ error: rogueError(error) }), isError: true };
  }
};

export function buildRogueServer(store) {
  const server = new McpServer(
    { name: "dungeon-rogue", version: "0.1.0" },
    {
      instructions:
        "A solo, turn-based dungeon server using the SRD 5.1 compatibility profile returned by rogue_run_get. Preserve D&D combat semantics except for the response's explicit roguelike overrides. Read rogue_run_get, then submit exactly one rogue_act intent with the current revision and a fresh requestId. One accepted intent atomically resolves the hero action and all enemy responses. A dying hero must submit death_save. Retry an uncertain response with the same requestId and identical intent. Never infer hidden cells or entities.",
    },
  );
  server.registerTool(
    "rogue_run_create",
    {
      title: "Create solo dungeon run",
      description:
        "Create and persist a 3-, 5-, or 8-level solo roguelike run with rooms, doors, noise, 25 behavioral creature types, consumables, equippable loot, passive discovery, traps, treasure, stairs, depth-scaled factions, a final boss and an exit. Repeating the same requestId and identical inputs returns the original run.",
      inputSchema: z
        .object({
          requestId: text(),
          seed: text(),
          heroName: text().default("The Delver"),
          heroClass: z.enum(["fighter", "mage", "cleric"]).default("fighter"),
          form: z.enum(DUNGEON_FORMS).default("auto"),
          size: z.enum(["small", "medium"]).default("small"),
          levels: z
            .union([z.literal(3), z.literal(5), z.literal(8)])
            .default(5),
        })
        .strict(),
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap((args) => store.create(args)),
  );
  server.registerTool(
    "rogue_run_get",
    {
      title: "Read solo dungeon run",
      description:
        "Read the current player-visible decision state. Hidden cells, enemies and treasure are omitted. This does not advance the dungeon.",
      inputSchema: z.object({ runId: id }).strict(),
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap(({ runId }) => store.view(runId)),
  );
  server.registerTool(
    "rogue_act",
    {
      title: "Take one roguelike turn",
      description:
        "Submit one player intent. A successful call atomically resolves the hero action, automatic enemy responses, visibility, treasure collection and victory/death, then returns the next decision state.",
      inputSchema: z
        .object({
          runId: id,
          expectedRevision: z.number().int().min(0),
          requestId: text(),
          intent: z.discriminatedUnion("kind", [
            z
              .object({
                kind: z.literal("move"),
                direction: z.enum([
                  "north",
                  "northeast",
                  "east",
                  "southeast",
                  "south",
                  "southwest",
                  "west",
                  "northwest",
                ]),
              })
              .strict(),
            z.object({ kind: z.literal("wait") }).strict(),
            z.object({ kind: z.literal("search") }).strict(),
            z.object({ kind: z.literal("stairs") }).strict(),
            z.object({ kind: z.literal("death_save") }).strict(),
            z
              .object({
                kind: z.literal("open"),
                direction: z.enum([
                  "north",
                  "northeast",
                  "east",
                  "southeast",
                  "south",
                  "southwest",
                  "west",
                  "northwest",
                ]),
              })
              .strict(),
            z
              .object({
                kind: z.literal("use_item"),
                itemKind: z.literal("healing_potion"),
              })
              .strict(),
            z
              .object({
                kind: z.literal("equip"),
                itemId: text(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("unequip"),
                slot: z.literal("offhand"),
              })
              .strict(),
            z
              .object({
                kind: z.literal("invoke_item"),
                itemId: text(),
              })
              .strict(),
            z.object({ kind: z.literal("class_power") }).strict(),
            z.object({ kind: z.literal("short_rest") }).strict(),
          ]),
        })
        .strict(),
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap((args) => store.act(args)),
  );
  server.registerTool(
    "rogue_bestiary_get",
    {
      title: "Read roguelike monster manual",
      description:
        "Read the authoritative 25-creature behavioral bestiary used by encounter generation and enemy AI, including roles, factions, ecology, prose, mechanics and source provenance.",
      inputSchema: z.object({}).strict(),
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap(() => bestiaryView()),
  );
  server.registerTool(
    "rogue_log",
    {
      title: "Read roguelike turn log",
      description:
        "Page immutable committed turn receipts for replay and debugging. This trusted development read may include full ordered events from prior turns.",
      inputSchema: z
        .object({
          runId: id,
          afterRevision: z.number().int().min(0).default(0),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .strict(),
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap(({ runId, afterRevision, limit }) => ({
      runId,
      turns: store.log(runId, afterRevision, limit),
    })),
  );
  server.registerTool(
    "rogue_run_export",
    {
      title: "Export solo dungeon run",
      description:
        "Export the complete trusted-development run state, hidden content, turn receipts and state hash. Do not use this as a player-facing view.",
      inputSchema: z.object({ runId: id }).strict(),
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap(({ runId }) => store.export(runId)),
  );
  return server;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const database =
    process.env.DND_ROGUE_DB ??
    fileURLToPath(new URL("../var/rogue.sqlite", import.meta.url));
  const store = new RogueStore(database);
  const server = buildRogueServer(store);
  const shutdown = async () => {
    await server.close();
    store.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await server.connect(new StdioServerTransport());
}
