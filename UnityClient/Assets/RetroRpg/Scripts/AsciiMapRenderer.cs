using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace RetroRpg
{
    public sealed class AsciiMapRenderer : MonoBehaviour
    {
        public const float CellWidth = 0.9f;
        public const float CellHeight = 0.9f;
        private const int FontSize = 64;
        private Mesh backgroundMesh;
        private Mesh glyphMesh;
        private Mesh actorMesh;
        private Font glyphFont;
        private VillageSpriteRenderer villageSprites;
        private UnityView currentView;
        private MapView map;
        private Vector2Int? selected;
        private readonly Dictionary<string, ActorMotion> actorMotions = new();

        private sealed class ActorMotion
        {
            public CellView cell;
            public Vector2 start;
            public Vector2 target;
            public float startedAt;
            public float duration;
            public string facing;
        }

        public void Initialize()
        {
            backgroundMesh = new Mesh { name = "ASCII Cell Backgrounds" };
            backgroundMesh.indexFormat = IndexFormat.UInt32;
            var background = new GameObject("Shaded Cell Grid");
            background.transform.SetParent(transform, false);
            background.AddComponent<MeshFilter>().sharedMesh = backgroundMesh;
            var renderer = background.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = Resources.Load<Material>("AsciiGround")
                ?? new Material(Shader.Find("Unlit/Color"));

            glyphMesh = new Mesh { name = "Colored ASCII Glyphs" };
            glyphMesh.indexFormat = IndexFormat.UInt32;
            var glyphs = new GameObject("Colored ASCII Glyph Mesh");
            glyphs.transform.SetParent(transform, false);
            glyphs.transform.localPosition = new Vector3(0f, 0f, -0.1f);
            glyphs.AddComponent<MeshFilter>().sharedMesh = glyphMesh;
            glyphFont = CreateFont();
            glyphs.AddComponent<MeshRenderer>().sharedMaterial = glyphFont.material;

            actorMesh = new Mesh { name = "Animated ASCII Actors" };
            actorMesh.indexFormat = IndexFormat.UInt32;
            var actors = new GameObject("Animated ASCII Actor Mesh");
            actors.transform.SetParent(transform, false);
            actors.transform.localPosition = new Vector3(0f, 0f, -0.2f);
            actors.AddComponent<MeshFilter>().sharedMesh = actorMesh;
            actors.AddComponent<MeshRenderer>().sharedMaterial = glyphFont.material;

            villageSprites = new GameObject("Village Picture Sprites")
                .AddComponent<VillageSpriteRenderer>();
            villageSprites.transform.SetParent(transform, false);
            villageSprites.Initialize();
        }

        private void Update()
        {
            if (map != null && actorMotions.Count > 0) RenderActors();
        }

        public void Render(UnityView view, float animationDuration = 0.22f)
        {
            currentView = view;
            map = view.map;
            UpdateActorMotions(view, animationDuration);
            BuildBackground(view);
            villageSprites.Render(view);
            BuildGlyphs(view);
            RenderActors();
        }

        private void RenderActors()
        {
            if (currentView.location != "village")
            {
                BuildActorGlyphs();
                return;
            }
            ApplyGlyphMesh(actorMesh, new List<Vector3>(), new List<Color>(),
                new List<Vector2>(), new List<int>());
            var actors = new List<VillageSpriteRenderer.ActorPlacement>(actorMotions.Count);
            foreach (var motion in actorMotions.Values)
                actors.Add(new VillageSpriteRenderer.ActorPlacement(
                    motion.cell, MotionPosition(motion), motion.facing,
                    MotionProgress(motion) < 1f, IsWorking(motion.cell)));
            villageSprites.RenderActors(currentView, actors);
        }

        private static bool IsWorking(CellView cell) => cell.entityWorking;

        public void Select(Vector2Int position, UnityView view)
        {
            selected = position;
            BuildBackground(view);
        }

        public bool TryWorldCell(Vector3 world, out Vector2Int position)
        {
            position = default;
            if (map == null) return false;
            var left = -map.width * CellWidth * 0.5f;
            var top = map.height * CellHeight * 0.5f;
            var column = Mathf.FloorToInt((world.x - left) / CellWidth);
            var row = Mathf.FloorToInt((top - world.y) / CellHeight);
            if (column < 0 || row < 0 || column >= map.width || row >= map.height) return false;
            position = new Vector2Int(map.origin.x + column, map.origin.y + row);
            return true;
        }

        private void BuildBackground(UnityView view)
        {
            var vertices = new Vector3[view.map.cells.Length * 4];
            var colors = new Color[vertices.Length];
            var triangles = new int[view.map.cells.Length * 6];
            for (var index = 0; index < view.map.cells.Length; index++)
                WriteCellGeometry(view, index, vertices, colors, triangles);
            backgroundMesh.Clear();
            backgroundMesh.vertices = vertices;
            backgroundMesh.colors = colors;
            backgroundMesh.triangles = triangles;
            backgroundMesh.RecalculateBounds();
        }

        private void WriteCellGeometry(
            UnityView view,
            int index,
            Vector3[] vertices,
            Color[] colors,
            int[] triangles)
        {
            var cell = view.map.cells[index];
            var row = cell.y - view.map.origin.y;
            var column = cell.x - view.map.origin.x;
            var left = (column - view.map.width * 0.5f) * CellWidth;
            var top = (view.map.height * 0.5f - row) * CellHeight;
            var vertex = index * 4;
            vertices[vertex] = new Vector3(left, top - CellHeight);
            vertices[vertex + 1] = new Vector3(left, top);
            vertices[vertex + 2] = new Vector3(left + CellWidth, top);
            vertices[vertex + 3] = new Vector3(left + CellWidth, top - CellHeight);
            var color = CellBackground(view.map.cells[index], view.hero, view.daylightLevel);
            if (selected == new Vector2Int(view.map.cells[index].x, view.map.cells[index].y))
                color = Color.Lerp(color, new Color(0.95f, 0.72f, 0.22f), 0.65f);
            for (var offset = 0; offset < 4; offset++) colors[vertex + offset] = color;
            var triangle = index * 6;
            triangles[triangle] = vertex;
            triangles[triangle + 1] = vertex + 1;
            triangles[triangle + 2] = vertex + 2;
            triangles[triangle + 3] = vertex;
            triangles[triangle + 4] = vertex + 2;
            triangles[triangle + 5] = vertex + 3;
        }

        private void BuildGlyphs(UnityView view)
        {
            var characters = new char[view.map.cells.Length];
            for (var index = 0; index < view.map.cells.Length; index++)
                characters[index] = GlyphCharacter(view.map.cells[index]);
            glyphFont.RequestCharactersInTexture(new string(characters), FontSize, FontStyle.Normal);

            var vertices = new List<Vector3>(view.map.cells.Length * 4);
            var colors = new List<Color>(view.map.cells.Length * 4);
            var uvs = new List<Vector2>(view.map.cells.Length * 4);
            var triangles = new List<int>(view.map.cells.Length * 6);
            for (var index = 0; index < view.map.cells.Length; index++)
            {
                var character = characters[index];
                if (character == ' ' || IsActor(view.map.cells[index]) ||
                    HideVillageRoomLabel(view, view.map.cells[index]) ||
                    villageSprites.HasSprite(view, view.map.cells[index])) continue;
                if (!glyphFont.GetCharacterInfo(character, out var info, FontSize)) continue;
                WriteGlyph(view, index, info, vertices, colors, uvs, triangles);
            }
            glyphMesh.Clear();
            glyphMesh.SetVertices(vertices);
            glyphMesh.SetColors(colors);
            glyphMesh.SetUVs(0, uvs);
            glyphMesh.SetTriangles(triangles, 0);
            glyphMesh.RecalculateBounds();
        }

        private void UpdateActorMotions(UnityView view, float duration)
        {
            var next = new Dictionary<string, ActorMotion>();
            foreach (var cell in view.map.cells)
            {
                if (!IsActor(cell)) continue;
                var target = new Vector2(cell.x, cell.y);
                var start = actorMotions.TryGetValue(cell.entityId, out var motion)
                    ? MotionPosition(motion)
                    : target;
                var startedSleeping = cell.entityPose == "sleeping" &&
                    motion?.cell?.entityPose != "sleeping";
                if (startedSleeping) start = target;
                var distance = Vector2.Distance(start, target);
                var direction = target - (motion?.target ?? target);
                next[cell.entityId] = new ActorMotion {
                    cell = cell, start = distance > 3f ? target : start, target = target,
                    startedAt = Time.unscaledTime,
                    duration = startedSleeping || distance < 0.01f ? 0f : duration,
                    facing = ActorFacing(direction, motion?.facing)
                };
            }
            actorMotions.Clear();
            foreach (var entry in next) actorMotions.Add(entry.Key, entry.Value);
        }

        private void BuildActorGlyphs()
        {
            var vertices = new List<Vector3>(actorMotions.Count * 4);
            var colors = new List<Color>(actorMotions.Count * 4);
            var uvs = new List<Vector2>(actorMotions.Count * 4);
            var triangles = new List<int>(actorMotions.Count * 6);
            var characters = new char[actorMotions.Count];
            var index = 0;
            foreach (var motion in actorMotions.Values)
                characters[index++] = GlyphCharacter(motion.cell);
            glyphFont.RequestCharactersInTexture(new string(characters), FontSize, FontStyle.Normal);
            foreach (var motion in actorMotions.Values)
                WriteActorGlyph(motion, vertices, colors, uvs, triangles);
            ApplyGlyphMesh(actorMesh, vertices, colors, uvs, triangles);
        }

        private void WriteActorGlyph(
            ActorMotion motion,
            List<Vector3> vertices,
            List<Color> colors,
            List<Vector2> uvs,
            List<int> triangles)
        {
            var character = GlyphCharacter(motion.cell);
            if (character == ' ' || !glyphFont.GetCharacterInfo(character, out var info, FontSize)) return;
            WriteGlyphAt(CellCenter(MotionPosition(motion)), info, GlyphColor(motion.cell), vertices, colors, uvs, triangles);
        }

        private static Vector2 MotionPosition(ActorMotion motion)
        {
            if (motion.duration <= 0f) return motion.target;
            var progress = MotionProgress(motion);
            var eased = progress * progress * (3f - 2f * progress);
            return Vector2.Lerp(motion.start, motion.target, eased);
        }

        private static float MotionProgress(ActorMotion motion) => motion.duration <= 0f
            ? 1f : Mathf.Clamp01((Time.unscaledTime - motion.startedAt) / motion.duration);

        private static string ActorFacing(Vector2 direction, string previous)
        {
            if (direction.sqrMagnitude < 0.01f) return previous ?? "south";
            if (Mathf.Abs(direction.x) > Mathf.Abs(direction.y))
                return direction.x > 0 ? "east" : "west";
            return direction.y > 0 ? "south" : "north";
        }

        private Vector2 CellCenter(Vector2 position)
        {
            var column = position.x - map.origin.x;
            var row = position.y - map.origin.y;
            return new Vector2(
                (column - map.width * 0.5f + 0.5f) * CellWidth,
                (map.height * 0.5f - row - 0.5f) * CellHeight);
        }

        private static void WriteGlyph(
            UnityView view,
            int index,
            CharacterInfo info,
            List<Vector3> vertices,
            List<Color> colors,
            List<Vector2> uvs,
            List<int> triangles)
        {
            var cell = view.map.cells[index];
            var row = cell.y - view.map.origin.y;
            var column = cell.x - view.map.origin.x;
            var centerX = (column - view.map.width * 0.5f + 0.5f) * CellWidth;
            var centerY = (view.map.height * 0.5f - row - 0.5f) * CellHeight;
            WriteGlyphAt(
                new Vector2(centerX, centerY), info,
                GlyphColor(view.map.cells[index]), vertices, colors, uvs, triangles);
        }

        // function-length-exempt: template -- mesh emission
        private static void WriteGlyphAt(
            Vector2 center,
            CharacterInfo info,
            Color color,
            List<Vector3> vertices,
            List<Color> colors,
            List<Vector2> uvs,
            List<int> triangles)
        {
            var scale = CellHeight * 0.78f / FontSize;
            var width = (info.maxX - info.minX) * scale;
            var height = (info.maxY - info.minY) * scale;
            var left = center.x - width * 0.5f;
            var bottom = center.y - height * 0.5f;
            var vertex = vertices.Count;
            vertices.Add(new Vector3(left, bottom));
            vertices.Add(new Vector3(left, bottom + height));
            vertices.Add(new Vector3(left + width, bottom + height));
            vertices.Add(new Vector3(left + width, bottom));
            uvs.Add(info.uvBottomLeft);
            uvs.Add(info.uvTopLeft);
            uvs.Add(info.uvTopRight);
            uvs.Add(info.uvBottomRight);
            for (var offset = 0; offset < 4; offset++) colors.Add(color);
            triangles.Add(vertex);
            triangles.Add(vertex + 1);
            triangles.Add(vertex + 2);
            triangles.Add(vertex);
            triangles.Add(vertex + 2);
            triangles.Add(vertex + 3);
        }

        private static void ApplyGlyphMesh(
            Mesh mesh,
            List<Vector3> vertices,
            List<Color> colors,
            List<Vector2> uvs,
            List<int> triangles)
        {
            mesh.Clear();
            mesh.SetVertices(vertices);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
        }

        private static bool IsActor(CellView cell) =>
            !string.IsNullOrEmpty(cell.entityId) && !string.IsNullOrEmpty(cell.entityKind);

        private static bool HideVillageRoomLabel(UnityView view, CellView cell) =>
            view.location == "village" && cell.tile == "village_floor" &&
            !string.IsNullOrEmpty(cell.glyph) && cell.glyph != ".";

        private static char GlyphCharacter(CellView cell) =>
            string.IsNullOrEmpty(cell.glyph) ? ' ' : cell.glyph[0];

        private static Font CreateFont()
        {
            var font = Font.CreateDynamicFontFromOSFont(new[] { "Menlo", "Consolas", "Courier New" }, 64);
            return font != null ? font : Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }

        // function-length-exempt: template -- declarative terrain palette
        private static Color CellBackground(CellView cell, HeroView hero, float daylight)
        {
            var groundTile = string.IsNullOrEmpty(cell.groundTile)
                ? cell.tile : cell.groundTile;
            var baseColor = groundTile switch
            {
                "road_stone" => new Color(0.48f, 0.46f, 0.40f),
                "road_dirt" => new Color(0.48f, 0.36f, 0.22f),
                "road_bridge_wood" => new Color(0.42f, 0.25f, 0.10f),
                "road_bridge_stone" => new Color(0.48f, 0.46f, 0.40f),
                "outdoor_water" => WaterColor(cell),
                "outdoor_rock" => RockGroundColor(cell),
                "village_mine_floor" => new Color(0.11f, 0.11f, 0.10f),
                "village_floor" => new Color(0.30f, 0.25f, 0.17f),
                "village_building" => new Color(0.16f, 0.14f, 0.11f),
                "village_door_open" => new Color(0.34f, 0.25f, 0.13f),
                "floor" => new Color(0.13f, 0.14f, 0.12f),
                "difficult" => new Color(0.18f, 0.16f, 0.12f),
                "wall" => new Color(0.055f, 0.06f, 0.055f),
                "door_closed" => new Color(0.24f, 0.17f, 0.10f),
                "door_open" => new Color(0.16f, 0.13f, 0.09f),
                "stairs_up" => new Color(0.20f, 0.23f, 0.20f),
                "stairs_down" => new Color(0.20f, 0.23f, 0.20f),
                "exit" => new Color(0.22f, 0.28f, 0.18f),
                "unexplored" => new Color(0.018f, 0.02f, 0.018f),
                _ => new Color(0.20f, 0.30f, 0.17f),
            };
            var distance = Mathf.Max(Mathf.Abs(cell.x - hero.x), Mathf.Abs(cell.y - hero.y));
            var distanceLight = Mathf.Lerp(1.18f, 0.72f, Mathf.Clamp01(distance / 25f));
            var outdoors = groundTile.StartsWith("road_")
                || groundTile == "outdoor_tree" || groundTile == "outdoor_stump"
                || groundTile == "outdoor_grass" || groundTile == "outdoor_water"
                || groundTile == "outdoor_rock";
            var daylightLight = outdoors ? Mathf.Lerp(0.2f, 1f, daylight) : 0.82f;
            return baseColor * distanceLight * daylightLight;
        }

        private static Color RockGroundColor(CellView cell)
        {
            if (cell.terrainEdgeMask == 0)
            {
                var massPattern = Mathf.Abs(((cell.x * 92821) ^ (cell.y * 68917)) % 9);
                var massLight = 0.90f + massPattern * 0.018f;
                return new Color(0.16f, 0.17f, 0.15f) * massLight;
            }
            var pattern = Mathf.Abs(((cell.x * 73856093) ^ (cell.y * 19349663)) % 11);
            var light = 0.88f + pattern * 0.016f;
            return new Color(0.31f, 0.32f, 0.29f) * light;
        }

        public Vector3 WorldCellCenter(int x, int y) =>
            CellCenter(new Vector2(x, y));

        private static Color GlyphColor(CellView cell) => cell.entityKind switch
        {
            "party" => new Color(0.80f, 0.94f, 1f),
            "guard" => new Color(0.72f, 0.86f, 0.50f),
            "shopkeeper" => new Color(1f, 0.77f, 0.30f),
            "civilian" => new Color(0.89f, 0.63f, 0.49f),
            "monster" => new Color(0.92f, 0.34f, 0.27f),
            _ when cell.objectKind == "sign" => new Color(1f, 0.80f, 0.26f),
            _ when cell.objectKind == "tree" => TreeColor(cell.variant),
            _ => new Color(0.84f, 0.82f, 0.69f),
        };

        private static Color WaterColor(CellView cell) =>
            ((cell.x + cell.y) & 1) == 0
                ? new Color(0.10f, 0.38f, 0.54f)
                : new Color(0.08f, 0.30f, 0.46f);

        private static Color TreeColor(string variant) => variant switch
        {
            "pine" => new Color(0.30f, 0.70f, 0.42f),
            "birch" => new Color(0.72f, 0.88f, 0.55f),
            "willow" => new Color(0.42f, 0.79f, 0.60f),
            "rowan" => new Color(0.88f, 0.68f, 0.30f),
            _ => new Color(0.55f, 0.85f, 0.36f),
        };
    }
}
