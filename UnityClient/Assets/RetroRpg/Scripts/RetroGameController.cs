using System.Collections;
using UnityEngine;

namespace RetroRpg
{
    public sealed class RetroGameController : MonoBehaviour
    {
        [SerializeField] private string engineUrl = "http://127.0.0.1:4321";
        private RetroApiClient api;
        private AsciiMapRenderer mapRenderer;
        private UnityView view;
        private string error;
        private bool busy;
        private Vector2Int? selected;
        private GUIStyle titleStyle;
        private GUIStyle headingStyle;
        private GUIStyle bodyStyle;
        private GUIStyle subtleStyle;

        private void Awake()
        {
            api = new RetroApiClient(engineUrl);
            mapRenderer = new GameObject("ASCII World").AddComponent<AsciiMapRenderer>();
            mapRenderer.Initialize();
            ConfigureCamera();
        }

        private IEnumerator Start()
        {
            busy = true;
            yield return api.Load(ApplyView, ShowError);
            busy = false;
        }

        private void Update()
        {
            if (view == null || busy) return;
            HandleZoom();
            if (Input.GetMouseButtonDown(0)) HandleClick();
            HandleKeyboard();
            HandleDungeonCommands();
        }

        private void HandleClick()
        {
            var world = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            if (!mapRenderer.TryWorldCell(world, out var cell)) return;
            selected = cell;
            mapRenderer.Select(cell, view);
            if (Mathf.Max(Mathf.Abs(cell.x - view.hero.x), Mathf.Abs(cell.y - view.hero.y)) == 1)
            {
                var selectedCell = SelectedCell();
                if (view.location == "dungeon" && selectedCell?.objectKind == "door")
                    StartCoroutine(DungeonAction("open", cell));
                else StartCoroutine(Move(cell));
            }
        }

