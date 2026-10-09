#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DUNGEON_FORMS } from "./dungeon-generator.js";
import { bestiaryView } from "./rogue-bestiary.js";
import { RogueStore, rogueError } from "./rogue-store.js";
import { WORLD_AFFORDANCES } from "./world-objects.js";
import {
  GROUP_FORMATIONS,
  GROUP_MOVEMENT_MODES,
  GROUP_OBJECTIVES,
  GROUP_RESOURCE_POLICIES,
} from "./group-logic.js";

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

// function-length-exempt: template -- declarative MCP route/schema registration
export function buildRogueServer(store) {
  const server = new McpServer(
    { name: "dungeon-rogue", version: "0.2.0-alpha.5" },
    {
      instructions:
        "A turn-based party dungeon server using the SRD 5.1 compatibility profile returned by rogue_run_get. The four-character party follows its leader through local maps while creature packs retain leaders, formations and revisioned orders. Leaving depth 1 enters the local exterior; open_world collapses the party to one world-map group marker for travel between the Rooted Keep and Stonebridge, and enter_location expands it locally again. Village shop_buy actions spend shared copper on a named party actor. Read rogue_run_get and rogue_groups_get before issuing a command. Only the current leader may command its group. Submit exactly one rogue_act intent with the current run revision and a fresh requestId. Retry an uncertain response with the same requestId and identical intent. Never infer hidden cells, entities or group membership.",
    },
  );
  server.registerTool(
    "rogue_run_create",
    {
      title: "Create party dungeon run",
      description:
        "Create and persist a 3-, 5-, or 8-level party roguelike expedition with bidirectional stairs, the Stonebridge village and shops, rooms, doors, noise, behavioral creatures, equipment, treasure and a final boss. Repeating the same requestId and identical inputs returns the original run.",
      inputSchema: z
        .object({
          requestId: text(),
          seed: text(),
          heroName: text().default("The Delver"),
          heroClass: z.enum(["fighter", "mage", "cleric"]).default("fighter"),
          scenario: z.enum(["established", "founding"]).default("established"),
          worldGeneration: z
            .enum(["legacy_origin", "regional_v2", "regional_v3"])
            .default("legacy_origin"),
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
      title: "Read party dungeon run",
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
        "Submit one dungeon or village intent. A successful call atomically resolves travel, shopping or the party combat turn and returns the next decision state.",
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
            z
              .object({
                kind: z.literal("configure_party_member"),
                actorId: id,
                combatRole: z
                  .enum([
                    "leader",
                    "scout",
                    "frontline",
                    "support",
                    "rear_guard",
                  ])
                  .optional(),
                jobFocus: z.string().min(1).optional(),
                workPriority: z.number().int().min(0).max(100).optional(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("command"),
                groupId: id,
                issuerId: id,
                expectedCommandRevision: z.number().int().min(0),
                objective: z.enum(GROUP_OBJECTIVES),
                formation: z.enum(GROUP_FORMATIONS),
                targetId: id.optional(),
                destination: z
                  .object({
                    x: z.number().int().min(0),
                    y: z.number().int().min(0),
                  })
                  .strict()
                  .optional(),
                resourcePolicy: z.enum(GROUP_RESOURCE_POLICIES),
                retreatThreshold: z.number().int().min(0).max(100),
                movementMode: z.enum(GROUP_MOVEMENT_MODES).optional(),
              })
              .strict(),
            z.object({ kind: z.literal("search") }).strict(),
            z.object({ kind: z.literal("stairs") }).strict(),
            z.object({ kind: z.literal("stairs_up") }).strict(),
            z.object({ kind: z.literal("enter_dungeon") }).strict(),
            z.object({ kind: z.literal("open_world") }).strict(),
            z.object({ kind: z.literal("enter_location") }).strict(),
            z
              .object({
                kind: z.literal("local_move"),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("local_examine"),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("local_talk"),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("local_manipulate"),
                action: z.enum(["dig", "harvest", "breach", "collect"]),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("world_interact"),
                objectId: id,
                action: z.enum(Object.keys(WORLD_AFFORDANCES)),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("set_party_movement"),
                mode: z.enum(["follow", "dispersed"]),
              })
              .strict(),
            z
              .object({
                kind: z.literal("set_spending_policy"),
                mode: z.enum([
                  "approval_required",
                  "routine_supplies",
                  "autonomous",
                ]),
                limitCp: z.number().int().min(0).default(0),
              })
              .strict(),
            z
              .object({
                kind: z.literal("decide_village_proposal"),
                proposalId: id,
                outcome: z.enum([
                  "approved",
                  "deferred",
                  "rejected",
                  "revision_requested",
                ]),
                reason: z.string().min(1).max(240),
              })
              .strict(),
            z
              .object({
                kind: z.literal("revise_village_proposal"),
                proposalId: id,
                reason: z.string().min(1).max(240),
              })
              .strict(),
            z
              .object({
                kind: z.literal("decide_architect_plan"),
                planId: id,
                alternativeId: id.optional(),
                outcome: z.enum([
                  "approved",
                  "deferred",
                  "rejected",
                  "revision_requested",
                ]),
                reason: z.string().min(1).max(240),
              })
              .strict(),
            z
              .object({
                kind: z.literal("set_village_commission_status"),
                commissionId: id,
                status: z.enum(["active", "suspended"]),
                reason: z.string().min(1).max(240),
              })
              .strict(),
            z
              .object({
                kind: z.literal("world_move"),
                x: z.number().int(),
                y: z.number().int(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("world_travel"),
                destination: z.enum(["dungeon_entrance", "stonebridge"]),
              })
              .strict(),
            z
              .object({
                kind: z.literal("shop_buy"),
                actorId: id,
                itemKind: text(),
                autonomous: z.boolean().default(false),
              })
              .strict(),
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
                itemId: id,
              })
              .strict(),
            z
              .object({
                kind: z.literal("equip"),
                itemId: id,
                actorId: id.optional(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("unequip"),
                slot: z.literal("offhand"),
                actorId: id.optional(),
              })
              .strict(),
            z
              .object({
                kind: z.literal("invoke_item"),
                itemId: text(),
                targetId: id.optional(),
              })
              .strict(),
            z
              .object({ kind: z.literal("ranged_attack"), targetId: id })
              .strict(),
            z
              .object({
                kind: z.literal("throw_item"),
                itemId: id,
                targetId: id,
              })
              .strict(),
            z
              .object({
                kind: z.literal("examine"),
                x: z.number().int().min(0),
                y: z.number().int().min(0),
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
    "rogue_groups_get",
    {
      title: "Read party and known creature groups",
      description:
        "Read the persisted player-party leadership, formation and order plus only enemy groups with currently visible members. Hidden membership and undiscovered groups are not exposed. Group orders are issued as revisioned command intents through rogue_act.",
      inputSchema: z.object({ runId: id }).strict(),
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    wrap(({ runId }) => store.groups(runId)),
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
