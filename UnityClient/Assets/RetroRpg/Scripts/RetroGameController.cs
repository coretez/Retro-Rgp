using System;
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
        private bool inventoryOpen;
        private bool partyOpen;
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
            if (Input.GetKeyDown(KeyCode.Q)) StartCoroutine(DungeonAction("search"));
            if (Input.GetKeyDown(KeyCode.X) && selected.HasValue)
                StartCoroutine(DungeonAction("examine", selected.Value));
            if (Input.GetKeyDown(KeyCode.H)) UseFirstPotion();
            if (Input.GetKeyDown(KeyCode.P)) StartCoroutine(DungeonAction("class_power"));
            if (Input.GetKeyDown(KeyCode.R)) AttackSelected("ranged_attack");
            if (Input.GetKeyDown(KeyCode.I)) inventoryOpen = !inventoryOpen;
            if (Input.GetKeyDown(KeyCode.C)) partyOpen = !partyOpen;
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

        private void SendIntent(MoveIntent intent)
        {
            if (!busy) StartCoroutine(SendIntentRoutine(intent));
        }

        private IEnumerator SendIntentRoutine(MoveIntent intent)
        {
            busy = true;
            yield return api.Act(intent, ApplyView, ShowError);
            busy = false;
        }

        private string SelectedTargetId()
        {
            var cell = SelectedCell();
            return cell?.entityKind == "monster" ? cell.entityId : null;
        }

        private void AttackSelected(string kind, string itemId = null)
        {
            var targetId = SelectedTargetId();
            if (string.IsNullOrEmpty(targetId))
            {
                error = "Select a visible enemy first.";
                return;
            }
            SendIntent(new MoveIntent { kind = kind, targetId = targetId, itemId = itemId });
        }

        private void UseFirstPotion()
        {
            var items = view.inventory ?? Array.Empty<InventoryItemView>();
            var potion = Array.Find(items, item => item.kind == "healing_potion" && item.quantity > 0);
            if (potion == null)
            {
                error = "No healing potion is available.";
                return;
            }
            SendIntent(new MoveIntent { kind = "use_item", itemId = potion.id });
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
            DrawInventoryOverlay();
            DrawPartyOverlay();
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
            var width = Mathf.Min(1060f, Screen.width - 24f);
            var panel = new Rect((Screen.width - width) * 0.5f, Screen.height - 54f, width, 42f);
            DrawPanel(panel);
            var status = error ?? (busy ? "Resolving turn…" : view.activity);
            if (!string.IsNullOrEmpty(status))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 310f, 22f), status, bodyStyle);
            if (view.location == "dungeon") DrawDungeonCommands(panel);
            else GUI.Label(new Rect(panel.x + 330f, panel.y + 11f, panel.width - 344f, 22f),
                "WASD Move  ·  Click Select  ·  Wheel Zoom", subtleStyle);
        }

        private void DrawDungeonCommands(Rect panel)
        {
            var x = panel.x + 322f;
            CommandButton(ref x, panel, "Search [Q]", "search", () => SendIntent(new MoveIntent { kind = "search" }));
            CommandButton(ref x, panel, "Wait", "wait", () => SendIntent(new MoveIntent { kind = "wait" }));
            CommandButton(ref x, panel, "Potion [H]", "use_item", UseFirstPotion);
            CommandButton(ref x, panel, "Power [P]", "class_power", UseClassPower);
            CommandButton(ref x, panel, "Rest", "short_rest", () => SendIntent(new MoveIntent { kind = "short_rest" }));
            if (GUI.Button(new Rect(x, panel.y + 7f, 76f, 28f), "Items [I]")) inventoryOpen = !inventoryOpen;
            x += 80f;
            if (GUI.Button(new Rect(x, panel.y + 7f, 76f, 28f), "Party [C]")) partyOpen = !partyOpen;
        }

        private void CommandButton(ref float x, Rect panel, string label, string intent, Action action)
        {
            if (!Can(intent)) return;
            var width = Mathf.Max(58f, GUI.skin.button.CalcSize(new GUIContent(label)).x + 12f);
            if (GUI.Button(new Rect(x, panel.y + 7f, width, 28f), label)) action();
            x += width + 4f;
        }

        private bool Can(string intent) =>
            Array.IndexOf(view.legalIntents ?? Array.Empty<string>(), intent) >= 0;

        private void UseClassPower()
        {
            SendIntent(new MoveIntent { kind = "class_power", targetId = SelectedTargetId() });
        }

        private void DrawInventoryOverlay()
        {
            if (!inventoryOpen || view.location != "dungeon") return;
            var items = view.inventory ?? Array.Empty<InventoryItemView>();
            var height = Mathf.Min(430f, 58f + items.Length * 42f);
            var panel = new Rect(Screen.width - 382f, 68f, 370f, height);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 260f, 24f), "INVENTORY & EQUIPMENT", headingStyle);
            if (GUI.Button(new Rect(panel.x + 328f, panel.y + 8f, 28f, 24f), "×")) inventoryOpen = false;
            for (var index = 0; index < items.Length && index < 9; index++)
                DrawInventoryItem(panel, items[index], index);
        }

        private void DrawInventoryItem(Rect panel, InventoryItemView item, int index)
        {
            var y = panel.y + 40f + index * 42f;
            var count = item.charges > 0 ? $" · {item.charges} charges" : item.quantity > 1 ? $" · ×{item.quantity}" : "";
            var state = item.equipped ? " · EQUIPPED" : count;
            GUI.Label(new Rect(panel.x + 14f, y, 190f, 20f), item.name + state, bodyStyle);
            var x = panel.x + 208f;
            if (item.itemType == "equipment" && !item.equipped)
                ItemButton(ref x, y, "Equip", () => SendIntent(new MoveIntent { kind = "equip", itemId = item.id }));
            if (item.equipped && item.slot == "offhand")
                ItemButton(ref x, y, "Remove", () => SendIntent(new MoveIntent { kind = "unequip", slot = "offhand" }));
            if (item.kind == "healing_potion")
                ItemButton(ref x, y, "Use", () => SendIntent(new MoveIntent { kind = "use_item", itemId = item.id }));
            if (item.invokable)
                ItemButton(ref x, y, "Invoke", () => SendIntent(new MoveIntent { kind = "invoke_item", itemId = item.id, targetId = SelectedTargetId() }));
            if (item.throwable)
                ItemButton(ref x, y, "Throw", () => AttackSelected("throw_item", item.id));
        }

        private static void ItemButton(ref float x, float y, string label, Action action)
        {
            var width = label.Length * 7f + 16f;
            if (GUI.Button(new Rect(x, y - 3f, width, 26f), label)) action();
            x += width + 4f;
        }

        private void DrawPartyOverlay()
        {
            if (!partyOpen || view.location != "dungeon" || view.partyOrder == null) return;
            var panel = new Rect(12f, 68f, 422f, 176f);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 250f, 24f), "PARTY ORDERS", headingStyle);
            if (GUI.Button(new Rect(panel.x + 380f, panel.y + 8f, 28f, 24f), "×")) partyOpen = false;
            GUI.Label(new Rect(panel.x + 14f, panel.y + 38f, 310f, 20f),
                $"{Readable(view.partyOrder.objective)} · {Readable(view.partyOrder.formation)}", bodyStyle);
            var objectives = string.IsNullOrEmpty(SelectedTargetId())
                ? new[] { "explore", "hold", "advance", "retreat" }
                : new[] { "explore", "hold", "advance", "retreat", "focus" };
            DrawOrderRow(panel, panel.y + 68f, "Objective", objectives, true);
            DrawOrderRow(panel, panel.y + 112f, "Formation", new[] { "column", "line", "wedge", "scatter" }, false);
        }

        private void DrawOrderRow(Rect panel, float y, string label, string[] values, bool objective)
        {
            GUI.Label(new Rect(panel.x + 14f, y, 80f, 18f), label.ToUpperInvariant(), subtleStyle);
            var x = panel.x + 14f;
            foreach (var value in values)
            {
                if (GUI.Button(new Rect(x, y + 19f, 74f, 25f), Readable(value))) SendPartyOrder(value, objective);
                x += 78f;
            }
        }

        private void SendPartyOrder(string value, bool objective)
        {
            var order = view.partyOrder;
            SendIntent(new MoveIntent {
                kind = "command", groupId = order.id, issuerId = order.leaderId,
                expectedCommandRevision = order.commandRevision,
                objective = objective ? value : order.objective,
                formation = objective ? order.formation : value,
                targetId = objective ? value == "focus" ? SelectedTargetId() : null : order.targetId,
                resourcePolicy = order.resourcePolicy,
                retreatThreshold = order.retreatThreshold, movementMode = order.movementMode
            });
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