        private void HandleKeyboard()
        {
            var delta = Vector2Int.zero;
            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) delta = Vector2Int.left;
            if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) delta = Vector2Int.right;
            if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) delta = Vector2Int.up;
            if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) delta = Vector2Int.down;
            if (delta != Vector2Int.zero)
                StartCoroutine(Move(new Vector2Int(view.hero.x + delta.x, view.hero.y - delta.y)));
        }

        private IEnumerator Move(Vector2Int target)
        {
            busy = true;
            yield return api.Move(view, target.x, target.y, ApplyView, ShowError);
            busy = false;
        }

        private void HandleDungeonCommands()
        {
            if (view.location != "dungeon") return;
            if (Input.GetKeyDown(KeyCode.Space)) StartCoroutine(DungeonAction("wait"));
            if (Input.GetKeyDown(KeyCode.X) && selected.HasValue)
                StartCoroutine(DungeonAction("examine", selected.Value));
            if (Input.GetKeyDown(KeyCode.Period)) StartCoroutine(DungeonAction("stairs"));
            if (Input.GetKeyDown(KeyCode.Comma)) StartCoroutine(DungeonAction("stairs_up"));
        }

        private IEnumerator DungeonAction(string kind, Vector2Int? target = null)
        {
            busy = true;
            var intent = new MoveIntent { kind = kind };
            if (target.HasValue)
            {
                intent.x = target.Value.x;
                intent.y = target.Value.y;
                if (kind == "open")
                    intent.direction = Direction(target.Value.x - view.hero.x, target.Value.y - view.hero.y);
            }
            yield return api.Act(intent, ApplyView, ShowError);
            busy = false;
        }

        private static string Direction(int x, int y)
        {
            if (x == 0 && y == -1) return "north";
            if (x == 1 && y == -1) return "northeast";
            if (x == 1 && y == 0) return "east";
            if (x == 1 && y == 1) return "southeast";
            if (x == 0 && y == 1) return "south";
            if (x == -1 && y == 1) return "southwest";
            if (x == -1 && y == 0) return "west";
            return "northwest";
        }

        private void ApplyView(UnityView next)
        {
            view = next;
            error = null;
            mapRenderer.Render(view);
            FitCamera();
        }

        private void ShowError(string message)
        {
            error = message;
            Debug.LogError(message);
        }

        private static void ConfigureCamera()
        {
            var camera = Camera.main;
            if (camera == null)
            {
                camera = new GameObject("Main Camera").AddComponent<Camera>();
                camera.tag = "MainCamera";
            }
            camera.orthographic = true;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.035f, 0.045f, 0.035f);
            camera.transform.position = new Vector3(0f, 0f, -10f);
        }

        private void FitCamera()
        {
            Camera.main.orthographicSize = Mathf.Max(12f, view.map.height * 0.47f);
        }

        private static void HandleZoom()
        {
            var scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) < 0.01f) return;
            Camera.main.orthographicSize = Mathf.Clamp(
                Camera.main.orthographicSize - scroll * 2f,
                6f,
                40f);
        }

        private void OnGUI()
        {
            EnsureStyles();
            if (view == null)
            {
                DrawPanel(new Rect(18f, 18f, 320f, 64f));
                GUI.Label(new Rect(32f, 34f, 290f, 28f), "Connecting to the world…", bodyStyle);
                return;
            }
            DrawTopBar();
            DrawInspector();
            DrawCommandBar();
        }

        private void DrawTopBar()
        {
            var panel = new Rect(12f, 12f, Screen.width - 24f, 44f);
            DrawPanel(panel);
            GUI.Label(new Rect(28f, 21f, 190f, 26f), view.title, titleStyle);
            GUI.Label(new Rect(210f, 24f, 220f, 20f), $"TURN {view.tick}  ·  {view.status.ToUpperInvariant()}", subtleStyle);
            var right = Screen.width - 390f;
            GUI.Label(new Rect(right, 23f, 150f, 20f), view.hero.name, bodyStyle);
            DrawHealthBar(new Rect(right + 150f, 27f, 90f, 10f));
            GUI.Label(new Rect(right + 250f, 23f, 110f, 20f), $"{view.hero.hp} HP  ·  {view.hero.goldCp} CP", bodyStyle);
        }

        private void DrawHealthBar(Rect bounds)
        {
            GUI.color = new Color(0.12f, 0.13f, 0.11f, 1f);
            GUI.DrawTexture(bounds, Texture2D.whiteTexture);
            var ratio = Mathf.Clamp01((float)view.hero.hp / Mathf.Max(1, view.hero.maxHp));
            var color = Color.Lerp(new Color(0.75f, 0.16f, 0.12f), new Color(0.30f, 0.72f, 0.32f), ratio);
            GUI.color = color;
            GUI.DrawTexture(new Rect(bounds.x, bounds.y, bounds.width * ratio, bounds.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        private void DrawInspector()
        {
            var cell = SelectedCell();
            if (cell == null) return;
            var panel = new Rect(12f, Screen.height - 208f, 300f, 144f);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 238f, 18f), "SELECTED", headingStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 32f, 238f, 24f), SelectionName(cell), titleStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 60f, 238f, 18f), $"{Readable(cell.objectKind)}  ·  {Readable(cell.tile)}", bodyStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 82f, 238f, 18f), $"POSITION  {cell.x}, {cell.y}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityAction))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 104f, 272f, 18f), cell.entityAction, bodyStyle);
            if (!string.IsNullOrEmpty(cell.entityObjective))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 124f, 272f, 16f), Readable(cell.entityObjective), subtleStyle);
        }

        private void DrawCommandBar()
        {
            var width = Mathf.Min(680f, Screen.width - 24f);
            var panel = new Rect((Screen.width - width) * 0.5f, Screen.height - 52f, width, 40f);
            DrawPanel(panel);
            var status = error ?? (busy ? "Resolving turn…" : view.activity);
            if (!string.IsNullOrEmpty(status))
                GUI.Label(new Rect(panel.x + 18f, panel.y + 9f, panel.width * 0.48f, 24f), status, bodyStyle);
            var controls = view.location == "dungeon"
                ? "WASD Move  ·  X Examine  ·  Space Wait  ·  , / . Stairs"
                : "WASD Move  ·  Click Select  ·  Wheel Zoom";
            GUI.Label(new Rect(panel.x + panel.width * 0.5f, panel.y + 10f, panel.width * 0.47f, 22f), controls, subtleStyle);
        }

        private CellView SelectedCell()
        {
            if (!selected.HasValue) return null;
            foreach (var cell in view.map.cells)
                if (cell.x == selected.Value.x && cell.y == selected.Value.y) return cell;
            return null;
        }

        private static string SelectionName(CellView cell)
        {
            if (!string.IsNullOrEmpty(cell.entityName)) return cell.entityName;
            return Readable(cell.objectKind);
        }

        private static string Readable(string value) =>
            string.IsNullOrEmpty(value) ? "Unknown" : value.Replace('_', ' ');

        private static void DrawPanel(Rect bounds)
        {
            GUI.color = new Color(0.035f, 0.045f, 0.035f, 0.94f);
            GUI.Box(bounds, GUIContent.none);
            GUI.color = Color.white;
        }

        private void EnsureStyles()
        {
            if (titleStyle != null) return;
            titleStyle = NewStyle(18, new Color(0.90f, 0.86f, 0.69f));
            titleStyle.fontStyle = FontStyle.Bold;
            headingStyle = NewStyle(11, new Color(0.56f, 0.76f, 0.42f));
            headingStyle.fontStyle = FontStyle.Bold;
            bodyStyle = NewStyle(13, new Color(0.86f, 0.85f, 0.76f));
            subtleStyle = NewStyle(11, new Color(0.55f, 0.58f, 0.51f));
        }

        private static GUIStyle NewStyle(int size, Color color)
        {
            var style = new GUIStyle(GUI.skin.label) { fontSize = size };
            style.normal.textColor = color;
            style.clipping = TextClipping.Clip;
            return style;
        }
    }
}
