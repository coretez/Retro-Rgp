using System.Collections.Generic;
using UnityEngine;

namespace RetroRpg
{
    public sealed class VillageSpriteRenderer : MonoBehaviour
    {
        private sealed class SpriteLayer
        {
            public Mesh mesh;
            public Texture2D texture;
        }

        private readonly Dictionary<string, SpriteLayer> layers = new();
        private Mesh workEffects;
        private Mesh sleepCovers;
        private Mesh animalShapes;
        private Mesh fenceShapes;
        private Mesh doorShapes;
        private Mesh fallbackShapes;
        private Mesh constructionShapes;
        private Mesh diagnosticShapes;
        private Mesh surfaceShapes;
        private Mesh cropShapes;
        private Mesh forageShapes;
        private Mesh stockShapes;
        private Mesh damageShapes;

        private static readonly string[] SpriteKeys = {
            "tree_pine", "tree_elm", "tree_maple", "tree_oak", "tree_birch",
            "wall_timber", "wall_stone",
            "fixture_table", "fixture_chair", "fixture_counter", "fixture_forge",
            "fixture_shelves", "fixture_rack", "fixture_bedroll", "fixture_bed",
            "fixture_cooking_pot",
            "fixture_meal_place", "fixture_altar", "fixture_stall", "fixture_jetty",
            "fixture_construction_site", "fixture_trestles",
            "fixture_storage_shed", "fixture_grain_plot", "fixture_kitchen_garden",
            "actor_cow_v2", "actor_deer_v2", "actor_pig_v1", "actor_sheep_v1",
            "actor_dog_v1", "actor_chicken_v1", "actor_wolf_v1",
            "actor_wild_boar_v1", "actor_bear_v1", "pawn_base_overhead_v2",
            "actor_cow_female_v3", "actor_cow_male_v3", "actor_cow_juvenile_v3",
            "actor_pig_female_v3", "actor_pig_male_v3", "actor_pig_juvenile_v3",
            "actor_sheep_female_v3", "actor_sheep_male_v3", "actor_sheep_juvenile_v3",
            "actor_dog_female_v3", "actor_dog_male_v3", "actor_dog_juvenile_v3",
            "actor_chicken_female_v3", "actor_chicken_male_v3",
            "actor_chicken_juvenile_v3",
            "actor_civilian", "actor_guard", "actor_official", "actor_shopkeeper",
            "actor_party_blue", "actor_party_green", "actor_party_rust",
            "actor_party_ochre"
        };

        public readonly struct ActorPlacement
        {
            public readonly CellView cell;
            public readonly Vector2 position;
            public readonly string facing;
            public readonly bool moving;
            public readonly bool working;

            public ActorPlacement(CellView cell, Vector2 position, string facing,
                bool moving, bool working)
            {
                this.cell = cell;
                this.position = position;
                this.facing = facing;
                this.moving = moving;
                this.working = working;
            }
        }

        public void Initialize()
        {
            CreateWorkEffects();
            sleepCovers = CreateShapeLayer("Village Sleep Covers", 3);
            animalShapes = CreateShapeLayer("Village Animals", 2);
            fenceShapes = CreateShapeLayer("Village Fences", 1);
            doorShapes = CreateShapeLayer("Village Doors", 1);
            fallbackShapes = CreateShapeLayer("Village Object Fallbacks", 1);
            constructionShapes = CreateShapeLayer("Village Construction Frames", 1);
            diagnosticShapes = CreateShapeLayer("Unaccepted Visual Diagnostics", 4);
            surfaceShapes = CreateShapeLayer("Village Floors and Roofs", 0);
            cropShapes = CreateShapeLayer("Village Crop States", 2);
            forageShapes = CreateShapeLayer("Village Wild Forage", 2);
            stockShapes = CreateShapeLayer("Village Stock Contents", 2);
            damageShapes = CreateShapeLayer("Village Damage States", 3);
            foreach (var key in SpriteKeys) CreateLayer(key);
        }

        public bool HasSprite(UnityView view, CellView cell) =>
            view.location == "village" &&
            (ResolveSpriteKey(cell) != null || HasProceduralVisual(cell));

        private static bool HasProceduralVisual(CellView cell) =>
            (cell.visualAccepted && cell.visualRenderMode == "procedural") ||
            cell.stockQuantity > 0 ||
            !string.IsNullOrEmpty(cell.cropStage) ||
            !string.IsNullOrEmpty(cell.forageStage) ||
            !string.IsNullOrEmpty(cell.floorPrimitiveId) ||
            !string.IsNullOrEmpty(cell.roofPrimitiveId);

        public void Render(UnityView view)
        {
            var grouped = new Dictionary<string, List<CellView>>();
            if (view.location == "village")
                foreach (var cell in view.map.cells)
                {
                    var key = ResolveSpriteKey(cell);
                    if (key == null) continue;
                    if (!grouped.TryGetValue(key, out var cells))
                        grouped[key] = cells = new List<CellView>();
                    cells.Add(cell);
                }
            foreach (var entry in layers)
                BuildLayer(entry.Value.mesh, grouped.GetValueOrDefault(entry.Key), view);
            BuildSurfaces(view);
            BuildFences(view);
            BuildDoors(view);
            BuildFallbackObjects(view);
            BuildConstructionFrames(view);
            BuildCrops(view);
            BuildForage(view);
            BuildStockContents(view);
            BuildDamageOverlays(view);
            BuildDiagnosticFallbacks(view);
        }

