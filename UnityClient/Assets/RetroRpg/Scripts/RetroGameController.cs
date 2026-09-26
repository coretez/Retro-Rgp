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
            var panel = new Rect(14f, 14f, Mathf.Min(720f, Screen.width - 28f), 92f);
            GUI.color = new Color(0.05f, 0.06f, 0.045f, 0.92f);
            GUI.Box(panel, GUIContent.none);
            GUI.color = Color.white;
            if (view == null)
            {
                GUI.Label(new Rect(28f, 28f, 650f, 30f), "Connecting to the Retro RPG engine…");
                return;
            }
            GUI.Label(new Rect(28f, 24f, 650f, 24f), $"{view.title}  ·  turn {view.tick}  ·  protocol {view.protocolVersion}");
            GUI.Label(new Rect(28f, 48f, 650f, 24f), $"{view.hero.name}  HP {view.hero.hp}/{view.hero.maxHp}  ·  {view.hero.goldCp} cp");
            GUI.Label(new Rect(28f, 70f, 650f, 24f), error ?? "Click an adjacent cell or use WASD/arrows · wheel zooms · click selects");
            if (selected.HasValue)
                GUI.Label(new Rect(Screen.width - 260f, 18f, 240f, 30f), $"Selected {selected.Value.x}, {selected.Value.y}");
        }
    }
}
