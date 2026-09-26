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
        }

        private void HandleClick()
        {
            var world = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            if (!mapRenderer.TryWorldCell(world, out var cell)) return;
            selected = cell;
            mapRenderer.Select(cell, view);
            if (Mathf.Max(Mathf.Abs(cell.x - view.hero.x), Mathf.Abs(cell.y - view.hero.y)) == 1)
                StartCoroutine(Move(cell));
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
            yield return api.Move(target.x, target.y, ApplyView, ShowError);
            busy = false;
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
            DrawStatusCard();
            DrawInspector();
            DrawCommandBar();
        }

        private void DrawStatusCard()
        {
            var panel = new Rect(18f, 18f, 270f, 190f);
            DrawPanel(panel);
            GUI.Label(new Rect(34f, 30f, 240f, 28f), view.title, titleStyle);
            GUI.Label(new Rect(34f, 58f, 240f, 20f), $"TURN {view.tick}  ·  {view.status.ToUpperInvariant()}", subtleStyle);
            GUI.Label(new Rect(34f, 88f, 240f, 18f), "PARTY LEADER", headingStyle);
            GUI.Label(new Rect(34f, 110f, 240f, 22f), view.hero.name, bodyStyle);
            DrawHealthBar(new Rect(34f, 138f, 220f, 12f));
            GUI.Label(new Rect(34f, 156f, 220f, 22f), $"{view.hero.hp}/{view.hero.maxHp} HP     {view.hero.goldCp} CP", bodyStyle);
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
            var panel = new Rect(Screen.width - 288f, 18f, 270f, 148f);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 16f, 30f, 238f, 20f), "SELECTED", headingStyle);
            GUI.Label(new Rect(panel.x + 16f, 56f, 238f, 26f), SelectionName(cell), titleStyle);
            GUI.Label(new Rect(panel.x + 16f, 86f, 238f, 20f), $"{Readable(cell.objectKind)}  ·  {Readable(cell.tile)}", bodyStyle);
            GUI.Label(new Rect(panel.x + 16f, 112f, 238f, 20f), $"POSITION  {cell.x}, {cell.y}", subtleStyle);
        }

        private void DrawCommandBar()
        {
            var width = Mathf.Min(720f, Screen.width - 36f);
            var panel = new Rect((Screen.width - width) * 0.5f, Screen.height - 70f, width, 52f);
            DrawPanel(panel);
            var status = error ?? (busy ? "Resolving turn…" : "WASD / ARROWS  Move     CLICK  Select or move adjacent     WHEEL  Zoom");
            GUI.Label(new Rect(panel.x + 18f, panel.y + 10f, panel.width - 36f, 30f), status, bodyStyle);
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