        private void BuildDiagnosticFallbacks(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            var color = new Color(0.95f, 0.12f, 0.78f, 0.72f);
            foreach (var cell in view.map.cells)
            {
                if (!cell.visualFallback || cell.visualFamily == null ||
                    HasProceduralVisual(cell)) continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var width = AsciiMapRenderer.CellWidth * 0.82f;
                var height = AsciiMapRenderer.CellHeight * 0.82f;
                var bar = AsciiMapRenderer.CellHeight * 0.055f;
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + Vector2.up * height * 0.5f, new Vector2(width, bar), 0f, color);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center - Vector2.up * height * 0.5f, new Vector2(width, bar), 0f, color);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + Vector2.right * width * 0.5f, new Vector2(bar, height), 0f, color);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center - Vector2.right * width * 0.5f, new Vector2(bar, height), 0f, color);
            }
            ApplyShapeMesh(diagnosticShapes, vertices, colors, uvs, triangles);
        }

        public void RenderActors(UnityView view, List<ActorPlacement> actors)
        {
            var grouped = new Dictionary<string, List<ActorPlacement>>();
            foreach (var actor in actors)
            {
                if (actor.cell.entityKind == "animal")
                {
                    var animalKey = AnimalSpriteKey(actor.cell);
                    if (!layers.ContainsKey(animalKey)) continue;
                }
                var key = ActorSpriteKey(actor);
                if (!grouped.TryGetValue(key, out var placements))
                    grouped[key] = placements = new List<ActorPlacement>();
                placements.Add(actor);
            }
            foreach (var entry in layers)
                if (entry.Key.StartsWith("actor_") || entry.Key.StartsWith("pawn_"))
                    BuildActorLayer(entry.Value.mesh,
                        grouped.GetValueOrDefault(entry.Key), view,
                        entry.Key.Contains("_east") ||
                        entry.Key.StartsWith("actor_") && entry.Key != "actor_civilian" &&
                        entry.Key != "actor_guard" && entry.Key != "actor_official" &&
                        entry.Key != "actor_shopkeeper" && !entry.Key.Contains("party"));
            BuildAnimals(view, actors);
            BuildSleepCovers(actors, view);
            BuildWorkEffects(actors, view);
        }

        private void BuildSleepCovers(List<ActorPlacement> actors, UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var actor in actors)
                if (actor.cell.entityPose == "sleeping" &&
                    actor.cell.entityKind != "animal")
                    AddSleepCover(actor, view, vertices, colors, uvs, triangles);
            ApplyShapeMesh(sleepCovers, vertices, colors, uvs, triangles);
        }

        private static void AddSleepCover(ActorPlacement actor, UnityView view,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var horizontal = actor.cell.entitySleepWidth > actor.cell.entitySleepHeight;
            var center = MapCenter(actor.position + SleepOffset(actor.cell), view);
            center += horizontal
                ? Vector2.right * AsciiMapRenderer.CellWidth * 0.38f
                : Vector2.down * AsciiMapRenderer.CellHeight * 0.38f;
            var size = horizontal
                ? new Vector2(AsciiMapRenderer.CellWidth * 1.05f,
                    AsciiMapRenderer.CellHeight * 0.68f)
                : new Vector2(AsciiMapRenderer.CellWidth * 0.68f,
                    AsciiMapRenderer.CellHeight * 1.05f);
            var cloth = SleepCoverColor(actor.cell.entityId, view.daylightLevel);
            AddRotatedQuad(vertices, colors, uvs, triangles, center, size, 0f, cloth);
            var fold = horizontal ? new Vector2(size.x * 0.07f, size.y * 0.88f)
                : new Vector2(size.x * 0.88f, size.y * 0.07f);
            AddRotatedQuad(vertices, colors, uvs, triangles, center, fold, 0f,
                cloth * 1.16f);
        }

        private static Color SleepCoverColor(string id, float daylight)
        {
            var colors = new[] {
                new Color(0.24f, 0.36f, 0.48f),
                new Color(0.34f, 0.43f, 0.28f),
                new Color(0.46f, 0.30f, 0.24f)
            };
            var value = 17;
            foreach (var character in id ?? "") value = value * 31 + character;
            return colors[Mathf.Abs(value % colors.Length)] *
                Mathf.Lerp(0.46f, 1f, daylight);
        }

        private Mesh CreateShapeLayer(string name, int order)
        {
            var mesh = new Mesh { name = name };
            var layer = new GameObject(name);
            layer.transform.SetParent(transform, false);
            layer.AddComponent<MeshFilter>().sharedMesh = mesh;
            var material = new Material(Shader.Find("Sprites/Default")) {
                mainTexture = Texture2D.whiteTexture
            };
            var renderer = layer.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = order;
            return mesh;
        }

        private void BuildSurfaces(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                if (!string.IsNullOrEmpty(cell.floorPrimitiveId))
                {
                    var floor = cell.floorMaterial == "stone"
                        ? new Color(0.42f, 0.43f, 0.40f, 0.92f)
                        : new Color(0.47f, 0.32f, 0.18f, 0.88f);
                    AddRotatedQuad(vertices, colors, uvs, triangles, center,
                        new Vector2(AsciiMapRenderer.CellWidth * 0.96f,
                            AsciiMapRenderer.CellHeight * 0.96f), 0f, floor);
                }
                if (!string.IsNullOrEmpty(cell.roofPrimitiveId))
                {
                    var roof = new Color(0.24f, 0.18f, 0.11f, 0.32f);
                    AddOutline(center,
                        new Vector2(AsciiMapRenderer.CellWidth * 0.88f,
                            AsciiMapRenderer.CellHeight * 0.88f),
                        AsciiMapRenderer.CellHeight * 0.035f, roof,
                        vertices, colors, uvs, triangles);
                }
            }
            ApplyShapeMesh(surfaceShapes, vertices, colors, uvs, triangles);
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildCrops(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                AddFieldDesignation(cell, view, vertices, colors, uvs, triangles);
                if (string.IsNullOrEmpty(cell.cropStage)) continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var earth = cell.cropStage == "fallow"
                    ? new Color(0.35f, 0.25f, 0.14f, 0.74f)
                    : new Color(0.43f, 0.30f, 0.15f, 0.86f);
                for (var row = -1; row <= 1; row++)
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center + Vector2.up * row * AsciiMapRenderer.CellHeight * 0.20f,
                        new Vector2(AsciiMapRenderer.CellWidth * 0.88f,
                            AsciiMapRenderer.CellHeight * 0.08f), 0f, earth);
                if (cell.cropStage is "germinating" or "growing" or
                    "mature" or "harvestable")
                {
                    var growth = cell.cropStage is "mature" or "harvestable"
                        ? 1f : Mathf.Clamp01(cell.cropGrowthProgress);
                    var crop = cell.cropKind == "grain"
                        ? new Color(0.78f, 0.66f, 0.20f)
                        : new Color(0.26f, 0.55f, 0.20f);
                    for (var plant = -1; plant <= 1; plant++)
                    {
                        var basePosition = center + Vector2.right * plant *
                            AsciiMapRenderer.CellWidth * 0.24f;
                        AddRotatedQuad(vertices, colors, uvs, triangles,
                            basePosition + Vector2.up * AsciiMapRenderer.CellHeight *
                                (0.08f + growth * 0.11f),
                            new Vector2(AsciiMapRenderer.CellWidth * 0.07f,
                                AsciiMapRenderer.CellHeight * (0.12f + growth * 0.30f)),
                            plant * 7f, crop);
                    }
                }
            }
            ApplyShapeMesh(cropShapes, vertices, colors, uvs, triangles);
        }

        private static void AddFieldDesignation(CellView cell, UnityView view,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            if (string.IsNullOrEmpty(cell.fieldDesignationId) ||
                cell.fieldDesignationEdgeMask == 0) return;
            var center = MapCenter(new Vector2(cell.x, cell.y), view);
            var color = cell.fieldDesignationStatus == "cleared"
                ? new Color(0.36f, 0.67f, 0.32f, 0.78f)
                : new Color(0.88f, 0.72f, 0.24f, 0.82f);
            var width = AsciiMapRenderer.CellWidth;
            var height = AsciiMapRenderer.CellHeight;
            var line = height * 0.055f;
            if ((cell.fieldDesignationEdgeMask & 1) != 0)
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + Vector2.up * height * 0.47f,
                    new Vector2(width, line), 0f, color);
            if ((cell.fieldDesignationEdgeMask & 4) != 0)
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center - Vector2.up * height * 0.47f,
                    new Vector2(width, line), 0f, color);
            if ((cell.fieldDesignationEdgeMask & 2) != 0)
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + Vector2.right * width * 0.47f,
                    new Vector2(line, height), 0f, color);
            if ((cell.fieldDesignationEdgeMask & 8) != 0)
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center - Vector2.right * width * 0.47f,
                    new Vector2(line, height), 0f, color);
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildForage(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                if (string.IsNullOrEmpty(cell.forageStage)) continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var ripe = cell.forageStage == "ripe";
                var leaf = ripe
                    ? new Color(0.30f, 0.58f, 0.22f, 0.98f)
                    : new Color(0.36f, 0.40f, 0.24f, 0.58f);
                var accent = cell.forageKind == "blackberry"
                    ? new Color(0.20f, 0.12f, 0.28f, 1f)
                    : cell.forageKind == "rosehip"
                        ? new Color(0.78f, 0.18f, 0.16f, 1f)
                        : cell.forageKind == "dandelion"
                            ? new Color(0.92f, 0.76f, 0.18f, 1f)
                            : cell.forageKind == "wild_onion"
                                ? new Color(0.76f, 0.68f, 0.88f, 1f)
                                : new Color(0.70f, 0.84f, 0.48f, 1f);
                for (var plant = -1; plant <= 1; plant++)
                {
                    var basePosition = center + Vector2.right * plant *
                        AsciiMapRenderer.CellWidth * 0.20f;
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        basePosition + Vector2.up * AsciiMapRenderer.CellHeight * 0.10f,
                        new Vector2(AsciiMapRenderer.CellWidth * 0.07f,
                            AsciiMapRenderer.CellHeight * (ripe ? 0.34f : 0.18f)),
                        plant * 12f, leaf);
                    if (ripe)
                        AddEllipse(vertices, colors, uvs, triangles,
                            basePosition + Vector2.up * AsciiMapRenderer.CellHeight * 0.28f,
                            new Vector2(AsciiMapRenderer.CellWidth * 0.055f,
                                AsciiMapRenderer.CellHeight * 0.055f), accent);
                }
            }
            ApplyShapeMesh(forageShapes, vertices, colors, uvs, triangles);
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildStockContents(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var kinds = cell.stockItemKinds is { Length: > 0 }
                    ? cell.stockItemKinds : new[] { cell.stockItemKind };
                var quantities = cell.stockQuantities is { Length: > 0 }
                    ? cell.stockQuantities : new[] { cell.stockQuantity };
                var totalQuantity = 0;
                for (var index = 0; index < quantities.Length; index++)
                    totalQuantity += quantities[index];
                var totalCapacity = cell.storageAllowance > 0
                    ? cell.storageAllowance : cell.stockCapacity;
                if (cell.storageCell && totalCapacity > 0)
                {
                    var zone = totalQuantity > totalCapacity
                        ? new Color(0.92f, 0.20f, 0.16f, 0.92f)
                        : new Color(0.82f, 0.72f, 0.38f, 0.72f);
                    var width = AsciiMapRenderer.CellWidth * 0.88f;
                    var height = AsciiMapRenderer.CellHeight * 0.82f;
                    var bar = AsciiMapRenderer.CellHeight * 0.035f;
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center + Vector2.up * height * 0.5f,
                        new Vector2(width, bar), 0f, zone);
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center - Vector2.up * height * 0.5f,
                        new Vector2(width, bar), 0f, zone);
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center + Vector2.right * width * 0.5f,
                        new Vector2(bar, height), 0f, zone);
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center - Vector2.right * width * 0.5f,
                        new Vector2(bar, height), 0f, zone);
                }
                for (var group = 0; group < kinds.Length; group++)
                {
                    if (group >= quantities.Length || quantities[group] <= 0) continue;
                    var capacity = Mathf.Max(1, totalCapacity);
                    var density = Mathf.Clamp(Mathf.CeilToInt(2f * quantities[group] /
                        Mathf.Max(1, capacity)), 1, 2);
                    var stockColor = StockColor(kinds[group]);
                    for (var item = 0; item < density; item++)
                    {
                        var slot = group * 2 + item;
                        var offset = new Vector2((slot % 3 - 1f) *
                            AsciiMapRenderer.CellWidth * 0.23f,
                            (slot / 3 - 0.5f) * AsciiMapRenderer.CellHeight * 0.18f);
                        if (kinds[group] != null &&
                            (kinds[group].Contains("timber") ||
                             kinds[group].Contains("lumber")))
                            AddRotatedQuad(vertices, colors, uvs, triangles,
                                center + offset,
                                new Vector2(AsciiMapRenderer.CellWidth * 0.30f,
                                    AsciiMapRenderer.CellHeight * 0.07f),
                                item * 8f, stockColor);
                        else
                            AddEllipse(vertices, colors, uvs, triangles,
                                center + offset,
                                new Vector2(AsciiMapRenderer.CellWidth * 0.09f,
                                    AsciiMapRenderer.CellHeight * 0.07f), stockColor);
                    }
                }
            }
            ApplyShapeMesh(stockShapes, vertices, colors, uvs, triangles);
        }

        private static Color StockColor(string kind)
        {
            if (kind == null) return new Color(0.58f, 0.46f, 0.28f);
            if (kind.Contains("meal")) return new Color(0.86f, 0.61f, 0.24f);
            if (kind.Contains("vegetable")) return new Color(0.34f, 0.65f, 0.25f);
            if (kind.Contains("forage")) return new Color(0.46f, 0.66f, 0.28f);
            if (kind.Contains("grain") || kind.Contains("seed"))
                return new Color(0.78f, 0.68f, 0.28f);
            if (kind.Contains("stone")) return new Color(0.52f, 0.54f, 0.52f);
            if (kind.Contains("timber") || kind.Contains("lumber"))
                return new Color(0.54f, 0.32f, 0.14f);
            if (kind.Contains("fish")) return new Color(0.42f, 0.62f, 0.70f);
            return new Color(0.62f, 0.48f, 0.27f);
        }

        private void BuildDamageOverlays(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                if (string.IsNullOrEmpty(cell.visualDamageBand) ||
                    cell.visualDamageBand == "intact") continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var color = cell.visualDamageBand == "critical"
                    ? new Color(0.72f, 0.14f, 0.10f, 0.92f)
                    : cell.visualDamageBand == "damaged"
                        ? new Color(0.62f, 0.26f, 0.13f, 0.86f)
                        : new Color(0.70f, 0.50f, 0.24f, 0.72f);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + new Vector2(-0.12f, 0.10f),
                    new Vector2(AsciiMapRenderer.CellWidth * 0.08f,
                        AsciiMapRenderer.CellHeight * 0.72f), 34f, color);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + new Vector2(0.17f, -0.12f),
                    new Vector2(AsciiMapRenderer.CellWidth * 0.06f,
                        AsciiMapRenderer.CellHeight * 0.42f), -28f, color);
            }
            ApplyShapeMesh(damageShapes, vertices, colors, uvs, triangles);
        }

        private void BuildFences(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                var gate = cell.objectKind == "gate" || cell.objectKind == "construction_gate";
                if (!gate && cell.objectKind != "fence" && cell.objectKind != "construction_fence")
                    continue;
                var vertical = cell.visualOrientation == "vertical" ||
                    (cell.variant != null && cell.variant.EndsWith("vertical"));
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var angle = vertical ? 90f : 0f;
                if (gate) AddGateSection(cell, center, angle, vertices, colors, uvs, triangles);
                else
                {
                    AddFenceSection(cell, center, angle, vertices, colors, uvs, triangles);
                    if ((cell.visualConnectionMask & 5) != 0 &&
                        (cell.visualConnectionMask & 10) != 0)
                        AddFenceSection(cell, center, vertical ? 0f : 90f, vertices,
                            colors, uvs, triangles);
                }
            }
            ApplyShapeMesh(fenceShapes, vertices, colors, uvs, triangles);
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildDoors(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                if (cell.objectKind != "door") continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var open = cell.tile == "village_door_open";
                var steel = cell.variant == "steel";
                var frame = steel ? new Color(0.30f, 0.33f, 0.34f)
                    : new Color(0.29f, 0.17f, 0.08f);
                var leaf = steel ? new Color(0.55f, 0.59f, 0.59f)
                    : new Color(0.55f, 0.34f, 0.16f);
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(AsciiMapRenderer.CellWidth * 0.92f,
                        AsciiMapRenderer.CellHeight * 0.16f), 0f, frame);
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + (open ? Vector2.right * AsciiMapRenderer.CellWidth * 0.34f
                        : Vector2.zero),
                    new Vector2(AsciiMapRenderer.CellWidth * 0.72f,
                        AsciiMapRenderer.CellHeight * 0.42f), open ? 78f : 0f, leaf);
                AddEllipse(vertices, colors, uvs, triangles,
                    center + new Vector2((open ? 0.38f : 0.24f) *
                        AsciiMapRenderer.CellWidth, 0.02f * AsciiMapRenderer.CellHeight),
                    new Vector2(AsciiMapRenderer.CellWidth, AsciiMapRenderer.CellHeight) *
                        0.035f, new Color(0.86f, 0.74f, 0.38f));
            }
            ApplyShapeMesh(doorShapes, vertices, colors, uvs, triangles);
        }

        private void BuildFallbackObjects(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                if (cell.objectKind == "material")
                    AddMaterialFallback(cell, center, vertices, colors, uvs, triangles);
                else if (cell.objectKind == "sign")
                    AddSignFallback(center, vertices, colors, uvs, triangles);
                else if (cell.tile == "outdoor_stump" || cell.tile == "village_pit" ||
                    cell.tile == "outdoor_rock" || cell.tile == "road_bridge_wood")
                    AddTerrainFallback(cell, center, vertices, colors, uvs, triangles);
                else if (cell.objectKind == "fixture" &&
                    cell.variant is "cart" or "hitching_rail" or
                        "milking_rail" or "prayer_stone")
                    AddFixtureFallback(cell, center, vertices, colors, uvs, triangles);
            }
            ApplyShapeMesh(fallbackShapes, vertices, colors, uvs, triangles);
        }

        private static void AddMaterialFallback(CellView cell, Vector2 center,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            if (cell.variant == "timber")
            {
                AddMaterialBundle(center, 0f, vertices, colors, uvs, triangles);
                return;
            }
            var earth = cell.variant == "earth";
            var color = earth ? new Color(0.40f, 0.29f, 0.17f)
                : new Color(0.47f, 0.49f, 0.47f);
            for (var index = 0; index < 3; index++)
                AddEllipse(vertices, colors, uvs, triangles,
                    center + new Vector2((index - 1) * 0.18f, index % 2 * 0.08f),
                    new Vector2(0.18f, 0.12f), color);
        }

        private static void AddSignFallback(Vector2 center, List<Vector3> vertices,
            List<Color> colors, List<Vector2> uvs, List<int> triangles)
        {
            var wood = new Color(0.49f, 0.30f, 0.13f);
            AddRotatedQuad(vertices, colors, uvs, triangles, center,
                new Vector2(0.10f, 0.72f), 0f, wood);
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + Vector2.up * 0.22f, new Vector2(0.72f, 0.34f), 0f, wood);
        }

        private static void AddTerrainFallback(CellView cell, Vector2 center,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            if (cell.tile == "road_bridge_wood")
            {
                var timber = new Color(0.55f, 0.34f, 0.14f);
                for (var plank = -2; plank <= 2; plank++)
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center + Vector2.up * plank * 0.17f,
                        new Vector2(0.88f, 0.11f), 0f, timber);
                return;
            }
            if (cell.tile == "outdoor_rock")
            {
                AddRockFallback(cell, center, vertices, colors, uvs, triangles);
                return;
            }
            if (cell.tile == "village_pit")
            {
                AddEllipse(vertices, colors, uvs, triangles, center,
                    new Vector2(0.42f, 0.30f), new Color(0.38f, 0.27f, 0.15f));
                AddEllipse(vertices, colors, uvs, triangles, center,
                    new Vector2(0.30f, 0.20f), new Color(0.12f, 0.10f, 0.08f));
                return;
            }
            AddEllipse(vertices, colors, uvs, triangles, center,
                new Vector2(0.34f, 0.25f), new Color(0.43f, 0.25f, 0.11f));
            AddEllipse(vertices, colors, uvs, triangles, center,
                new Vector2(0.22f, 0.15f), new Color(0.68f, 0.48f, 0.25f));
        }

        private static void AddRockFallback(CellView cell, Vector2 center,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var pattern = Mathf.Abs(((cell.x * 73856093) ^ (cell.y * 19349663)) % 7);
            AddRockEdgeFallback(cell, center, pattern, vertices, colors, uvs, triangles);
            if (cell.terrainEdgeMask == 0) return;
            if (pattern > 1)
                return;
            var stone = cell.variant == "limestone_outcrop"
                ? new Color(0.62f, 0.61f, 0.52f)
                : new Color(0.42f, 0.43f, 0.39f);
            var offset = new Vector2((pattern - 0.5f) * 0.20f, pattern * 0.08f);
            AddEllipse(vertices, colors, uvs, triangles, center + offset,
                new Vector2(0.30f, 0.21f), stone);
            AddEllipse(vertices, colors, uvs, triangles,
                center + offset + new Vector2(0.13f, 0.08f),
                new Vector2(0.16f, 0.13f), stone * 0.82f);
        }

        private static void AddRockEdgeFallback(CellView cell, Vector2 center,
            int pattern, List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles)
        {
            if (cell.terrainEdgeMask == 0)
                return;
            var cliff = new Color(0.17f, 0.18f, 0.16f);
            var lip = new Color(0.52f, 0.52f, 0.45f);
            var span = 0.82f + pattern * 0.02f;
            if ((cell.terrainEdgeMask & 1) != 0)
                AddRockEdge(center + Vector2.up * 0.41f, new Vector2(span, 0.18f),
                    Vector2.down * 0.07f, cliff, lip, vertices, colors, uvs, triangles);
            if ((cell.terrainEdgeMask & 2) != 0)
                AddRockEdge(center + Vector2.right * 0.41f, new Vector2(0.18f, span),
                    Vector2.left * 0.07f, cliff, lip, vertices, colors, uvs, triangles);
            if ((cell.terrainEdgeMask & 4) != 0)
                AddRockEdge(center + Vector2.down * 0.41f, new Vector2(span, 0.18f),
                    Vector2.up * 0.07f, cliff, lip, vertices, colors, uvs, triangles);
            if ((cell.terrainEdgeMask & 8) != 0)
                AddRockEdge(center + Vector2.left * 0.41f, new Vector2(0.18f, span),
                    Vector2.right * 0.07f, cliff, lip, vertices, colors, uvs, triangles);
        }

        private static void AddRockEdge(Vector2 center, Vector2 size, Vector2 lipOffset,
            Color cliff, Color lip, List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles)
        {
            AddRotatedQuad(vertices, colors, uvs, triangles, center, size, 0f, cliff);
            AddRotatedQuad(vertices, colors, uvs, triangles, center + lipOffset,
                size * 0.48f, 0f, lip);
        }

        private static void AddFixtureFallback(CellView cell, Vector2 center,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var wood = new Color(0.48f, 0.29f, 0.13f);
            if (cell.variant == "prayer_stone")
            {
                AddEllipse(vertices, colors, uvs, triangles, center,
                    new Vector2(0.30f, 0.36f), new Color(0.48f, 0.50f, 0.48f));
                return;
            }
            var width = cell.variant == "cart" ? 0.82f : 0.90f;
            AddRotatedQuad(vertices, colors, uvs, triangles, center,
                new Vector2(width, cell.variant == "cart" ? 0.42f : 0.10f), 0f, wood);
            if (cell.variant == "cart")
                for (var side = -1; side <= 1; side += 2)
                    AddEllipse(vertices, colors, uvs, triangles,
                        center + Vector2.right * side * 0.34f,
                        Vector2.one * 0.13f, new Color(0.20f, 0.13f, 0.08f));
            else
                for (var side = -1; side <= 1; side += 2)
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        center + Vector2.right * side * 0.36f,
                        new Vector2(0.10f, 0.48f), 0f, wood);
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildConstructionFrames(UnityView view)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var cell in view.map.cells)
            {
                if (cell.tile != "village_construction" ||
                    cell.constructionStage == "complete" ||
                    (cell.objectKind != "construction_wall" &&
                     cell.objectKind != "construction_door" &&
                     cell.objectKind != "construction_fixture")) continue;
                var center = MapCenter(new Vector2(cell.x, cell.y), view);
                var planned = cell.constructionStage == "planned";
                if (cell.constructionStage == "material_delivered")
                {
                    AddMaterialBundle(center, 0f, vertices, colors, uvs, triangles);
                    continue;
                }
                if (cell.objectKind == "construction_fixture")
                    AddFixtureConstructionFrame(cell, center, planned, vertices, colors,
                        uvs, triangles);
                else if (cell.objectKind == "construction_door")
                    AddDoorConstructionFrame(center, planned, vertices, colors, uvs,
                        triangles);
                else AddWallConstructionFrame(cell, center, planned, vertices, colors,
                    uvs, triangles);
                if (cell.constructionStage == "in_progress")
                    AddConstructionProgress(cell, center, vertices, colors, uvs,
                        triangles);
            }
            ApplyShapeMesh(constructionShapes, vertices, colors, uvs, triangles);
        }

        private static void AddConstructionProgress(CellView cell, Vector2 origin,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var cellsWide = Mathf.Max(1, cell.objectWidth);
            var cellsHigh = Mathf.Max(1, cell.objectHeight);
            var width = cellsWide * AsciiMapRenderer.CellWidth * 0.76f;
            var center = origin + new Vector2((cellsWide - 1) *
                AsciiMapRenderer.CellWidth * 0.5f, -(cellsHigh - 1) *
                AsciiMapRenderer.CellHeight * 0.5f);
            var bottom = center - Vector2.up * cellsHigh *
                AsciiMapRenderer.CellHeight * 0.38f;
            var ratio = Mathf.Clamp01(cell.constructionLaborCompleted /
                Mathf.Max(1f, cell.constructionLaborRequired));
            AddRotatedQuad(vertices, colors, uvs, triangles, bottom,
                new Vector2(width, AsciiMapRenderer.CellHeight * 0.08f), 0f,
                new Color(0.15f, 0.12f, 0.08f, 0.90f));
            AddRotatedQuad(vertices, colors, uvs, triangles,
                bottom + Vector2.left * width * (1f - ratio) * 0.5f,
                new Vector2(width * ratio, AsciiMapRenderer.CellHeight * 0.055f),
                0f, new Color(0.86f, 0.70f, 0.28f, 0.95f));
        }

        private static void AddFixtureConstructionFrame(CellView cell, Vector2 origin,
            bool planned, List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles)
        {
            var width = Mathf.Max(1, cell.objectWidth) * AsciiMapRenderer.CellWidth;
            var height = Mathf.Max(1, cell.objectHeight) * AsciiMapRenderer.CellHeight;
            var center = origin + new Vector2(
                (Mathf.Max(1, cell.objectWidth) - 1) * AsciiMapRenderer.CellWidth * 0.5f,
                -(Mathf.Max(1, cell.objectHeight) - 1) * AsciiMapRenderer.CellHeight * 0.5f);
            var color = planned ? new Color(0.82f, 0.72f, 0.42f, 0.55f)
                : new Color(0.58f, 0.40f, 0.21f);
            var beam = Mathf.Min(width, height) * (planned ? 0.05f : 0.09f);
            AddOutline(center, new Vector2(width * 0.92f, height * 0.86f), beam,
                color, vertices, colors, uvs, triangles);
            if (!planned)
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(width * 0.82f, beam), -24f, color);
        }

        private static void AddOutline(Vector2 center, Vector2 size, float thickness,
            Color color, List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles)
        {
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + Vector2.up * size.y * 0.5f,
                new Vector2(size.x, thickness), 0f, color);
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center - Vector2.up * size.y * 0.5f,
                new Vector2(size.x, thickness), 0f, color);
            foreach (var side in new[] { -1f, 1f })
                AddRotatedQuad(vertices, colors, uvs, triangles,
                    center + Vector2.right * size.x * 0.5f * side,
                    new Vector2(thickness, size.y), 0f, color);
        }

        private static void AddWallConstructionFrame(CellView cell, Vector2 center,
            bool planned, List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles)
        {
            var timber = planned ? new Color(0.82f, 0.72f, 0.42f, 0.55f)
                : new Color(0.58f, 0.40f, 0.21f);
            var thickness = AsciiMapRenderer.CellHeight * (planned ? 0.06f : 0.15f);
            var horizontal = (cell.visualConnectionMask & 10) != 0;
            var vertical = (cell.visualConnectionMask & 5) != 0;
            if (!horizontal && !vertical) horizontal = true;
            if (horizontal)
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(AsciiMapRenderer.CellWidth * 1.04f, thickness), 0f,
                    timber);
            if (vertical)
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(thickness, AsciiMapRenderer.CellHeight * 1.04f), 0f,
                    timber);
            if (!planned)
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(AsciiMapRenderer.CellWidth * 0.22f,
                        AsciiMapRenderer.CellHeight * 0.72f), 0f,
                    new Color(0.33f, 0.20f, 0.10f));
        }

        private static void AddDoorConstructionFrame(Vector2 center, bool planned,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var timber = planned ? new Color(0.82f, 0.72f, 0.42f, 0.55f)
                : new Color(0.52f, 0.32f, 0.16f);
            var post = new Vector2(AsciiMapRenderer.CellWidth * 0.12f,
                AsciiMapRenderer.CellHeight * 0.80f);
            var offset = Vector2.right * AsciiMapRenderer.CellWidth * 0.34f;
            AddRotatedQuad(vertices, colors, uvs, triangles, center - offset, post,
                0f, timber);
            AddRotatedQuad(vertices, colors, uvs, triangles, center + offset, post,
                0f, timber);
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + Vector2.up * AsciiMapRenderer.CellHeight * 0.35f,
                new Vector2(AsciiMapRenderer.CellWidth * 0.80f,
                    AsciiMapRenderer.CellHeight * 0.12f), 0f, timber);
        }

        private static void AddFenceSection(CellView cell, Vector2 center, float angle,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var planned = cell.constructionStage == "planned";
            if (cell.constructionStage == "material_delivered")
            {
                AddMaterialBundle(center, angle, vertices, colors, uvs, triangles);
                return;
            }
            var framing = cell.constructionStage == "in_progress";
            var timber = planned ? new Color(0.82f, 0.72f, 0.42f, 0.55f)
                : framing ? new Color(0.58f, 0.40f, 0.21f)
                : new Color(0.38f, 0.24f, 0.12f);
            var railHeight = AsciiMapRenderer.CellHeight * (planned ? 0.06f : 0.11f);
            var spread = Rotate(new Vector2(0f, AsciiMapRenderer.CellHeight * 0.10f), angle);
            AddRotatedQuad(vertices, colors, uvs, triangles, center - spread,
                new Vector2(AsciiMapRenderer.CellWidth * 1.04f, railHeight), angle, timber);
            if (!planned && !framing)
                AddRotatedQuad(vertices, colors, uvs, triangles, center + spread,
                    new Vector2(AsciiMapRenderer.CellWidth * 1.04f, railHeight), angle, timber);
            AddRotatedQuad(vertices, colors, uvs, triangles, center,
                new Vector2(AsciiMapRenderer.CellWidth * (planned ? 0.10f : 0.20f),
                    AsciiMapRenderer.CellHeight * (planned ? 0.18f : 0.34f)), angle,
                planned ? timber : new Color(0.25f, 0.15f, 0.08f));
        }

        private static void AddGateSection(CellView cell, Vector2 center, float angle,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var planned = cell.constructionStage == "planned";
            if (cell.constructionStage == "material_delivered")
            {
                AddMaterialBundle(center, angle, vertices, colors, uvs, triangles);
                return;
            }
            var framing = cell.constructionStage == "in_progress";
            var timber = planned ? new Color(0.82f, 0.72f, 0.42f, 0.55f)
                : framing ? new Color(0.58f, 0.40f, 0.21f)
                : new Color(0.38f, 0.24f, 0.12f);
            var postSize = new Vector2(AsciiMapRenderer.CellWidth * 0.16f,
                AsciiMapRenderer.CellHeight * 0.38f);
            var edge = Rotate(new Vector2(AsciiMapRenderer.CellWidth * 0.40f, 0f), angle);
            AddRotatedQuad(vertices, colors, uvs, triangles, center - edge, postSize,
                angle, timber);
            AddRotatedQuad(vertices, colors, uvs, triangles, center + edge, postSize,
                angle, timber);
            AddRotatedQuad(vertices, colors, uvs, triangles, center,
                new Vector2(AsciiMapRenderer.CellWidth * 0.78f,
                    AsciiMapRenderer.CellHeight * (planned ? 0.07f : 0.12f)), angle,
                timber);
            if (!planned)
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(AsciiMapRenderer.CellWidth * 0.68f,
                        AsciiMapRenderer.CellHeight * 0.08f), angle + 28f, timber);
        }

        private static void AddMaterialBundle(Vector2 center, float angle,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            var timber = new Color(0.48f, 0.30f, 0.14f);
            for (var plank = -1; plank <= 1; plank++)
            {
                var offset = Rotate(new Vector2(0f,
                    plank * AsciiMapRenderer.CellHeight * 0.10f), angle);
                AddRotatedQuad(vertices, colors, uvs, triangles, center + offset,
                    new Vector2(AsciiMapRenderer.CellWidth * 0.68f,
                        AsciiMapRenderer.CellHeight * 0.07f), angle, timber);
            }
        }

        // function-length-exempt: template -- visual-layer construction
        private void BuildAnimals(UnityView view, List<ActorPlacement> actors)
        {
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var actor in actors)
            {
                if (actor.cell.entityKind != "animal") continue;
                AddAnimalTether(view, actor, vertices, colors, uvs, triangles);
                var animalKey = AnimalSpriteKey(actor.cell);
                var deer = actor.cell.entityReason == "animal_deer";
                if (layers.ContainsKey(animalKey)) continue;
                var east = actor.cell.variant == null ||
                    !actor.cell.variant.EndsWith("_west");
                var direction = east ? 1f : -1f;
                var center = MapCenter(actor.position +
                    new Vector2(deer ? 0f : 0.5f, 0f), view);
                var brown = deer ? new Color(0.55f, 0.32f, 0.14f)
                    : new Color(0.43f, 0.27f, 0.15f);
                var cream = deer ? new Color(0.78f, 0.63f, 0.42f)
                    : new Color(0.83f, 0.76f, 0.61f);
                AddEllipse(vertices, colors, uvs, triangles, center,
                    new Vector2(AsciiMapRenderer.CellWidth * (deer ? 0.48f : 0.78f),
                        AsciiMapRenderer.CellHeight * (deer ? 0.27f : 0.38f)), brown);
                AddEllipse(vertices, colors, uvs, triangles,
                    center + new Vector2(direction * AsciiMapRenderer.CellWidth *
                        (deer ? 0.48f : 0.82f), deer ? 0.10f : 0f),
                    new Vector2(AsciiMapRenderer.CellWidth * (deer ? 0.20f : 0.28f),
                        AsciiMapRenderer.CellHeight * (deer ? 0.19f : 0.25f)), cream);
                if (deer)
                {
                    for (var leg = -1; leg <= 1; leg += 2)
                        AddRotatedQuad(vertices, colors, uvs, triangles,
                            center + new Vector2(leg * AsciiMapRenderer.CellWidth * 0.25f,
                                -AsciiMapRenderer.CellHeight * 0.28f),
                            new Vector2(AsciiMapRenderer.CellWidth * 0.055f,
                                AsciiMapRenderer.CellHeight * 0.30f), 0f, brown);
                    var head = center + new Vector2(direction *
                        AsciiMapRenderer.CellWidth * 0.48f,
                        AsciiMapRenderer.CellHeight * 0.10f);
                    var antler = new Color(0.34f, 0.20f, 0.10f);
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        head + new Vector2(-direction * AsciiMapRenderer.CellWidth * 0.05f,
                            AsciiMapRenderer.CellHeight * 0.25f),
                        new Vector2(AsciiMapRenderer.CellWidth * 0.045f,
                            AsciiMapRenderer.CellHeight * 0.27f),
                        direction * 18f, antler);
                    AddRotatedQuad(vertices, colors, uvs, triangles,
                        head + new Vector2(direction * AsciiMapRenderer.CellWidth * 0.08f,
                            AsciiMapRenderer.CellHeight * 0.25f),
                        new Vector2(AsciiMapRenderer.CellWidth * 0.045f,
                            AsciiMapRenderer.CellHeight * 0.27f),
                        -direction * 18f, antler);
                }
                else
                    AddEllipse(vertices, colors, uvs, triangles,
                        center - new Vector2(direction * AsciiMapRenderer.CellWidth * 0.18f, 0f),
                        new Vector2(AsciiMapRenderer.CellWidth * 0.24f,
                            AsciiMapRenderer.CellHeight * 0.28f), cream);
            }
            ApplyShapeMesh(animalShapes, vertices, colors, uvs, triangles);
        }

        private static void AddAnimalTether(UnityView view, ActorPlacement actor,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles)
        {
            if (actor.cell.entityObjective != "tethered") return;
            var animal = MapCenter(actor.position, view);
            var anchor = MapCenter(new Vector2(actor.cell.animalTetherX,
                actor.cell.animalTetherY), view);
            var delta = animal - anchor;
            var length = Mathf.Max(2f, delta.magnitude);
            var angle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg;
            AddRotatedQuad(vertices, colors, uvs, triangles,
                anchor + delta * 0.5f, new Vector2(length, 0.30f), angle,
                new Color(0.27f, 0.18f, 0.09f, 0.90f));
            AddRotatedQuad(vertices, colors, uvs, triangles, anchor,
                new Vector2(0.65f, AsciiMapRenderer.CellHeight * 0.16f), 0f,
                new Color(0.20f, 0.12f, 0.05f));
        }

        private static void AddEllipse(List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles, Vector2 center, Vector2 radius,
            Color color)
        {
            const int segments = 16;
            var first = vertices.Count;
            vertices.Add(new Vector3(center.x, center.y, -0.18f));
            colors.Add(color);
            uvs.Add(Vector2.one * 0.5f);
            for (var index = 0; index <= segments; index++)
            {
                var angle = index * Mathf.PI * 2f / segments;
                vertices.Add(new Vector3(center.x + Mathf.Cos(angle) * radius.x,
                    center.y + Mathf.Sin(angle) * radius.y, -0.18f));
                colors.Add(color);
                uvs.Add(Vector2.one * 0.5f);
                if (index > 0)
                    triangles.AddRange(new[] { first, first + index, first + index + 1 });
            }
        }

        private static void ApplyShapeMesh(Mesh mesh, List<Vector3> vertices,
            List<Color> colors, List<Vector2> uvs, List<int> triangles)
        {
            mesh.Clear();
            mesh.SetVertices(vertices);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
        }

        private void CreateWorkEffects()
        {
            workEffects = new Mesh { name = "Animated village work effects" };
            var layer = new GameObject("Village Work Effects");
            layer.transform.SetParent(transform, false);
            layer.AddComponent<MeshFilter>().sharedMesh = workEffects;
            var material = new Material(Shader.Find("Sprites/Default")) {
                mainTexture = Texture2D.whiteTexture
            };
            var renderer = layer.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = 4;
        }

        private void CreateLayer(string key)
        {
            var texture = Resources.Load<Texture2D>($"VillageSprites/{key}");
            if (texture == null) return;
            var layer = new GameObject(key);
            layer.transform.SetParent(transform, false);
            var mesh = new Mesh { name = $"Village sprite mesh: {key}" };
            layer.AddComponent<MeshFilter>().sharedMesh = mesh;
            var material = new Material(Shader.Find("Sprites/Default")) {
                mainTexture = texture
            };
            var renderer = layer.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = key.StartsWith("actor_") || key.StartsWith("pawn_")
                ? 2 : 1;
            layers[key] = new SpriteLayer { mesh = mesh, texture = texture };
        }

        private string ResolveSpriteKey(CellView cell)
        {
            string key = null;
            if (cell.tile == "outdoor_tree") key = $"tree_{cell.variant}";
            if (cell.tile == "village_building") key = $"wall_{cell.variant ?? "timber"}";
            if (cell.tile == "village_construction")
                key = null;
            if (cell.objectKind == "door") return null;
            if (cell.tile == "village_furniture") key = $"fixture_{cell.variant}";
            if (cell.objectKind == "sign") key = $"sign_{cell.variant}";
            if (cell.tile == "outdoor_stump" || cell.tile == "village_pit")
                key = $"terrain_{cell.variant}";
            if (cell.objectKind == "material") key = $"material_{cell.variant}";
            return key != null && layers.ContainsKey(key) ? key : null;
        }

        private string ActorSpriteKey(ActorPlacement actor)
        {
            if (actor.cell.entityKind == "animal")
            {
                var key = AnimalSpriteKey(actor.cell);
                if (layers.ContainsKey(key)) return key;
            }
            if (actor.cell.entityKind == "party")
            {
                var partyKey = $"actor_party_{actor.cell.entityOutfit}";
                if (layers.ContainsKey(partyKey)) return partyKey;
            }
            var roleKey = $"actor_{actor.cell.entityKind}";
            if (layers.ContainsKey(roleKey)) return roleKey;
            return "pawn_base_overhead_v2";
        }

        private static string AnimalSpriteKey(CellView cell)
        {
            if (!string.IsNullOrEmpty(cell.visualAssetKey) &&
                cell.visualAssetKey.StartsWith("actor_"))
                return cell.visualAssetKey;
            var species = cell.entityReason?.Replace("animal_", "");
            if (species == "cow") return "actor_cow_v2";
            if (species == "deer") return "actor_deer_v2";
            return $"actor_{species}_v1";
        }

        private static Vector2 AnimalSpriteSize(CellView cell)
        {
            var species = cell.entityReason?.Replace("animal_", "");
            var juvenile = !string.IsNullOrEmpty(cell.entityAgeStage) &&
                cell.entityAgeStage != "adult";
            var large = species == "cow" || species == "bear";
            var small = species == "chicken";
            var width = small ? 0.72f : large ? 1.85f : 1.25f;
            var height = small ? 0.58f : large ? 1.05f : 0.84f;
            if (juvenile) { width *= 0.62f; height *= 0.62f; }
            return new Vector2(AsciiMapRenderer.CellWidth * width,
                AsciiMapRenderer.CellHeight * height);
        }

        private static void BuildLayer(Mesh mesh, List<CellView> cells, UnityView view)
        {
            mesh.Clear();
            if (cells == null || cells.Count == 0) return;
            var vertices = new List<Vector3>(cells.Count * 4);
            var colors = new List<Color>(cells.Count * 4);
            var uvs = new List<Vector2>(cells.Count * 4);
            var triangles = new List<int>(cells.Count * 6);
            foreach (var cell in cells)
                WriteSprite(cell, view, new Vector2(cell.x, cell.y), vertices, colors, uvs, triangles);
            mesh.SetVertices(vertices);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
        }

        private static void BuildActorLayer(Mesh mesh, List<ActorPlacement> actors,
            UnityView view, bool mirrorWest)
        {
            mesh.Clear();
            if (actors == null || actors.Count == 0) return;
            var vertices = new List<Vector3>(actors.Count * 4);
            var colors = new List<Color>(actors.Count * 4);
            var uvs = new List<Vector2>(actors.Count * 4);
            var triangles = new List<int>(actors.Count * 6);
            foreach (var actor in actors)
            {
                var resting = actor.cell.entityPose is "sleeping" or "dead";
                var stride = actor.moving && !resting
                    ? Mathf.Abs(Mathf.Sin(Time.unscaledTime * 14f))
                    : 0f;
                var bob = stride * AsciiMapRenderer.CellHeight * 0.07f;
                var lean = actor.moving && actor.facing is "east" or "west"
                    ? (actor.facing == "east" ? 0.04f : -0.04f)
                    : 0f;
                WriteSprite(actor.cell, view,
                    actor.position + SleepOffset(actor.cell) + new Vector2(lean, -bob),
                    vertices, colors, uvs,
                    triangles, mirrorWest && actor.facing == "west",
                    SleepRotation(actor.cell));
            }
            mesh.SetVertices(vertices);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
        }

        private static Vector2 SleepOffset(CellView cell)
        {
            if (cell.entityPose != "sleeping") return Vector2.zero;
            return new Vector2(-(Mathf.Max(1, cell.entitySleepWidth) - 1) * 0.5f,
                -(Mathf.Max(1, cell.entitySleepHeight) - 1) * 0.5f);
        }

        private static float SleepRotation(CellView cell) =>
            cell.entityPose == "dead" ||
            cell.entityPose == "sleeping" &&
            cell.entitySleepWidth > cell.entitySleepHeight ? 90f : 0f;

        private void BuildWorkEffects(List<ActorPlacement> actors, UnityView view)
        {
            workEffects.Clear();
            var vertices = new List<Vector3>();
            var colors = new List<Color>();
            var uvs = new List<Vector2>();
            var triangles = new List<int>();
            foreach (var actor in actors)
            {
                var carrying = actor.cell.entityCarryingKind;
                if (actor.cell.entityPose is "sleeping" or "dead") continue;
                if (!actor.working && string.IsNullOrEmpty(carrying)) continue;
                var phase = Time.unscaledTime * 8f + StablePhase(actor.cell.entityId);
                var center = MapCenter(actor.position, view) +
                    new Vector2(AsciiMapRenderer.CellWidth * 0.34f,
                        AsciiMapRenderer.CellHeight * (0.22f + Mathf.Sin(phase) * 0.10f));
                if (!string.IsNullOrEmpty(carrying))
                    AddCarriedItem(vertices, colors, uvs, triangles, center,
                        carrying, actor.working && !actor.moving ? phase : 0f);
                else if (actor.working && !actor.moving && IsBuilding(actor.cell))
                    AddCarriedItem(vertices, colors, uvs, triangles, center,
                        "claw_hammer", phase);
                else if (actor.working && !actor.moving)
                    AddWorkDust(vertices, colors, uvs, triangles, center, phase);
            }
            workEffects.SetVertices(vertices);
            workEffects.SetColors(colors);
            workEffects.SetUVs(0, uvs);
            workEffects.SetTriangles(triangles, 0);
            workEffects.RecalculateBounds();
        }

        private static bool IsBuilding(CellView cell)
        {
            var action = cell.entityAction?.ToLowerInvariant() ?? "";
            return action.Contains("build") || action.Contains("raise") ||
                action.Contains("construction") || action.Contains("wall section");
        }

        private static void AddCarriedItem(List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles, Vector2 center, string kind,
            float phase)
        {
            var tool = kind.Contains("axe") || kind.Contains("hammer") ||
                kind.Contains("saw");
            var angle = tool && phase != 0f
                ? Mathf.Lerp(-55f, 35f, (Mathf.Sin(phase) + 1f) * 0.5f)
                : 24f;
            if (!tool)
            {
                AddRotatedQuad(vertices, colors, uvs, triangles, center,
                    new Vector2(0.32f, 0.28f), 0f, new Color(0.66f, 0.43f, 0.20f));
                return;
            }
            var metal = kind.Contains("saw") ? new Vector2(0.42f, 0.09f) :
                new Vector2(0.28f, 0.10f);
            AddRotatedQuad(vertices, colors, uvs, triangles, center,
                new Vector2(0.07f, 0.42f), angle, new Color(0.48f, 0.27f, 0.10f));
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + Rotate(new Vector2(0f, 0.20f), angle), metal, angle,
                new Color(0.82f, 0.84f, 0.78f));
        }

        private static void AddWorkDust(List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles, Vector2 center, float phase)
        {
            var pulse = (Mathf.Sin(phase) + 1f) * 0.5f;
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + new Vector2(0.08f, -0.22f), new Vector2(0.12f, 0.12f),
                pulse * 30f, new Color(0.72f, 0.58f, 0.35f, 0.75f));
            AddRotatedQuad(vertices, colors, uvs, triangles,
                center + new Vector2(0.25f, -0.16f + pulse * 0.08f),
                new Vector2(0.08f, 0.08f), -pulse * 45f,
                new Color(0.80f, 0.68f, 0.43f, 0.6f));
        }

        private static Vector2 MapCenter(Vector2 position, UnityView view)
        {
            var column = position.x - view.map.origin.x;
            var row = position.y - view.map.origin.y;
            return new Vector2(
                (column - view.map.width * 0.5f + 0.5f) * AsciiMapRenderer.CellWidth,
                (view.map.height * 0.5f - row - 0.5f) * AsciiMapRenderer.CellHeight);
        }

        private static float StablePhase(string id)
        {
            var value = 17;
            foreach (var character in id ?? "") value = value * 31 + character;
            return Mathf.Abs(value % 628) / 100f;
        }

        private static Vector2 Rotate(Vector2 value, float degrees)
        {
            var radians = degrees * Mathf.Deg2Rad;
            var cosine = Mathf.Cos(radians);
            var sine = Mathf.Sin(radians);
            return new Vector2(value.x * cosine - value.y * sine,
                value.x * sine + value.y * cosine);
        }

        private static void AddRotatedQuad(List<Vector3> vertices, List<Color> colors,
            List<Vector2> uvs, List<int> triangles, Vector2 center, Vector2 size,
            float angle, Color color)
        {
            var right = Rotate(new Vector2(size.x * 0.5f, 0f), angle);
            var up = Rotate(new Vector2(0f, size.y * 0.5f), angle);
            var first = vertices.Count;
            foreach (var point in new[] { center - right - up, center - right + up,
                         center + right + up, center + right - up })
                vertices.Add(new Vector3(point.x, point.y, -0.24f));
            uvs.AddRange(new[] { Vector2.zero, Vector2.up, Vector2.one, Vector2.right });
            for (var index = 0; index < 4; index++) colors.Add(color);
            triangles.AddRange(new[] { first, first + 1, first + 2,
                first, first + 2, first + 3 });
        }

        // function-length-exempt: template -- mesh emission
        private static void WriteSprite(CellView cell, UnityView view, Vector2 position,
            List<Vector3> vertices, List<Color> colors, List<Vector2> uvs,
            List<int> triangles, bool flipX = false, float rotation = 0f)
        {
            var column = position.x - view.map.origin.x;
            var row = position.y - view.map.origin.y;
            var center = new Vector2(
                (column - view.map.width * 0.5f + 0.5f) * AsciiMapRenderer.CellWidth,
                (view.map.height * 0.5f - row - 0.5f) * AsciiMapRenderer.CellHeight);
            var footprint = new Vector2(Mathf.Max(1, cell.objectWidth),
                Mathf.Max(1, cell.objectHeight));
            center += new Vector2((footprint.x - 1f) * AsciiMapRenderer.CellWidth * 0.5f,
                -(footprint.y - 1f) * AsciiMapRenderer.CellHeight * 0.5f);
            var size = SpriteSize(cell);
            var bottom = cell.tile == "outdoor_tree" || !string.IsNullOrEmpty(cell.entityId)
                ? center.y - AsciiMapRenderer.CellHeight * 0.5f
                : center.y - size.y * 0.5f;
            var left = center.x - size.x * 0.5f;
            var vertex = vertices.Count;
            var spriteCenter = new Vector2(left + size.x * 0.5f,
                bottom + size.y * 0.5f);
            var right = Rotate(new Vector2(size.x * 0.5f, 0f), rotation);
            var up = Rotate(new Vector2(0f, size.y * 0.5f), rotation);
            foreach (var point in new[] { spriteCenter - right - up,
                         spriteCenter - right + up, spriteCenter + right + up,
                         spriteCenter + right - up })
                vertices.Add(new Vector3(point.x, point.y, -0.15f));
            if (cell.objectKind == "fence" && cell.variant == "timber_vertical")
            {
                uvs.Add(Vector2.up);
                uvs.Add(Vector2.one);
                uvs.Add(Vector2.right);
                uvs.Add(Vector2.zero);
            }
            else
            {
                uvs.Add(flipX ? Vector2.right : Vector2.zero);
                uvs.Add(flipX ? Vector2.one : Vector2.up);
                uvs.Add(flipX ? Vector2.up : Vector2.one);
                uvs.Add(flipX ? Vector2.zero : Vector2.right);
            }
            var light = cell.tile.StartsWith("outdoor_") || !string.IsNullOrEmpty(cell.entityId)
                ? Mathf.Lerp(0.30f, 1f, view.daylightLevel) : 0.90f;
            for (var offset = 0; offset < 4; offset++) colors.Add(Color.white * light);
            triangles.Add(vertex);
            triangles.Add(vertex + 1);
            triangles.Add(vertex + 2);
            triangles.Add(vertex);
            triangles.Add(vertex + 2);
            triangles.Add(vertex + 3);
        }

        // function-length-exempt: template -- declarative asset sizing table
        private static Vector2 SpriteSize(CellView cell)
        {
            if (cell.objectKind == "fence")
                return cell.variant == "timber_vertical"
                    ? new Vector2(AsciiMapRenderer.CellWidth * 0.46f,
                        AsciiMapRenderer.CellHeight * 1.02f)
                    : new Vector2(AsciiMapRenderer.CellWidth * 1.02f,
                        AsciiMapRenderer.CellHeight * 0.46f);
            if (cell.tile == "outdoor_tree")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.8f,
                    AsciiMapRenderer.CellHeight * 2.2f);
            if (cell.entityKind == "animal")
                return AnimalSpriteSize(cell);
            if (cell.objectWidth > 1 || cell.objectHeight > 1)
            {
                var fill = cell.variant == "bed" ? 1f : 0.96f;
                return new Vector2(AsciiMapRenderer.CellWidth * cell.objectWidth * fill,
                    AsciiMapRenderer.CellHeight * cell.objectHeight * fill);
            }
            if (cell.variant == "jetty")
                return new Vector2(AsciiMapRenderer.CellWidth * 2.7f,
                    AsciiMapRenderer.CellHeight * 1.65f);
            if (cell.variant == "construction_site" || cell.variant == "trestles")
                return new Vector2(AsciiMapRenderer.CellWidth * 2.1f,
                    AsciiMapRenderer.CellHeight * 1.5f);
            if (cell.variant == "grain_plot" || cell.variant == "kitchen_garden")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.8f,
                    AsciiMapRenderer.CellHeight * 1.45f);
            if (cell.variant == "storage_shed")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.55f,
                    AsciiMapRenderer.CellHeight * 1.45f);
            if (cell.variant == "table")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.35f,
                    AsciiMapRenderer.CellHeight * 0.9f);
            if (cell.variant == "chair")
                return new Vector2(AsciiMapRenderer.CellWidth * 0.8f,
                    AsciiMapRenderer.CellHeight * 0.8f);
            if (cell.variant == "bed" || cell.variant == "stall" ||
                cell.variant == "cart" || cell.variant == "jetty")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.35f,
                    AsciiMapRenderer.CellHeight * 1.05f);
            if (cell.variant == "forge" || cell.variant == "altar")
                return new Vector2(AsciiMapRenderer.CellWidth * 1.15f,
                    AsciiMapRenderer.CellHeight * 1.15f);
            if (!string.IsNullOrEmpty(cell.entityId))
                return new Vector2(AsciiMapRenderer.CellWidth * BodyWidth(cell),
                    AsciiMapRenderer.CellHeight * 1.42f);
            return new Vector2(AsciiMapRenderer.CellWidth, AsciiMapRenderer.CellHeight);
        }

        private static float BodyWidth(CellView cell) => cell.entityBodyBuild switch
        {
            "slim" => 0.84f,
            "broad" => 1.04f,
            "heavy" => 1.14f,
            _ => 0.96f
        };
    }
}
