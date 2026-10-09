import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  VILLAGE_VISUAL_ASSETS,
  VILLAGE_VISUAL_REGISTRY_VERSION,
  validateVillageVisualRegistry,
} from "../src/village-visual-registry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  resourceDirectory = path.join(
    root,
    "UnityClient/Assets/Resources/VillageSprites",
  ),
  rendererPath = path.join(
    root,
    "UnityClient/Assets/RetroRpg/Scripts/VillageSpriteRenderer.cs",
  );

function pngDimensions(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function runtimeKeys(source) {
  const block = source.match(/SpriteKeys\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? "";
  return [...block.matchAll(/"([a-z0-9_]+)"/g)].map((match) => match[1]);
}

async function assetInventory() {
  const files = (await readdir(resourceDirectory))
      .filter((file) => file.endsWith(".png"))
      .sort(),
    decisions = new Map(
      Object.entries(VILLAGE_VISUAL_ASSETS).map(([identity, asset]) => [
        asset.key,
        { identity, accepted: asset.accepted },
      ]),
    );
  return Promise.all(
    files.map(async (file) => {
      const key = file.slice(0, -4),
        dimensions = pngDimensions(
          await readFile(path.join(resourceDirectory, file)),
        ),
        decision = decisions.get(key);
      return {
        key,
        file,
        ...dimensions,
        registered: Boolean(decision),
        accepted: decision?.accepted ?? false,
        identity: decision?.identity ?? null,
      };
    }),
  );
}

const renderer = await readFile(rendererPath, "utf8"),
  runtime = [...new Set(runtimeKeys(renderer))].sort(),
  assets = await assetInventory(),
  files = new Set(assets.map((asset) => asset.key)),
  requiredSprites = [
    ...new Set(
      Object.values(VILLAGE_VISUAL_ASSETS)
        .filter((asset) => asset.accepted && asset.mode === "sprite")
        .map((asset) => asset.key),
    ),
  ].sort(),
  missingRuntimeKeys = runtime.filter((key) => !files.has(key)),
  missingAcceptedAssets = requiredSprites.filter((key) => !files.has(key)),
  unacceptedRuntimeKeys = runtime.filter(
    (key) => !requiredSprites.includes(key),
  ),
  output = {
    passed:
      validateVillageVisualRegistry() &&
      missingRuntimeKeys.length === 0 &&
      missingAcceptedAssets.length === 0 &&
      unacceptedRuntimeKeys.length === 0,
    registryVersion: VILLAGE_VISUAL_REGISTRY_VERSION,
    assets,
    runtimeKeys: runtime,
    requiredSprites,
    missingRuntimeKeys,
    missingAcceptedAssets,
    unacceptedRuntimeKeys,
    unreferencedFiles: assets
      .filter((asset) => !runtime.includes(asset.key))
      .map((asset) => asset.key),
    acceptedCount: assets.filter((asset) => asset.accepted).length,
    provisionalCount: assets.filter((asset) => !asset.accepted).length,
  };
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (!output.passed) process.exitCode = 1;
