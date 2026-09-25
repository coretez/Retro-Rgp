import { createHash, randomUUID } from "node:crypto";

export const IDENTITY_NAMESPACE = "13d7a749-93d6-5d3d-a665-3dc0efed15f4";

export const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export function namedUuid(namespace, name) {
  if (!isUuid(namespace)) throw new TypeError("namespace must be a UUID");
  const namespaceBytes = Buffer.from(namespace.replaceAll("-", ""), "hex"),
    digest = createHash("sha1")
      .update(namespaceBytes)
      .update(String(name), "utf8")
      .digest()
      .subarray(0, 16);
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const definitionId = (kind, key) =>
  namedUuid(IDENTITY_NAMESPACE, `definition:${kind}:${key}`);

export const newInstanceId = () => randomUUID();

export const migratedInstanceId = (runId, kind, legacyId) =>
  namedUuid(runId, `legacy-instance:${kind}:${legacyId}`);
