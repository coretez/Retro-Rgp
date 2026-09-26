using System.Collections.Generic;
using UnityEngine;

namespace RetroRpg
{
    public sealed class AsciiMapRenderer : MonoBehaviour
    {
        private const float CellWidth = 0.9f;
        private const float CellHeight = 0.9f;
        private const int FontSize = 64;
        private Mesh backgroundMesh;
        private Mesh glyphMesh;
        private Font glyphFont;
        private MapView map;
        private Vector2Int? selected;

        public void Initialize()
        {
            backgroundMesh = new Mesh { name = "ASCII Cell Backgrounds" };
            var background = new GameObject("Shaded Cell Grid");
            background.transform.SetParent(transform, false);
            background.AddComponent<MeshFilter>().sharedMesh = backgroundMesh;
            var renderer = background.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = Resources.Load<Material>("AsciiGround")
                ?? new Material(Shader.Find("Unlit/Color"));

            glyphMesh = new Mesh { name = "Colored ASCII Glyphs" };
            var glyphs = new GameObject("Colored ASCII Glyph Mesh");
            glyphs.transform.SetParent(transform, false);
            glyphs.transform.localPosition = new Vector3(0f, 0f, -0.1f);
            glyphs.AddComponent<MeshFilter>().sharedMesh = glyphMesh;
            glyphFont = CreateFont();
            glyphs.AddComponent<MeshRenderer>().sharedMaterial = glyphFont.material;
        }

        public void Render(UnityView view)
        {
            map = view.map;
            BuildBackground(view);
            BuildGlyphs(view);
        }

        public void Select(Vector2Int position, UnityView view)
        {
            selected = position;
            Render(view);
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
            var row = index / view.map.width;
            var column = index % view.map.width;
            var left = (column - view.map.width * 0.5f) * CellWidth;
            var top = (view.map.height * 0.5f - row) * CellHeight;
            var vertex = index * 4;
            vertices[vertex] = new Vector3(left, top - CellHeight);
            vertices[vertex + 1] = new Vector3(left, top);
            vertices[vertex + 2] = new Vector3(left + CellWidth, top);
            vertices[vertex + 3] = new Vector3(left + CellWidth, top - CellHeight);
            var color = CellBackground(view.map.cells[index], view.hero);
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
                if (character == ' ') continue;
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

        private static void WriteGlyph(
            UnityView view,
            int index,
            CharacterInfo info,
            List<Vector3> vertices,
            List<Color> colors,
            List<Vector2> uvs,
            List<int> triangles)
        {
            var row = index / view.map.width;
            var column = index % view.map.width;
            var centerX = (column - view.map.width * 0.5f + 0.5f) * CellWidth;
            var centerY = (view.map.height * 0.5f - row - 0.5f) * CellHeight;
            var scale = CellHeight * 0.78f / FontSize;
            var width = (info.maxX - info.minX) * scale;
            var height = (info.maxY - info.minY) * scale;
            var left = centerX - width * 0.5f;
            var bottom = centerY - height * 0.5f;
            var vertex = vertices.Count;
            vertices.Add(new Vector3(left, bottom));
            vertices.Add(new Vector3(left, bottom + height));
            vertices.Add(new Vector3(left + width, bottom + height));
            vertices.Add(new Vector3(left + width, bottom));
            uvs.Add(info.uvBottomLeft);
            uvs.Add(info.uvTopLeft);
            uvs.Add(info.uvTopRight);
            uvs.Add(info.uvBottomRight);
            var color = GlyphColor(view.map.cells[index]);
            for (var offset = 0; offset < 4; offset++) colors.Add(color);
            triangles.Add(vertex);
            triangles.Add(vertex + 1);
            triangles.Add(vertex + 2);
            triangles.Add(vertex);
            triangles.Add(vertex + 2);
            triangles.Add(vertex + 3);
        }

        private static char GlyphCharacter(CellView cell) =>
            string.IsNullOrEmpty(cell.glyph) ? ' ' : cell.glyph[0];

        private static Font CreateFont()
        {
            var font = Font.CreateDynamicFontFromOSFont(new[] { "Menlo", "Consolas", "Courier New" }, 64);
            return font != null ? font : Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }

        private static Color CellBackground(CellView cell, HeroView hero)
        {
            var baseColor = cell.tile switch
            {
                "road_stone" => new Color(0.48f, 0.46f, 0.40f),
                "road_dirt" => new Color(0.48f, 0.36f, 0.22f),
                "outdoor_tree" => new Color(0.12f, 0.25f, 0.12f),
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
            return baseColor * Mathf.Lerp(1.18f, 0.72f, Mathf.Clamp01(distance / 25f));
        }

        private static Color GlyphColor(CellView cell) => cell.entityKind switch
        {
            "party" => new Color(0.80f, 0.94f, 1f),
            "guard" => new Color(0.72f, 0.86f, 0.50f),
            "shopkeeper" => new Color(1f, 0.77f, 0.30f),
            "civilian" => new Color(0.89f, 0.63f, 0.49f),
            "monster" => new Color(0.92f, 0.34f, 0.27f),
            _ when cell.objectKind == "sign" => new Color(1f, 0.80f, 0.26f),
            _ when cell.objectKind == "tree" => new Color(0.55f, 0.85f, 0.42f),
            _ => new Color(0.84f, 0.82f, 0.69f),
        };
    }
}
