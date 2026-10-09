using System;
using System.Collections;
using UnityEngine;

namespace RetroRpg
{
    public sealed class RetroGameController : MonoBehaviour
    {
        private const float NormalSimulationInterval = 0.75f;
        private const float FastSimulationInterval = 0.18f;
        private const float ObserveSimulationInterval = 0.045f;
        private const float KeyboardPanSpeed = 28f;
        private const float KeyboardPanTapDistance = 2.4f;
        private const float KeyboardPanSmoothTime = 0.16f;
        private const float KeyboardPanMaxSpeed = 72f;
        private const float MaximumVisibleVillageWidth = 140f;
        private const float MaximumVisibleVillageHeight = 84f;
        [SerializeField] private string engineUrl = "http://127.0.0.1:4321";
        [SerializeField, Range(0.2f, 1f)] private float cameraDragSensitivity = 1f;
        private RetroApiClient api;
        private AsciiMapRenderer mapRenderer;
        private UnityView view;
        private string error;
        private bool busy;
        private bool inventoryOpen;
        private bool partyOpen;
        private bool characterSheetOpen;
        private bool shopOpen;
        private bool strategyOpen;
        private bool meaningOpen;
        private bool regionMapOpen;
        private bool groupSummaryExpanded = true;
        private string inventoryActorId;
        private string partyActorId;
        private string pendingCropDestinationPlotId;
        private string pendingCropDestinationKind;
        private int partyTab;
        private Vector2 inventoryScroll;
        private Vector2 partyRosterScroll;
        private Vector2 partyContentScroll;
        private Vector2 characterScroll;
        private Vector2 groupSummaryScroll;
        private Vector2 strategyScroll;
        private Vector2 meaningScroll;
        private float damageFlashUntil;
        private float nextSimulationTick;
        private string simulationMode = "paused";
        private bool simulationModeInitialized;
        private MoveIntent queuedIntent;
        private bool recenterPending;
        private bool cameraInitialized;
        private Vector3 keyboardPanTarget;
        private Vector3 keyboardPanVelocity;
        private bool keyboardPanTargetSet;
        private string cameraLocation;
        private string cameraRunId;
        private int cameraMapWidth;
        private int cameraMapHeight;
        private int cameraMapOriginX;
        private int cameraMapOriginY;
        private bool viewportShiftPending;
        private Vector2Int? queuedViewportCenter;
        private bool fitAfterViewportShift;
        private Vector2Int? selected;
        private GUIStyle titleStyle;
        private GUIStyle headingStyle;
        private GUIStyle bodyStyle;
        private GUIStyle detailStyle;
        private GUIStyle subtleStyle;
        private GUIStyle dangerStyle;
        private GUIStyle healingStyle;
        private GUIStyle treasureStyle;
        private GUIStyle stockLabelStyle;
        private GUIStyle structureLabelStyle;

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
            if (view == null) return;
            if (strategyOpen)
            {
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.V))
                    strategyOpen = false;
                return;
            }
            if (meaningOpen)
            {
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.M))
                    meaningOpen = false;
                return;
            }
            if (regionMapOpen)
            {
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.R))
                    regionMapOpen = false;
                return;
            }
            if (Input.GetKeyDown(KeyCode.F5)) SetSimulationMode("paused");
            HandleVillageOverlayShortcuts();
            if (strategyOpen || meaningOpen) return;
            HandleCameraControls();
            HandleSimulationShortcuts();
            if (Input.GetMouseButtonDown(0)) HandleClick();
            if (busy) return;
            if (partyOpen || characterSheetOpen)
            {
                HandleWorkspaceInput();
                return;
            }
            if (simulationMode != "paused")
            {
                AdvanceContinuousSimulation();
                return;
            }
            HandleKeyboard();
            HandleDungeonCommands();
            HandleVillageCommands();
        }

        private void HandleSimulationShortcuts()
        {
            if (Input.GetKeyDown(KeyCode.F6)) StepSimulation();
            else if (Input.GetKeyDown(KeyCode.F7)) SetSimulationMode("normal");
            else if (Input.GetKeyDown(KeyCode.F8)) SetSimulationMode("fast");
            else if (Input.GetKeyDown(KeyCode.F9)) SaveSimulation();
            else if (Input.GetKeyDown(KeyCode.F10)) SetSimulationMode("observe");
        }

        private void SaveSimulation()
        {
            if (busy) return;
            simulationMode = "paused";
            StartCoroutine(SaveSimulationRoutine());
        }

        private IEnumerator SaveSimulationRoutine()
        {
            busy = true;
            yield return api.Save(() => error = "Simulation saved.", ShowError);
            busy = false;
        }

        private void AdvanceContinuousSimulation()
        {
            if (view.simulation == null || !view.simulation.canRun)
            {
                SetSimulationMode("paused");
                error = SimulationPauseMessage();
                return;
            }
            if (Time.unscaledTime < nextSimulationTick) return;
            nextSimulationTick = Time.unscaledTime + SimulationInterval();
            SendIntent(new MoveIntent { kind = "wait" });
        }

        private float SimulationInterval() => simulationMode switch
        {
            "observe" => ObserveSimulationInterval,
            "fast" => FastSimulationInterval,
            _ => NormalSimulationInterval,
        };

        private void StepSimulation()
        {
            SetSimulationMode("paused");
            if (view.simulation?.canRun == true) SendIntent(new MoveIntent { kind = "wait" });
            else error = SimulationPauseMessage();
        }

        private void SetSimulationMode(string mode)
        {
            if (mode != "paused" && view.simulation?.canRun != true)
            {
                simulationMode = "paused";
                error = SimulationPauseMessage();
                return;
            }
            simulationMode = mode;
            nextSimulationTick = Time.unscaledTime;
        }

        private string SimulationPauseMessage() =>
            view.simulation?.tacticalPauseRequired == true
                ? $"Tactical pause: {Readable(view.simulation.reason)}"
                : $"Simulation paused: {Readable(view.simulation?.reason)}";

        private void HandleWorkspaceInput()
        {
            if (characterSheetOpen)
            {
                if (Input.GetKeyDown(KeyCode.Escape)) characterSheetOpen = false;
                else if (Input.GetKeyDown(KeyCode.C)) CloseWorkspace();
                return;
            }
            if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.C)) CloseWorkspace();
            else if (Input.GetKeyDown(KeyCode.Alpha1)) partyTab = 0;
            else if (Input.GetKeyDown(KeyCode.Alpha2)) partyTab = 1;
            else if (Input.GetKeyDown(KeyCode.Alpha3)) partyTab = 2;
            else if (Input.GetKeyDown(KeyCode.Alpha4)) partyTab = 3;
            else if (Input.GetKeyDown(KeyCode.Return) && !string.IsNullOrEmpty(partyActorId))
                characterSheetOpen = true;
        }

        private void HandleClick()
        {
            if (strategyOpen) return;
            var mouse = GuiMousePosition();
            if (TopUiContains(mouse) || GroupSummaryBounds().Contains(mouse)) return;
            var world = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            if (!mapRenderer.TryWorldCell(world, out var cell)) return;
            selected = cell;
            mapRenderer.Select(cell, view);
            var selectedCell = SelectedCell();
            if (CropDestinationCompatible(selectedCell))
            {
                SetCropDestination(selectedCell);
                return;
            }
            if (busy || ClickSelectsOnly(selectedCell)) return;
            if (view.location == "village" && !view.adventurersPresent) return;
            if (Mathf.Max(Mathf.Abs(cell.x - view.hero.x), Mathf.Abs(cell.y - view.hero.y)) == 1)
            {
                if (view.location == "dungeon") TryDungeonStep(cell, selectedCell);
                else StartCoroutine(Move(cell));
            }
        }

        private static bool TopUiContains(Vector2 mouse)
        {
            if (mouse.y < 60f) return true;
            return CameraHintBounds().Contains(mouse) ||
                SimulationBounds().Contains(mouse);
        }

        private static bool ClickSelectsOnly(CellView cell) => cell != null &&
            Array.IndexOf(
                new[] { "sign", "wall", "resident", "fixture", "door", "material", "tree" },
                cell.objectKind) >= 0;

        private static Vector2 GuiMousePosition() =>
            new(Input.mousePosition.x, Screen.height - Input.mousePosition.y);

        private void HandleKeyboard()
        {
            if (view.location == "village" && !view.adventurersPresent) return;
            if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift)) return;
            if (view.location == "dungeon" && !Can("move")) return;
            var delta = Vector2Int.zero;
            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) delta = Vector2Int.left;
            if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) delta = Vector2Int.right;
            if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) delta = Vector2Int.up;
            if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) delta = Vector2Int.down;
            if (delta != Vector2Int.zero)
            {
                var target = new Vector2Int(view.hero.x + delta.x, view.hero.y - delta.y);
                if (view.location == "dungeon") TryDungeonStep(target, CellAt(target));
                else StartCoroutine(Move(target));
            }
        }

        private void TryDungeonStep(Vector2Int target, CellView cell)
        {
            if (IsClosedDoor(cell)) StartCoroutine(DungeonAction("open", target));
            else StartCoroutine(Move(target));
        }

        private static bool IsClosedDoor(CellView cell) =>
            cell?.objectKind == "door" && cell.tile != null && cell.tile.Contains("closed");

        private bool SelectedDoorIsAdjacent()
        {
            if (!selected.HasValue || !IsClosedDoor(SelectedCell())) return false;
            return Mathf.Max(
                Mathf.Abs(selected.Value.x - view.hero.x),
                Mathf.Abs(selected.Value.y - view.hero.y)) == 1;
        }

        private void OpenSelectedDoor()
        {
            if (SelectedDoorIsAdjacent()) StartCoroutine(DungeonAction("open", selected.Value));
            else error = "Select an adjacent closed door first.";
        }

        private IEnumerator Move(Vector2Int target)
        {
            busy = true;
            yield return api.Move(view, target.x, target.y, ApplyView, ShowError);
            busy = false;
            FlushQueuedUiAction();
        }

        private void HandleDungeonCommands()
        {
            if (view.location != "dungeon") return;
            if (Can("death_save") && Input.GetKeyDown(KeyCode.V))
                StartCoroutine(DungeonAction("death_save"));
            if (Can("wait") && Input.GetKeyDown(KeyCode.Space)) StartCoroutine(DungeonAction("wait"));
            if (Can("search") && Input.GetKeyDown(KeyCode.Q)) StartCoroutine(DungeonAction("search"));
            if (Can("examine") && Input.GetKeyDown(KeyCode.X) && selected.HasValue)
                StartCoroutine(DungeonAction("examine", selected.Value));
            if (Can("use_item") && Input.GetKeyDown(KeyCode.H)) UseFirstPotion();
            if (Can("class_power") && Input.GetKeyDown(KeyCode.P)) UseClassPower();
            if (Can("ranged_attack") && Input.GetKeyDown(KeyCode.R)) AttackSelected("ranged_attack");
            if (Input.GetKeyDown(KeyCode.I)) inventoryOpen = !inventoryOpen;
            if (Input.GetKeyDown(KeyCode.C)) ToggleGroupManagement();
            if (Can("stairs") && Input.GetKeyDown(KeyCode.Period)) StartCoroutine(DungeonAction("stairs"));
            if (Can("stairs_up") && Input.GetKeyDown(KeyCode.Comma)) StartCoroutine(DungeonAction("stairs_up"));
        }

        private void HandleVillageCommands()
        {
            if (view.location == "dungeon") return;
            if (Can("wait") && Input.GetKeyDown(KeyCode.Space))
                SendIntent(new MoveIntent { kind = "wait" });
            if (!view.adventurersPresent) return;
            if (Input.GetKeyDown(KeyCode.G)) TogglePartyMovement();
            if (Input.GetKeyDown(KeyCode.C)) ToggleGroupManagement();
            if (Input.GetKeyDown(KeyCode.P)) CycleSpendingPolicy();
            if (view.shop != null && Input.GetKeyDown(KeyCode.Y)) shopOpen = !shopOpen;
            if (Input.GetKeyDown(KeyCode.B)) InteractWithAction("breach");
            if (Input.GetKeyDown(KeyCode.T)) InteractWithAction("talk");
            if (Input.GetKeyDown(KeyCode.X)) InteractWithAction("examine");
            if (Input.GetKeyDown(KeyCode.E)) InteractWithAction("read");
            if (Input.GetKeyDown(KeyCode.U)) InteractWithAction("use");
        }

        private void HandleVillageOverlayShortcuts()
        {
            if (view.location == "dungeon") return;
            if (Input.GetKeyDown(KeyCode.V)) ToggleStrategyBoard();
            if (Input.GetKeyDown(KeyCode.M)) ToggleMeaningBoard();
            if (Input.GetKeyDown(KeyCode.R)) regionMapOpen = !regionMapOpen;
            if (!view.adventurersPresent && Input.GetKeyDown(KeyCode.F))
                FocusNextCropField();
            if (!view.adventurersPresent && Input.GetKeyDown(KeyCode.L))
                FocusNextAnimal();
            if (!view.adventurersPresent && Input.GetKeyDown(KeyCode.H))
                BeginSelectedCropStorageSelection();
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
            FlushQueuedUiAction();
        }

        private void SendIntent(MoveIntent intent)
        {
            if (intent.kind != "wait") simulationMode = "paused";
            if (busy)
            {
                queuedIntent = intent;
                return;
            }
            StartCoroutine(SendIntentRoutine(intent));
        }

        private IEnumerator SendIntentRoutine(MoveIntent intent)
        {
            busy = true;
            yield return api.Act(intent, ApplyView, ShowError);
            busy = false;
            FlushQueuedUiAction();
        }

        private void FlushQueuedUiAction()
        {
            if (recenterPending)
            {
                recenterPending = false;
                RecenterObservation();
                return;
            }
            if (queuedViewportCenter.HasValue)
            {
                var center = queuedViewportCenter.Value;
                queuedViewportCenter = null;
                RequestVillageViewport(center.x, center.y);
                return;
            }
            if (queuedIntent == null) return;
            var next = queuedIntent;
            queuedIntent = null;
            StartCoroutine(SendIntentRoutine(next));
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
            var resetCamera = !cameraInitialized || cameraRunId != next.runId
                || cameraLocation != next.location
                || cameraMapWidth != next.map.width || cameraMapHeight != next.map.height;
            var shiftedViewport = !resetCamera &&
                (cameraMapOriginX != next.map.origin.x || cameraMapOriginY != next.map.origin.y);
            if (view != null && next.hero.hp < view.hero.hp)
                damageFlashUntil = Time.time + 0.38f;
            var forcedPause = simulationMode != "paused" && next.simulation?.tacticalPauseRequired == true;
            view = next;
            if (!simulationModeInitialized)
            {
                simulationMode = next.location == "village" ? "normal" : "paused";
                nextSimulationTick = Time.unscaledTime + NormalSimulationInterval;
                simulationModeInitialized = true;
            }
            api.TrackViewport(view);
            if (forcedPause) simulationMode = "paused";
            if (view.shop == null) shopOpen = false;
            inventoryActorId ??= view.hero.id;
            error = forcedPause ? SimulationPauseMessage() : null;
            mapRenderer.Render(view, MovementAnimationDuration());
            if (resetCamera) FitCamera();
            else if (shiftedViewport && fitAfterViewportShift) FitCamera();
            else if (shiftedViewport) PreserveCameraAcrossViewport(next.map.origin);
            else ClampCamera();
            fitAfterViewportShift = false;
        }

        private float MovementAnimationDuration() => simulationMode switch
        {
            // Keep the previous authoritative snapshot in motion until the
            // next expected snapshot arrives. UpdateActorMotions retargets
            // from the current interpolated position, so network jitter does
            // not reintroduce the old move-stop cadence.
            "fast" => FastSimulationInterval * 1.1f,
            "observe" => ObserveSimulationInterval * 1.1f,
            "normal" => NormalSimulationInterval * 1.05f,
            _ => 0.20f,
        };

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
            Camera.main.orthographicSize = Mathf.Clamp(
                MaximumVisibleVillageHeight * 0.4f, 12f, 24f);
            Camera.main.transform.position = new Vector3(0f, 0f, -10f);
            keyboardPanTargetSet = false;
            keyboardPanVelocity = Vector3.zero;
            cameraInitialized = true;
            cameraLocation = view.location;
            cameraRunId = view.runId;
            cameraMapWidth = view.map.width;
            cameraMapHeight = view.map.height;
            cameraMapOriginX = view.map.origin.x;
            cameraMapOriginY = view.map.origin.y;
            ClampCamera();
        }

        private void PreserveCameraAcrossViewport(PositionView nextOrigin)
        {
            var deltaX = nextOrigin.x - cameraMapOriginX;
            var deltaY = nextOrigin.y - cameraMapOriginY;
            Camera.main.transform.position += new Vector3(
                -deltaX * AsciiMapRenderer.CellWidth,
                deltaY * AsciiMapRenderer.CellHeight,
                0f);
            if (keyboardPanTargetSet)
                keyboardPanTarget += new Vector3(
                    -deltaX * AsciiMapRenderer.CellWidth,
                    deltaY * AsciiMapRenderer.CellHeight,
                    0f);
            cameraMapOriginX = nextOrigin.x;
            cameraMapOriginY = nextOrigin.y;
            ClampCamera();
        }

        private void HandleCameraControls()
        {
            HandleZoom();
            HandleCameraKeys();
            if (Input.GetKeyDown(KeyCode.Home)) RecenterObservation();
            MaybeShiftVillageViewport();
            ClampCamera();
        }

        private void RecenterObservation()
        {
            if (view.location != "village")
            {
                FitCamera();
                return;
            }
            if (busy)
            {
                recenterPending = true;
                return;
            }
            viewportShiftPending = true;
            fitAfterViewportShift = true;
            var center = view.observationCenter ?? new PositionView {
                x = view.hero.x, y = view.hero.y
            };
            StartCoroutine(BrowseVillage(center.x, center.y));
        }

        private void MaybeShiftVillageViewport()
        {
            if (view.location != "village" || viewportShiftPending) return;
            var camera = Camera.main;
            var maxX = Mathf.Max(0f, view.map.width * 0.45f - camera.orthographicSize * camera.aspect);
            var maxY = Mathf.Max(0f, view.map.height * 0.45f - camera.orthographicSize);
            var position = camera.transform.position;
            var nearEdge = (maxX > 0f && Mathf.Abs(position.x) > maxX * 0.55f)
                || (maxY > 0f && Mathf.Abs(position.y) > maxY * 0.55f);
            if (!nearEdge) return;
            var centerX = view.map.origin.x + view.map.width / 2
                + Mathf.RoundToInt(position.x / AsciiMapRenderer.CellWidth);
            var centerY = view.map.origin.y + view.map.height / 2
                - Mathf.RoundToInt(position.y / AsciiMapRenderer.CellHeight);
            RequestVillageViewport(centerX, centerY);
        }

        private void RequestVillageViewport(int centerX, int centerY)
        {
            if (view.location != "village") return;
            var region = view.map.region;
            var halfWidth = view.map.width / 2;
            var halfHeight = view.map.height / 2;
            if (region != null)
            {
                centerX = Mathf.Clamp(centerX, region.minX + halfWidth,
                    region.maxX - halfWidth + 1);
                centerY = Mathf.Clamp(centerY, region.minY + halfHeight,
                    region.maxY - halfHeight + 1);
            }
            if (busy || viewportShiftPending)
            {
                queuedViewportCenter = new Vector2Int(centerX, centerY);
                return;
            }
            viewportShiftPending = true;
            StartCoroutine(BrowseVillage(centerX, centerY));
        }

        private IEnumerator BrowseVillage(int centerX, int centerY)
        {
            busy = true;
            yield return api.Browse(centerX, centerY, ApplyView, ShowError);
            viewportShiftPending = false;
            busy = false;
            FlushQueuedUiAction();
        }

        private void HandleZoom()
        {
            var scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) >= 0.01f) AdjustZoom(-scroll * 2f);
            if (Input.GetKeyDown(KeyCode.Minus) ||
                Input.GetKeyDown(KeyCode.KeypadMinus)) AdjustZoom(4f);
            if (Input.GetKeyDown(KeyCode.Equals) ||
                Input.GetKeyDown(KeyCode.KeypadPlus)) AdjustZoom(-4f);
        }

        private void AdjustZoom(float amount)
        {
            Camera.main.orthographicSize = Mathf.Clamp(
                Camera.main.orthographicSize + amount,
                6f,
                MaximumCameraSize());
        }

        private void HandleGuiCameraDrag()
        {
            if (view?.location != "village") return;
            var current = Event.current;
            if (current.type != EventType.MouseDrag || current.button > 2) return;
            if (current.button == 0 && !CanLeftDragCamera()) return;
            PanCameraPixels(current.delta);
            current.Use();
        }

        private void PanCameraPixels(Vector2 delta)
        {
            keyboardPanTargetSet = false;
            keyboardPanVelocity = Vector3.zero;
            var scale = Camera.main.orthographicSize * 2f /
                Mathf.Max(1f, Screen.height) * cameraDragSensitivity;
            Camera.main.transform.position += new Vector3(-delta.x, delta.y) * scale;
        }

        private Vector2Int CameraRegionCenter()
        {
            var position = Camera.main.transform.position;
            var centerX = view.map.origin.x + view.map.width / 2 +
                Mathf.RoundToInt(position.x / AsciiMapRenderer.CellWidth);
            var centerY = view.map.origin.y + view.map.height / 2 -
                Mathf.RoundToInt(position.y / AsciiMapRenderer.CellHeight);
            return new Vector2Int(centerX, centerY);
        }

        private bool CanLeftDragCamera()
        {
            if (view.location != "village" || view.adventurersPresent) return false;
            return !CameraHintBounds().Contains(GuiMousePosition()) &&
                !GroupSummaryBounds().Contains(GuiMousePosition());
        }

        private void HandleCameraKeys()
        {
            var shifted = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
            var townCamera = view.location == "village" && !view.adventurersPresent;
            var direction = shifted || townCamera ? CameraKeyDirection() : Vector2Int.zero;
            if (direction != Vector2Int.zero) ExtendKeyboardPan(direction, shifted ? 6f : 1f);
            if (!keyboardPanTargetSet) return;
            Camera.main.transform.position = Vector3.SmoothDamp(
                Camera.main.transform.position,
                keyboardPanTarget,
                ref keyboardPanVelocity,
                KeyboardPanSmoothTime,
                KeyboardPanMaxSpeed,
                Time.unscaledDeltaTime);
            if (Vector3.Distance(Camera.main.transform.position, keyboardPanTarget) < 0.01f)
            {
                Camera.main.transform.position = keyboardPanTarget;
                keyboardPanTargetSet = false;
                keyboardPanVelocity = Vector3.zero;
            }
        }

        private void ExtendKeyboardPan(Vector2Int direction, float multiplier)
        {
            if (!keyboardPanTargetSet) keyboardPanTarget = Camera.main.transform.position;
            var initial = DirectionKeyPressed() ? KeyboardPanTapDistance * multiplier : 0f;
            var held = KeyboardPanSpeed * multiplier * Time.unscaledDeltaTime;
            keyboardPanTarget += new Vector3(direction.x, -direction.y, 0f) *
                (initial + held);
            keyboardPanTarget.z = -10f;
            keyboardPanTargetSet = true;
        }

        private static bool DirectionKeyPressed() =>
            Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.RightArrow) ||
            Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.DownArrow) ||
            Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.D) ||
            Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.S);

        private static Vector2Int CameraKeyDirection()
        {
            var direction = Vector2Int.zero;
            if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) direction.x -= 1;
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) direction.x += 1;
            if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) direction.y -= 1;
            if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) direction.y += 1;
            return direction;
        }

        private void ClampCamera()
        {
            if (view?.map == null) return;
            var camera = Camera.main;
            var halfMapWidth = view.map.width * 0.45f;
            var halfMapHeight = view.map.height * 0.45f;
            var maxX = Mathf.Max(0f, halfMapWidth - camera.orthographicSize * camera.aspect);
            var maxY = Mathf.Max(0f, halfMapHeight - camera.orthographicSize);
            var position = camera.transform.position;
            position.x = Mathf.Clamp(position.x, -maxX, maxX);
            position.y = Mathf.Clamp(position.y, -maxY, maxY);
            position.z = -10f;
            camera.transform.position = position;
        }

        private float MaximumCameraSize()
        {
            var mapHeight = Mathf.Min(view.map.height,
                MaximumVisibleVillageHeight) * 0.45f;
            var mapWidth = Mathf.Min(view.map.width,
                MaximumVisibleVillageWidth) * 0.45f /
                Mathf.Max(0.1f, Camera.main.aspect);
            // Full zoom must expose both promised dimensions. Using Min here
            // silently narrowed a 140-cell-wide view on taller windows.
            return Mathf.Max(6f, Mathf.Max(mapHeight, mapWidth));
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void OnGUI()
        {
            EnsureStyles();
            HandleGuiCameraDrag();
            if (view == null)
            {
                DrawPanel(new Rect(18f, 18f, 320f, 64f));
                GUI.Label(new Rect(32f, 34f, 290f, 28f), "Connecting to the world…", bodyStyle);
                return;
            }
            if (partyOpen || characterSheetOpen)
            {
                DrawWorkspaceBackground();
                if (characterSheetOpen) DrawCharacterSheet();
                else DrawPartyOverlay();
                return;
            }
            DrawDamageFlash();
            DrawStockLabels();
            DrawStructureLabels();
            DrawTopBar();
            DrawCameraHint();
            DrawSimulationControls();
            DrawGroupSummary();
            DrawInspector();
            DrawActivityLog();
            DrawCommandBar();
            DrawInventoryOverlay();
            DrawPartyOverlay();
            DrawCharacterSheet();
            DrawShopOverlay();
            DrawOutcomeOverlay();
            DrawStrategyOverlay();
            DrawMeaningOverlay();
            DrawRegionMapOverlay();
        }

        private void DrawWorkspaceBackground()
        {
            GUI.color = new Color(0.025f, 0.032f, 0.026f, 1f);
            GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(24f, 18f, 420f, 28f), characterSheetOpen ? "PARTY  /  CHARACTER RECORD" : "PARTY MANAGEMENT", titleStyle);
            if (characterSheetOpen && GUI.Button(new Rect(Screen.width - 336f, 12f, 150f, 36f), "← Party [Esc]"))
                characterSheetOpen = false;
            var gameLabel = characterSheetOpen ? "Game [C]" : "Return to Game [Esc]";
            if (GUI.Button(new Rect(Screen.width - 176f, 12f, 152f, 36f), gameLabel))
                CloseWorkspace();
        }

        private void CloseWorkspace()
        {
            characterSheetOpen = false;
            partyOpen = false;
        }

        private void ToggleGroupManagement()
        {
            if (partyOpen) CloseWorkspace();
            else OpenGroupManagement();
        }

        private void OpenGroupManagement()
        {
            partyActorId = null;
            partyOpen = true;
            characterSheetOpen = false;
            partyRosterScroll = Vector2.zero;
            partyContentScroll = Vector2.zero;
        }

        private void DrawDamageFlash()
        {
            if (Time.time >= damageFlashUntil) return;
            var strength = Mathf.Clamp01((damageFlashUntil - Time.time) / 0.38f);
            GUI.color = new Color(0.72f, 0.04f, 0.02f, strength * 0.24f);
            GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        private void DrawOutcomeOverlay()
        {
            if (view.status == "active" || view.status == "dying") return;
            var panel = new Rect((Screen.width - 420f) * 0.5f, 86f, 420f, 112f);
            DrawPanel(panel);
            var title = view.status == "won" ? "DUNGEON CONQUERED" : view.status == "dead" ? "THE PARTY FALLS" : "THE LEADER IS STABLE";
            var detail = view.status == "won"
                ? $"The expedition returns with {view.hero.goldCp} CP."
                : "No further turn can be taken from this state.";
            GUI.Label(new Rect(panel.x + 18f, panel.y + 18f, 384f, 28f), title, titleStyle);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 58f, 384f, 24f), detail, bodyStyle);
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawTopBar()
        {
            var panel = new Rect(12f, 12f, Screen.width - 24f, 44f);
            DrawPanel(panel);
            GUI.Label(new Rect(28f, 21f, 190f, 26f), view.title, titleStyle);
            var clock = string.IsNullOrEmpty(view.townClock) ? $"TURN {view.tick}" : view.townClock.ToUpperInvariant();
            GUI.Label(new Rect(210f, 24f, 360f, 20f), $"{clock}  ·  {view.status.ToUpperInvariant()}", subtleStyle);
            if (view.location == "village" && view.villageDevelopment != null)
            {
                var board = view.villageDevelopment.strategyBoard;
                var proposal = board == null
                    ? null
                    : Array.Find(board.proposalQueue ?? Array.Empty<VillageProposalView>(),
                        candidate => candidate.id == board.activeProposalId);
                var commission = board == null
                    ? null
                    : Array.Find(board.commissions ?? Array.Empty<VillageCommissionView>(),
                        candidate => candidate.id == board.activeCommissionId);
                var leader = commission?.assignments?.leader?.actorName ?? "Edda Voss";
                var crew = commission?.assignments?.crewActorIds?.Length ?? 0;
                var decision = proposal == null ? "UNDECIDED" : proposal.status.ToUpperInvariant();
                var trade = view.villageTrade == null
                    ? ""
                    : view.villageTrade.activeVisit == null
                        ? $"  ·  TREASURY {view.villageTrade.treasuryCp} CP"
                        : $"  ·  MERCHANT HERE  ·  TREASURY {view.villageTrade.treasuryCp} CP";
                GUI.Label(new Rect(558f, 24f, Mathf.Max(190f, Screen.width - 958f), 20f),
                    $"{leader.ToUpperInvariant()}  ·  {Readable(view.villageDevelopment.activePriority)}  ·  {decision}  ·  CREW {crew}{trade}", subtleStyle);
            }
            if (view.adventurersPresent)
            {
                var right = Screen.width - 390f;
                GUI.Label(new Rect(right, 23f, 150f, 20f), view.hero.name, bodyStyle);
                DrawHealthBar(new Rect(right + 150f, 27f, 90f, 10f));
                GUI.Label(new Rect(right + 250f, 23f, 110f, 20f), $"{view.hero.hp} HP  ·  {view.hero.goldCp} CP", bodyStyle);
            }
        }

        private void DrawCameraHint()
        {
            if (view.location != "village") return;
            var panel = CameraHintBounds();
            DrawPanel(panel);
            var center = CameraRegionCenter();
            GUI.Label(new Rect(panel.x + 10f, panel.y + 5f, 260f, 18f),
                "DRAG · WASD / ARROWS · SHIFT FAST · WHEEL", subtleStyle);
            GUI.Label(new Rect(panel.x + 10f, panel.y + 25f, 286f, 18f),
                $"CAMERA {center.x:+0;-0;0}, {center.y:+0;-0;0}  ·  {view.map.width}×{view.map.height} OF " +
                $"{view.map.region.width}×{view.map.region.height}", subtleStyle);
            if (GUI.Button(new Rect(panel.x + 300f, panel.y + 12f, 150f, 28f),
                view.adventurersPresent ? "Center Party [Home]" : "Center Town [Home]")) RecenterObservation();
            if (GUI.Button(new Rect(panel.x + 454f, panel.y + 12f, 94f, 28f),
                "Council [V]")) ToggleStrategyBoard();
            if (GUI.Button(new Rect(panel.x + 552f, panel.y + 12f, 116f, 28f),
                "Region [R]")) regionMapOpen = true;
        }

        // function-length-exempt: template -- immediate-mode regional map composition
        private void DrawRegionMapOverlay()
        {
            if (!regionMapOpen || view.map.region == null) return;
            var region = view.map.region;
            var panel = new Rect(90f, 70f, Screen.width - 180f, Screen.height - 140f);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 20f, panel.y + 14f, 500f, 28f),
                "STONEBRIDGE MARCH · REGIONAL SURVEY", titleStyle);
            GUI.Label(new Rect(panel.x + 20f, panel.y + 44f, 700f, 22f),
                $"{region.width}×{region.height} CELLS · {region.chunkSize}×{region.chunkSize} CHUNKS · " +
                "remote work includes outbound and return travel", subtleStyle);
            var map = new Rect(panel.x + 24f, panel.y + 82f,
                Mathf.Min(560f, panel.height - 112f), Mathf.Min(560f, panel.height - 112f));
            DrawRegionalSurveyMap(map, region);
            DrawRegionalSiteList(new Rect(map.xMax + 24f, map.y,
                panel.xMax - map.xMax - 48f, map.height), region);
            if (GUI.Button(new Rect(panel.xMax - 150f, panel.y + 14f, 128f, 30f),
                "Return [R / Esc]")) regionMapOpen = false;
        }

        private void DrawRegionalSurveyMap(Rect bounds, RegionView region)
        {
            GUI.color = new Color(0.07f, 0.12f, 0.07f, 1f);
            GUI.DrawTexture(bounds, Texture2D.whiteTexture);
            DrawRegionalGrid(bounds, region);
            GUI.color = new Color(0.13f, 0.24f, 0.36f, 1f);
            foreach (var waterway in region.waterways ?? Array.Empty<RegionalPolylineView>())
                DrawRegionalPolyline(bounds, region, waterway.points, 4f);
            GUI.color = new Color(0.40f, 0.34f, 0.25f, 1f);
            DrawRegionalPolyline(bounds, region, region.trail, 3f);
            GUI.color = Color.white;
            DrawCurrentViewport(bounds, region);
            foreach (var site in region.sites ?? Array.Empty<RegionalSiteView>())
                DrawRegionalSiteMarker(bounds, region, site);
            HandleRegionalMapClick(bounds, region);
        }

        private static void DrawRegionalGrid(Rect bounds, RegionView region)
        {
            GUI.color = new Color(0.32f, 0.42f, 0.30f, 0.32f);
            var spacing = Mathf.Max(256, region.width / 8);
            for (var x = region.minX + spacing; x < region.maxX; x += spacing)
                GUI.DrawTexture(new Rect(RegionalMapX(bounds, region, x), bounds.y,
                    1f, bounds.height), Texture2D.whiteTexture);
            for (var y = region.minY + spacing; y < region.maxY; y += spacing)
                GUI.DrawTexture(new Rect(bounds.x, RegionalMapY(bounds, region, y),
                    bounds.width, 1f), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        private void HandleRegionalMapClick(Rect bounds, RegionView region)
        {
            var current = Event.current;
            if (current.type != EventType.MouseDown || current.button != 0 ||
                !bounds.Contains(current.mousePosition)) return;
            var x = region.minX + Mathf.RoundToInt(
                (current.mousePosition.x - bounds.x) * region.width / bounds.width);
            var y = region.minY + Mathf.RoundToInt(
                (current.mousePosition.y - bounds.y) * region.height / bounds.height);
            regionMapOpen = false;
            fitAfterViewportShift = true;
            RequestVillageViewport(x, y);
            current.Use();
        }

        private static void DrawRegionalPolyline(
            Rect bounds, RegionView region, PositionView[] points, float width)
        {
            if (points == null || points.Length < 2) return;
            for (var index = 1; index < points.Length; index++)
            {
                var from = new Vector2(RegionalMapX(bounds, region, points[index - 1].x),
                    RegionalMapY(bounds, region, points[index - 1].y));
                var to = new Vector2(RegionalMapX(bounds, region, points[index].x),
                    RegionalMapY(bounds, region, points[index].y));
                var delta = to - from;
                var previous = GUI.matrix;
                GUIUtility.RotateAroundPivot(Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg, from);
                GUI.DrawTexture(new Rect(from.x, from.y - width * 0.5f, delta.magnitude, width),
                    Texture2D.whiteTexture);
                GUI.matrix = previous;
            }
        }

        private void DrawCurrentViewport(Rect bounds, RegionView region)
        {
            var x = RegionalMapX(bounds, region, view.map.origin.x);
            var y = RegionalMapY(bounds, region, view.map.origin.y);
            var width = bounds.width * view.map.width / region.width;
            var height = bounds.height * view.map.height / region.height;
            GUI.Box(new Rect(x, y, width, height), "CURRENT VIEW");
        }

        private void DrawRegionalSiteMarker(Rect bounds, RegionView region, RegionalSiteView site)
        {
            var x = RegionalMapX(bounds, region, site.position.x) - 6f;
            var y = RegionalMapY(bounds, region, site.position.y) - 6f;
            GUI.color = site.dispatchStatus == "reachable" ? Color.yellow : new Color(1f, 0.55f, 0.22f);
            GUI.DrawTexture(new Rect(x, y, 12f, 12f), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        private void DrawRegionalSiteList(Rect bounds, RegionView region)
        {
            GUI.Label(new Rect(bounds.x, bounds.y, bounds.width, 26f), "SURVEYED SOURCES", headingStyle);
            var y = bounds.y + 34f;
            foreach (var site in region.sites ?? Array.Empty<RegionalSiteView>())
            {
                GUI.Label(new Rect(bounds.x, y, bounds.width, 24f), site.name, bodyStyle);
                GUI.Label(new Rect(bounds.x, y + 23f, bounds.width, 42f),
                    $"Chunk {site.chunkX},{site.chunkY} · {site.distance} cells · {Readable(site.tripClass)}\n" +
                    $"Round trip {site.roundTripTicks} ticks · {Readable(site.dispatchStatus)}", subtleStyle);
                if (GUI.Button(new Rect(bounds.x, y + 69f, Mathf.Min(220f, bounds.width), 28f),
                    "Observe this region")) ObserveRegionalSite(site);
                y += 118f;
            }
        }

        private void ObserveRegionalSite(RegionalSiteView site)
        {
            regionMapOpen = false;
            fitAfterViewportShift = true;
            RequestVillageViewport(site.position.x, site.position.y);
        }

        private static float RegionalMapX(Rect bounds, RegionView region, int x) =>
            bounds.x + (x - region.minX) * bounds.width / region.width;

        private static float RegionalMapY(Rect bounds, RegionView region, int y) =>
            bounds.y + (y - region.minY) * bounds.height / region.height;

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

        private static Rect SimulationBounds() =>
            new(Mathf.Min(Screen.width - 712f, Mathf.Max(700f,
                (Screen.width - 700f) * 0.5f)), 68f, 700f, 42f);

        private static Rect CameraHintBounds() => new(12f, 62f, 680f, 50f);

        private void DrawSimulationControls()
        {
            var panel = SimulationBounds();
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 10f, panel.y + 12f, 38f, 18f), "SIM", headingStyle);
            DrawSimulationButton(panel, 52f, 92f, "Pause [F5]", "paused", () => SetSimulationMode("paused"), true);
            DrawSimulationButton(panel, 148f, 88f, "Step [F6]", null, StepSimulation, view.simulation?.canRun == true);
            DrawSimulationButton(panel, 240f, 94f, "Run 1× [F7]", "normal", () => SetSimulationMode("normal"), view.simulation?.canRun == true);
            DrawSimulationButton(panel, 338f, 112f, "Fast 4× [F8]", "fast", () => SetSimulationMode("fast"), view.simulation?.canRun == true);
            DrawSimulationButton(panel, 454f, 140f, "Observe 16× [F10]", "observe", () => SetSimulationMode("observe"), view.simulation?.canRun == true);
            DrawSimulationButton(panel, 598f, 90f, "Save [F9]", null, SaveSimulation, true);
        }

        private void DrawSimulationButton(Rect panel, float offset, float width, string label, string mode, Action action, bool available)
        {
            GUI.enabled = available && (mode == null || simulationMode != mode);
            var shown = mode != null && simulationMode == mode ? $"● {label}" : label;
            if (GUI.Button(new Rect(panel.x + offset, panel.y + 7f, width, 28f), shown)) action();
            GUI.enabled = true;
        }

        private Rect GroupSummaryBounds()
        {
            var members = view?.partyMembers ?? Array.Empty<PartyMemberView>();
            var height = groupSummaryExpanded
                ? Mathf.Min(92f + members.Length * 42f, Mathf.Max(162f, Screen.height - 150f))
                : 38f;
            return new Rect(Screen.width - 278f, 68f, 266f, height);
        }

        private void DrawGroupSummary()
        {
            var members = view.partyMembers ?? Array.Empty<PartyMemberView>();
            if (members.Length == 0) return;
            var panel = GroupSummaryBounds();
            DrawPanel(panel);
            var arrow = groupSummaryExpanded ? "▼" : "▶";
            if (GUI.Button(new Rect(panel.x + 8f, panel.y + 7f, panel.width - 16f, 28f), $"{arrow}  GROUP · {members.Length}"))
                groupSummaryExpanded = !groupSummaryExpanded;
            if (!groupSummaryExpanded) return;
            DrawGroupMembers(panel, members);
            if (GUI.Button(new Rect(panel.x + 8f, panel.yMax - 40f, panel.width - 16f, 31f), "Manage Group"))
                OpenGroupManagement();
        }

        private void DrawGroupMembers(Rect panel, PartyMemberView[] members)
        {
            var viewport = new Rect(panel.x + 8f, panel.y + 40f, panel.width - 16f, panel.height - 88f);
            if (members.Length * 42f <= viewport.height)
            {
                GUI.BeginGroup(viewport);
                for (var index = 0; index < members.Length; index++) DrawGroupMember(members[index], index, viewport.width);
                GUI.EndGroup();
                return;
            }
            var content = new Rect(0f, 0f, viewport.width - 18f, members.Length * 42f);
            groupSummaryScroll = GUI.BeginScrollView(viewport, groupSummaryScroll, content);
            for (var index = 0; index < members.Length; index++) DrawGroupMember(members[index], index, content.width);
            GUI.EndScrollView();
        }

        private void DrawGroupMember(PartyMemberView member, int index, float width)
        {
            var y = index * 42f;
            var ratio = Mathf.Clamp01((float)member.hp / Mathf.Max(1, member.maxHp));
            var marker = ratio <= 0f ? "✖" : ratio < 0.35f ? "!" : ratio < 0.7f ? "◆" : "●";
            if (GUI.Button(new Rect(0f, y, width, 36f), $"{marker}  {member.name}     {member.hp}/{member.maxHp} HP"))
                OpenPartyMember(member);
            GUI.color = ratio < 0.35f ? new Color(0.82f, 0.18f, 0.12f) : ratio < 0.7f ? new Color(0.82f, 0.62f, 0.15f) : new Color(0.28f, 0.68f, 0.30f);
            GUI.DrawTexture(new Rect(8f, y + 31f, (width - 16f) * ratio, 3f), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        private void OpenPartyMember(PartyMemberView member)
        {
            partyActorId = member.id;
            partyTab = 0;
            partyContentScroll = Vector2.zero;
            partyOpen = true;
            characterSheetOpen = false;
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawInspector()
        {
            var cell = SelectedCell();
            if (cell == null) return;
            var description = SelectionDescription(cell);
            var reasonLines = string.IsNullOrEmpty(cell.entityReason) ? 0 : 1;
            var workLines = string.IsNullOrEmpty(cell.entityWork) ? 0 : 1;
            var permissionLines = string.IsNullOrEmpty(cell.entityPermissions) ? 0 : 1;
            var capabilityLines = string.IsNullOrEmpty(cell.entityCapabilities) ? 0 : 1;
            var needLines = string.IsNullOrEmpty(cell.entityNeeds) ? 0 : 1;
            var scheduleLines = string.IsNullOrEmpty(cell.entitySchedule) ? 0 : 1;
            var memoryLines = string.IsNullOrEmpty(cell.entityMemory) ? 0 : 1;
            var detailLines = string.IsNullOrEmpty(description)
                ? 0 : Mathf.Clamp(Mathf.CeilToInt(description.Length / 38f), 1, 7);
            var detailHeight = detailLines * 20f;
            var height = 166f + detailHeight +
                (reasonLines + workLines + permissionLines + capabilityLines + needLines + scheduleLines + memoryLines) * 22f;
            var panel = new Rect(12f, Screen.height - 64f - height, 300f, height);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 238f, 18f), "SELECTED", headingStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 32f, 238f, 24f), SelectionName(cell), titleStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 60f, 238f, 18f), $"{Readable(cell.objectKind)}  ·  {Readable(cell.tile)}", bodyStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 82f, 238f, 18f), $"POSITION  {cell.x}, {cell.y}", subtleStyle);
            if (detailLines > 0)
                GUI.Label(new Rect(panel.x + 14f, panel.y + 104f, 272f, detailHeight),
                    description, detailStyle);
            var contentY = detailHeight;
            if (cell.entityMaxHp > 0)
                GUI.Label(new Rect(panel.x + 14f, panel.y + 104f + contentY, 272f, 18f),
                    $"HEALTH  {cell.entityHp} / {cell.entityMaxHp}", cell.entityKind == "monster" ? dangerStyle : bodyStyle);
            if (!string.IsNullOrEmpty(cell.entityAction))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 126f + contentY, 272f, 18f), cell.entityAction, bodyStyle);
            if (!string.IsNullOrEmpty(cell.entityObjective))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 146f + contentY, 272f, 16f), Readable(cell.entityObjective), subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityReason))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY, 272f, 16f), $"WHY  {Readable(cell.entityReason)}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityWork))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + reasonLines * 22f, 272f, 16f), $"WORK  {Readable(cell.entityWork)}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityPermissions))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + (reasonLines + workLines) * 22f, 272f, 16f), $"ALLOWED  {Readable(cell.entityPermissions)}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityCapabilities))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + (reasonLines + workLines + permissionLines) * 22f, 272f, 16f), $"SKILLS  {Readable(cell.entityCapabilities)}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityNeeds))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + (reasonLines + workLines + permissionLines + capabilityLines) * 22f, 272f, 16f), $"NEEDS  {Readable(cell.entityNeeds)}", bodyStyle);
            if (!string.IsNullOrEmpty(cell.entitySchedule))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + (reasonLines + workLines + permissionLines + capabilityLines + needLines) * 22f, 272f, 16f), $"SCHEDULE  {Readable(cell.entitySchedule)}", subtleStyle);
            if (!string.IsNullOrEmpty(cell.entityMemory))
                GUI.Label(new Rect(panel.x + 14f, panel.y + 166f + contentY + (reasonLines + workLines + permissionLines + capabilityLines + needLines + scheduleLines) * 22f, 272f, 16f), $"REMEMBERS  {cell.entityMemory}", subtleStyle);
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawStockLabels()
        {
            if (view.location != "village" || view.map?.cells == null || Camera.main == null)
                return;
            foreach (var cell in view.map.cells)
            {
                if (!cell.storageCell) continue;
                var quantity = cell.storageUsed + cell.storageOverflow;
                var capacity = cell.storageAllowance;
                if (capacity <= 0 && !cell.storageLoosePile) continue;
                var isSelected = selected.HasValue && selected.Value.x == cell.x &&
                    selected.Value.y == cell.y;
                if (quantity <= 0 && !isSelected && Camera.main.orthographicSize > 14f)
                    continue;
                var screen = Camera.main.WorldToScreenPoint(
                    mapRenderer.WorldCellCenter(cell.x, cell.y));
                if (screen.z <= 0f) continue;
                var detailed = isSelected || Camera.main.orthographicSize <= 14f;
                var width = detailed ? 44f : 20f;
                var height = detailed ? 18f : 14f;
                var stagger = detailed ? 0f : ((cell.x & 1) == 0 ? -7f : 7f);
                var bounds = new Rect(screen.x - width * 0.5f,
                    Screen.height - screen.y - height * 0.5f + stagger,
                    width, height);
                if (bounds.xMax < 0f || bounds.xMin > Screen.width ||
                    bounds.yMax < 0f || bounds.yMin > Screen.height) continue;
                GUI.color = quantity > capacity
                    ? new Color(0.38f, 0.04f, 0.03f, 0.94f)
                    : new Color(0.035f, 0.045f, 0.035f, 0.88f);
                GUI.Box(bounds, GUIContent.none);
                GUI.color = Color.white;
                var reserved = cell.storageReserved > 0
                    ? $"+{cell.storageReserved}" : "";
                var overflow = cell.storageOverflow > 0
                    ? $" !{cell.storageOverflow}" : "";
                var amount = cell.storageLoosePile
                    ? $"LOOSE !{cell.storageOverflow}"
                    : $"{quantity}{reserved}/{capacity}{overflow}";
                GUI.Label(bounds, detailed ? amount : $"{quantity}",
                    quantity > capacity ? dangerStyle : stockLabelStyle);
            }
        }

        private void DrawStructureLabels()
        {
            if (view.location != "village" || view.map?.landmarks == null ||
                Camera.main == null) return;
            foreach (var building in view.map.landmarks)
            {
                if (!building.complete) continue;
                var lowerLeft = mapRenderer.WorldCellCenter(
                    building.x, building.y + building.height - 1);
                var belowLeft = mapRenderer.WorldCellCenter(
                    building.x, building.y + building.height);
                var screen = Camera.main.WorldToScreenPoint(lowerLeft);
                var below = Camera.main.WorldToScreenPoint(belowLeft);
                if (screen.z <= 0f) continue;
                var caption = building.name;
                var width = Mathf.Clamp(
                    structureLabelStyle.CalcSize(new GUIContent(caption)).x + 18f,
                    92f, 250f);
                var lowerEdge = Screen.height - screen.y +
                    Mathf.Abs(below.y - screen.y) * 0.5f;
                var bounds = new Rect(screen.x - 8f, lowerEdge + 3f,
                    width, 22f);
                if (bounds.xMax < 0f || bounds.xMin > Screen.width ||
                    bounds.yMax < 0f || bounds.yMin > Screen.height) continue;
                GUI.color = new Color(0.035f, 0.045f, 0.035f, 0.9f);
                GUI.DrawTexture(bounds, Texture2D.whiteTexture);
                GUI.color = Color.white;
                GUI.Label(bounds, caption, structureLabelStyle);
            }
        }

        private void DrawActivityLog()
        {
            var entries = view.activityLog ?? Array.Empty<ActivityView>();
            if (entries.Length == 0) return;
            var height = 22f + entries.Length * 18f;
            var panel = new Rect((Screen.width - 560f) * 0.5f, Screen.height - 66f - height, 560f, height);
            DrawPanel(panel);
            for (var index = 0; index < entries.Length; index++)
                GUI.Label(new Rect(panel.x + 14f, panel.y + 7f + index * 18f, 532f, 18f),
                    entries[index].text, ActivityStyle(entries[index].tone));
        }

        private GUIStyle ActivityStyle(string tone)
        {
            if (tone == "danger" || tone == "combat") return dangerStyle;
            if (tone == "healing") return healingStyle;
            if (tone == "treasure" || tone == "discovery") return treasureStyle;
            return subtleStyle;
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
            else DrawVillageCommands(panel);
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawVillageCommands(Rect panel)
        {
            if (!view.adventurersPresent)
            {
                var simulationX = panel.x + 322f;
                if (GUI.Button(new Rect(simulationX, panel.y + 7f, 100f, 28f), "Wait [Space]"))
                    SendIntent(new MoveIntent { kind = "wait" });
                if (!DrawPendingCropDestination(panel, simulationX + 116f) &&
                    !DrawFieldControls(panel, simulationX + 116f))
                {
                    if (GUI.Button(new Rect(simulationX + 116f, panel.y + 7f,
                        126f, 28f), "Inspect field [F]")) FocusNextCropField();
                    if (GUI.Button(new Rect(simulationX + 246f, panel.y + 7f,
                        132f, 28f), "Inspect animal [L]")) FocusNextAnimal();
                    GUI.Label(new Rect(simulationX + 386f, panel.y + 11f,
                        panel.width - 722f, 22f), "Town simulation mode", subtleStyle);
                }
                return;
            }
            var cell = SelectedCell();
            var actions = cell?.actions?.Length > 0 ? cell.actions : NearbyActions();
            var x = panel.x + 322f;
            var movementLabel = view.regrouping ? "Regrouping…" :
                view.partyMovement == "dispersed" ? "Regroup [G]" : "Disperse [G]";
            GUI.enabled = !view.regrouping;
            if (GUI.Button(new Rect(x, panel.y + 7f, 92f, 28f), movementLabel))
                TogglePartyMovement();
            GUI.enabled = true;
            x += 96f;
            if (GUI.Button(new Rect(x, panel.y + 7f, 100f, 28f), $"{SpendingLabel()} [P]")) CycleSpendingPolicy();
            x += 104f;
            if (GUI.Button(new Rect(x, panel.y + 7f, 84f, 28f), "Wait [Space]"))
                SendIntent(new MoveIntent { kind = "wait" });
            x += 88f;
            if (GUI.Button(new Rect(x, panel.y + 7f, 82f, 28f), "Party [C]")) ToggleGroupManagement();
            x += 86f;
            if (view.shop != null && view.shop.open)
            {
                if (GUI.Button(new Rect(x, panel.y + 7f, 82f, 28f), "Shop [Y]")) shopOpen = !shopOpen;
                x += 86f;
            }
            if (actions.Length == 0)
                GUI.Label(new Rect(x + 8f, panel.y + 11f, panel.width - 344f, 22f),
                    "WASD Move · RMB Drag Map · Wheel Zoom · Home Center", subtleStyle);
            foreach (var action in actions)
            {
                var label = VillageActionLabel(action);
                var width = Mathf.Max(62f, GUI.skin.button.CalcSize(new GUIContent(label)).x + 14f);
                if (GUI.Button(new Rect(x, panel.y + 7f, width, 28f), label))
                    InteractWithAction(action);
                x += width + 4f;
            }
        }

        private string SpendingLabel()
        {
            if (view.spendingPolicy == null || view.spendingPolicy.mode == "approval_required") return "Spend: Ask";
            return view.spendingPolicy.mode == "routine_supplies" ? "Spend: 25" : "Spend: 100";
        }

        private bool DrawFieldControls(Rect panel, float x)
        {
            var cell = SelectedCell();
            if (cell == null || string.IsNullOrEmpty(cell.cropPlotId)) return false;
            if (cell.cropStage is "fallow" or "prepared")
            {
                var next = cell.cropKind == "grain" ? "vegetables" : "grain";
                if (GUI.Button(new Rect(x, panel.y + 7f, 142f, 28f),
                    $"Plant: {Readable(cell.cropKind)}"))
                    SetCropPlan(cell, "select_crop", next);
                x += 146f;
                var action = cell.cropSowingPaused ? "allow_sowing" : "forbid_sowing";
                if (GUI.Button(new Rect(x, panel.y + 7f, 94f, 28f),
                    cell.cropSowingPaused ? "Sowing Off" : "Sowing On"))
                    SetCropPlan(cell, action, cell.cropKind);
                x += 98f;
            }
            else
            {
                if (!cell.cropCutOrdered && GUI.Button(
                    new Rect(x, panel.y + 7f, 110f, 28f), "Cut crop"))
                    SetCropPlan(cell, "cut", cell.cropKind);
                x += 114f;
            }
            if (GUI.Button(new Rect(x, panel.y + 7f, 132f, 28f),
                "Storage [H]"))
                BeginCropStorageSelection(cell);
            return true;
        }

        private void BeginSelectedCropStorageSelection()
        {
            var cell = SelectedCell();
            if (cell != null && !string.IsNullOrEmpty(cell.cropPlotId))
                BeginCropStorageSelection(cell);
        }

        private void BeginCropStorageSelection(CellView cell)
        {
            pendingCropDestinationPlotId = cell.cropPlotId;
            pendingCropDestinationKind = cell.cropKind;
        }

        private bool DrawPendingCropDestination(Rect panel, float x)
        {
            if (string.IsNullOrEmpty(pendingCropDestinationPlotId)) return false;
            var cell = SelectedCell();
            var compatible = CropDestinationCompatible(cell);
            GUI.enabled = compatible;
            if (GUI.Button(new Rect(x, panel.y + 7f, 148f, 28f),
                compatible ? "Store harvest here" : "Select crop storage"))
                SetCropDestination(cell);
            GUI.enabled = true;
            if (GUI.Button(new Rect(x + 152f, panel.y + 7f, 70f, 28f), "Cancel"))
                ClearCropDestinationSelection();
            return true;
        }

        private bool CropDestinationCompatible(CellView cell) =>
            cell != null && cell.storageCell && !cell.storageLoosePile &&
            !string.IsNullOrEmpty(cell.storageCellId) &&
            Array.IndexOf(cell.storageAllowedItemKinds ?? Array.Empty<string>(),
                pendingCropDestinationKind) >= 0;

        private void SetCropDestination(CellView cell)
        {
            SendIntent(new MoveIntent {
                kind = "set_crop_plan", targetId = pendingCropDestinationPlotId,
                action = "set_destination", objectId = cell.storageCellId
            });
            ClearCropDestinationSelection();
        }

        private void ClearCropDestinationSelection()
        {
            pendingCropDestinationPlotId = null;
            pendingCropDestinationKind = null;
        }

        private void FocusNextCropField()
        {
            var plots = Array.FindAll(view.map.cells ?? Array.Empty<CellView>(),
                cell => !string.IsNullOrEmpty(cell.cropPlotId));
            if (plots.Length == 0)
            {
                error = "No planted fields are visible in this region.";
                return;
            }
            var currentId = SelectedCell()?.cropPlotId;
            var currentIndex = Array.FindLastIndex(plots,
                cell => cell.cropPlotId == currentId);
            var cell = plots[(currentIndex + 1) % plots.Length];
            FocusCell(cell);
        }

        private void FocusNextAnimal()
        {
            var animals = Array.FindAll(view.map.cells ?? Array.Empty<CellView>(),
                cell => cell.entityReason?.StartsWith("animal_") == true);
            if (animals.Length == 0)
            {
                error = "No animals are visible in this region.";
                return;
            }
            var currentId = SelectedCell()?.entityId;
            var currentIndex = Array.FindLastIndex(animals,
                cell => cell.entityId == currentId);
            FocusCell(animals[(currentIndex + 1) % animals.Length]);
        }

        private void FocusCell(CellView cell)
        {
            selected = new Vector2Int(cell.x, cell.y);
            mapRenderer.Select(selected.Value, view);
            keyboardPanTarget = mapRenderer.WorldCellCenter(cell.x, cell.y);
            keyboardPanTarget.z = -10f;
            keyboardPanTargetSet = true;
        }

        private void SetCropPlan(CellView cell, string action, string cropKind)
        {
            SendIntent(new MoveIntent {
                kind = "set_crop_plan", targetId = cell.cropPlotId,
                action = action, itemKind = cropKind
            });
        }

        private void TogglePartyMovement()
        {
            if (view.regrouping) return;
            SendIntent(new MoveIntent {
                kind = "set_party_movement",
                mode = view.partyMovement == "dispersed" ? "follow" : "dispersed"
            });
        }

        private void CycleSpendingPolicy()
        {
            var current = view.spendingPolicy?.mode ?? "approval_required";
            var next = current == "approval_required" ? "routine_supplies" :
                current == "routine_supplies" ? "autonomous" : "approval_required";
            var limit = next == "routine_supplies" ? 25 : next == "autonomous" ? 100 : 0;
            SendIntent(new MoveIntent { kind = "set_spending_policy", mode = next, limitCp = limit });
        }

        private void ToggleStrategyBoard()
        {
            if (view.location == "dungeon" || view.villageDevelopment?.strategyBoard == null)
                return;
            strategyOpen = !strategyOpen;
            strategyScroll = Vector2.zero;
            if (strategyOpen)
            {
                simulationMode = "paused";
                inventoryOpen = false;
                shopOpen = false;
                meaningOpen = false;
            }
        }

        private void ToggleMeaningBoard()
        {
            if (view.location == "dungeon" || view.villageMeaning == null) return;
            meaningOpen = !meaningOpen;
            meaningScroll = Vector2.zero;
            if (!meaningOpen) return;
            simulationMode = "paused";
            inventoryOpen = false;
            shopOpen = false;
            strategyOpen = false;
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawStrategyOverlay()
        {
            if (!strategyOpen || view.location == "dungeon") return;
            var board = view.villageDevelopment?.strategyBoard;
            if (board == null) return;
            GUI.color = new Color(0.01f, 0.015f, 0.01f, 0.74f);
            GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
            var width = Mathf.Min(900f, Screen.width - 36f);
            var height = Mathf.Min(680f, Screen.height - 74f);
            var panel = new Rect((Screen.width - width) * 0.5f, 44f, width, height);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 12f, 420f, 28f),
                "STONEBRIDGE VILLAGE COUNCIL", titleStyle);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 42f, 650f, 20f),
                $"Reeve Edda Voss  ·  Policy: {Readable(board.policy)}  ·  Revision {board.revision}", subtleStyle);
            var needs = view.villageDevelopment.residentNeedsAssessment;
            var warnings = needs?.warningCounts;
            var food = needs?.foodOutlook;
            var reviewTicks = Mathf.Max(0, view.villageDevelopment.nextResidentNeedsReviewAtTick - view.tick);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 64f, panel.width - 190f, 20f),
                needs == null ? "Resident needs inventory unavailable" :
                $"NEEDS  hungry {warnings?.hunger ?? 0}  ·  tired {warnings?.fatigue ?? 0}  ·  unsafe {warnings?.safety ?? 0}  ·  lonely {warnings?.social ?? 0}  ·  low morale {warnings?.morale ?? 0}  ·  homeless {needs.homelessCount}",
                warnings != null && (warnings.hunger > 0 || warnings.safety > 0 || warnings.social > 0 || warnings.morale > 0) ? dangerStyle : subtleStyle);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 84f, panel.width - 190f, 20f),
                food == null ? "Food outlook unavailable" :
                $"FOOD OUTLOOK  {food.availablePortions}/{food.oneDayTarget} one-day floor  ·  {food.coverageDays:0.0} days  ·  planting {(food.seasonalPlantingUnderway ? "underway" : "not started")}  ·  RECOMMEND {Readable(needs.recommendedPriority)}",
                food != null && (food.availablePortions < food.oneDayTarget || !food.seasonalPlantingUnderway) ? treasureStyle : subtleStyle);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 104f, panel.width - 190f, 20f),
                needs == null ? "Recommendation reason unavailable" : $"WHY  {needs.recommendationReason}  ·  next review in {reviewTicks} ticks", subtleStyle);
            if (GUI.Button(new Rect(panel.xMax - 152f, panel.y + 10f, 134f, 30f),
                "Return [V / Esc]")) strategyOpen = false;

            var proposals = Array.FindAll(
                board.proposalQueue ?? Array.Empty<VillageProposalView>(),
                proposal => proposal.status != "superseded");
            var viewport = new Rect(panel.x + 14f, panel.y + 132f, panel.width - 28f, panel.height - 146f);
            var contentHeight = 12f;
            foreach (var proposal in proposals)
                contentHeight += StrategyProposalHeight(proposal) + 10f;
            contentHeight = Mathf.Max(viewport.height, contentHeight);
            strategyScroll = GUI.BeginScrollView(viewport, strategyScroll,
                new Rect(0f, 0f, viewport.width - 18f, contentHeight));
            var proposalY = 0f;
            for (var index = 0; index < proposals.Length; index++)
            {
                DrawStrategyProposal(board, proposals[index], proposalY, viewport.width - 24f);
                proposalY += StrategyProposalHeight(proposals[index]) + 10f;
            }
            GUI.EndScrollView();
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawMeaningOverlay()
        {
            if (!meaningOpen || view.location == "dungeon") return;
            var meaning = view.villageMeaning;
            if (meaning == null) return;
            GUI.color = new Color(0.01f, 0.015f, 0.01f, 0.78f);
            GUI.DrawTexture(new Rect(0f, 0f, Screen.width, Screen.height),
                Texture2D.whiteTexture);
            GUI.color = Color.white;
            var width = Mathf.Min(1120f, Screen.width - 36f);
            var height = Mathf.Min(760f, Screen.height - 74f);
            var panel = new Rect((Screen.width - width) * 0.5f, 38f, width, height);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 12f, 560f, 28f),
                "STONEBRIDGE TOWN LOGIC", titleStyle);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 42f, width - 210f, 20f),
                $"{meaning.status.ToUpperInvariant()}  ·  {meaning.summary}",
                meaning.passed ? bodyStyle : dangerStyle);
            var town = meaning.town;
            GUI.Label(new Rect(panel.x + 18f, panel.y + 64f, width - 210f, 20f),
                $"WHY HERE  {town?.foundingCause}  ·  LEADER {town?.leaderName ?? "unassigned"}  ·  " +
                $"HOUSED {town?.housedResidents ?? 0}/{town?.population ?? 0}  ·  STORAGE OVERFLOW {town?.storageOverflow ?? 0}",
                subtleStyle);
            var gaps = meaning.gaps ?? Array.Empty<string>();
            GUI.Label(new Rect(panel.x + 18f, panel.y + 86f, width - 210f, 38f),
                gaps.Length == 0 ? "OPEN GAPS  none" : $"OPEN GAPS  {Readable(string.Join("  ·  ", gaps))}",
                gaps.Length == 0 ? healingStyle : treasureStyle);
            if (GUI.Button(new Rect(panel.xMax - 158f, panel.y + 10f, 140f, 30f),
                "Return [M / Esc]")) meaningOpen = false;
            DrawMeaningReceipts(panel, meaning);
        }

        private void DrawMeaningReceipts(Rect panel, VillageMeaningView meaning)
        {
            var residents = meaning.residents ?? Array.Empty<ResidentMeaningReceiptView>();
            var buildings = meaning.buildings ?? Array.Empty<BuildingMeaningReceiptView>();
            var viewport = new Rect(panel.x + 14f, panel.y + 132f,
                panel.width - 28f, panel.height - 146f);
            var rows = Mathf.Max(residents.Length, buildings.Length);
            var contentHeight = Mathf.Max(viewport.height, 34f + rows * 136f);
            meaningScroll = GUI.BeginScrollView(viewport, meaningScroll,
                new Rect(0f, 0f, viewport.width - 18f, contentHeight));
            var columnWidth = (viewport.width - 42f) * 0.5f;
            GUI.Label(new Rect(8f, 2f, columnWidth, 24f),
                $"RESIDENT MEANING · {residents.Length}", headingStyle);
            GUI.Label(new Rect(columnWidth + 26f, 2f, columnWidth, 24f),
                $"BUILDING MEANING · {buildings.Length}", headingStyle);
            for (var index = 0; index < residents.Length; index++)
                DrawResidentMeaningCard(residents[index], 8f,
                    30f + index * 136f, columnWidth);
            for (var index = 0; index < buildings.Length; index++)
                DrawBuildingMeaningCard(buildings[index], columnWidth + 26f,
                    30f + index * 136f, columnWidth);
            GUI.EndScrollView();
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawResidentMeaningCard(ResidentMeaningReceiptView resident,
            float x, float y, float width)
        {
            GUI.color = new Color(0.055f, 0.072f, 0.055f, 0.98f);
            GUI.Box(new Rect(x, y, width, 128f), GUIContent.none);
            GUI.color = Color.white;
            GUI.Label(new Rect(x + 10f, y + 8f, width - 20f, 22f),
                $"{resident.name}  ·  {Readable(resident.primaryRole)}", headingStyle);
            GUI.Label(new Rect(x + 10f, y + 31f, width - 20f, 18f),
                $"HOUSEHOLD  {resident.householdName ?? "unassigned"}  ·  " +
                $"HOME  {Readable(resident.housingStatus)}", subtleStyle);
            var purpose = resident.purpose?.jobType ?? resident.purpose?.action ??
                resident.purpose?.status ?? "available";
            GUI.Label(new Rect(x + 10f, y + 51f, width - 20f, 18f),
                $"NOW  {Readable(purpose)}  ·  WHY  {Readable(resident.purpose?.reason)}",
                bodyStyle);
            GUI.Label(new Rect(x + 10f, y + 72f, width - 20f, 46f),
                $"CONSEQUENCE  {resident.consequence}", detailStyle);
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawBuildingMeaningCard(BuildingMeaningReceiptView building,
            float x, float y, float width)
        {
            GUI.color = new Color(0.065f, 0.065f, 0.052f, 0.98f);
            GUI.Box(new Rect(x, y, width, 128f), GUIContent.none);
            GUI.color = Color.white;
            GUI.Label(new Rect(x + 10f, y + 8f, width - 20f, 22f),
                $"{building.name}  ·  {Readable(building.status)}", headingStyle);
            GUI.Label(new Rect(x + 10f, y + 31f, width - 20f, 38f),
                $"CAUSE  {building.cause}", detailStyle);
            var district = string.IsNullOrEmpty(building.districtKey)
                ? "master plan pending" : Readable(building.districtKey);
            GUI.Label(new Rect(x + 10f, y + 70f, width - 20f, 18f),
                $"DISTRICT  {district}  ·  OPERATORS {building.operatorActorIds?.Length ?? 0}",
                subtleStyle);
            GUI.Label(new Rect(x + 10f, y + 90f, width - 20f, 30f),
                $"CONSEQUENCE  {building.consequence}", detailStyle);
        }

        private static float StrategyProposalHeight(VillageProposalView proposal) =>
            proposal.proposalKind == "specialist" ? 430f : 248f;

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawStrategyProposal(VillageStrategyBoardView board,
            VillageProposalView proposal, float y, float width)
        {
            var specialist = proposal.proposalKind == "specialist";
            var cardHeight = StrategyProposalHeight(proposal);
            var bounds = new Rect(2f, y + 2f, width - 4f, cardHeight - 8f);
            GUI.color = proposal.status == "approved"
                ? new Color(0.08f, 0.14f, 0.07f, 0.98f)
                : new Color(0.055f, 0.065f, 0.052f, 0.98f);
            GUI.Box(bounds, GUIContent.none);
            GUI.color = Color.white;
            GUI.Label(new Rect(16f, y + 12f, 470f, 22f), proposal.name, headingStyle);
            GUI.Label(new Rect(width - 168f, y + 12f, 150f, 22f),
                proposal.status.ToUpperInvariant(),
                proposal.status == "rejected" ? dangerStyle : subtleStyle);
            var proposalType = specialist
                ? $"SPECIALIST · {Readable(proposal.requesterPersonKey)} · REVISION {proposal.revision}"
                : "FOUNDING PRIORITY";
            GUI.Label(new Rect(16f, y + 36f, width - 210f, 18f), proposalType, subtleStyle);
            GUI.Label(new Rect(16f, y + 58f, width - 210f, 34f), proposal.reason, detailStyle);
            if (specialist)
            {
                GUI.Label(new Rect(16f, y + 94f, width - 32f, 34f),
                    $"DEMAND  {proposal.demand?.summary}", detailStyle);
                GUI.Label(new Rect(16f, y + 130f, width - 32f, 68f),
                    RequirementsText(proposal.requirements), detailStyle);
            }
            var requestY = specialist ? y + 204f : y + 94f;
            var detailY = specialist ? y + 230f : y + 120f;
            GUI.Label(new Rect(16f, requestY, 420f, 18f),
                $"REQUEST  {BudgetText(proposal.requestedBudget)}", subtleStyle);

            var commission = Array.Find(board.commissions ?? Array.Empty<VillageCommissionView>(),
                item => item.id == proposal.commissionId);
            if (commission == null)
            {
                GUI.Label(new Rect(16f, detailY, 390f, 18f),
                    ProposalDecisionState(proposal), subtleStyle);
                DrawProposalDecisionButtons(proposal, detailY + 24f, width);
                return;
            }

            var foreman = commission.assignments?.foreman?.actorName ?? "Unassigned";
            var operatorName = commission.assignments?.@operator?.actorName ?? "Unassigned";
            var architectName = commission.assignments?.architect?.actorName ??
                commission.planning?.architectName ?? "Unassigned";
            var crew = commission.assignments?.crewActorIds?.Length ?? 0;
            GUI.Label(new Rect(16f, detailY, width - 190f, 20f),
                $"COMMISSION  {commission.status.ToUpperInvariant()}  ·  Foreman {foreman}  ·  Operator {operatorName}  ·  Crew {crew}", bodyStyle);
            GUI.Label(new Rect(16f, detailY + 24f, width - 190f, 18f),
                $"BUDGET  {BudgetUsageText(commission)}", subtleStyle);
            GUI.Label(new Rect(16f, detailY + 47f, width - 190f, 18f),
                proposal.proposalKind == "specialist"
                    ? $"ARCHITECT  {architectName}  ·  {Readable(commission.planning?.status)}"
                    : ForemanReviewText(commission), subtleStyle);
            GUI.Label(new Rect(16f, detailY + 69f, width - 190f, 18f),
                $"PLAN  {Readable(commission.planning?.status)}", subtleStyle);
            if (specialist)
                DrawArchitectPlan(commission, detailY + 91f, width);
            var suspended = commission.status == "suspended";
            if (GUI.Button(new Rect(width - 174f, detailY + 20f, 150f, 32f),
                suspended ? "Resume commission" : "Suspend commission"))
                SendIntent(new MoveIntent {
                    kind = "set_village_commission_status",
                    commissionId = commission.id,
                    status = suspended ? "active" : "suspended",
                    reason = suspended
                        ? "The player council resumed the work."
                        : "The player council suspended the work."
                });
        }

        // function-length-exempt: template -- immediate-mode UI composition
        private void DrawArchitectPlan(VillageCommissionView commission, float y, float width)
        {
            var plans = view.villageDevelopment?.architectPlans ??
                Array.Empty<VillageArchitectPlanView>();
            var plan = Array.Find(plans, candidate => candidate.id == commission.planning?.planId);
            if (plan == null)
            {
                GUI.Label(new Rect(16f, y, width - 32f, 18f),
                    "No blueprint exists; the architect must finish surveying first.", subtleStyle);
                return;
            }
            if (plan.status != "awaiting_approval")
            {
                var selected = Array.Find(plan.alternatives ??
                    Array.Empty<VillageArchitectAlternativeView>(),
                    candidate => candidate.id == plan.selectedAlternativeId);
                GUI.Label(new Rect(16f, y, width - 32f, 18f),
                    selected == null
                        ? $"ARCHITECT PLAN  Revision {plan.revision} · {Readable(plan.status)}"
                        : $"SELECTED SITE  {selected.site.x},{selected.site.y} · " +
                          $"{selected.billOfMaterials.lumber} lumber · " +
                          $"{selected.billOfMaterials.laborUnits:0} labor",
                    subtleStyle);
                return;
            }
            GUI.Label(new Rect(16f, y, width - 32f, 18f),
                "SURVEYED ALTERNATIVES — choose one before builders receive a blueprint", subtleStyle);
            var alternatives = plan.alternatives ?? Array.Empty<VillageArchitectAlternativeView>();
            for (var index = 0; index < alternatives.Length && index < 3; index++)
            {
                var option = alternatives[index];
                var optionY = y + 22f + index * 30f;
                GUI.Label(new Rect(24f, optionY, width - 190f, 24f),
                    $"#{option.rank}  SITE {option.site.x},{option.site.y} · score {option.score} · " +
                    $"{option.billOfMaterials.lumber} lumber / {option.billOfMaterials.laborUnits:0} labor",
                    option.id == plan.recommendedAlternativeId ? bodyStyle : subtleStyle);
                if (GUI.Button(new Rect(width - 142f, optionY - 2f, 118f, 26f),
                    option.id == plan.recommendedAlternativeId ? "Approve best" : "Approve site"))
                    SendIntent(new MoveIntent {
                        kind = "decide_architect_plan",
                        planId = plan.id,
                        alternativeId = option.id,
                        outcome = "approved",
                        reason = "The reeve approved this surveyed site and bill of materials."
                    });
            }
            if (GUI.Button(new Rect(width - 194f, y + 116f, 170f, 28f),
                "Request new survey"))
                SendIntent(new MoveIntent {
                    kind = "decide_architect_plan",
                    planId = plan.id,
                    outcome = "revision_requested",
                    reason = "The council requested revised siting alternatives."
                });
        }

        private void DrawProposalDecisionButtons(VillageProposalView proposal, float buttonY, float width)
        {
            if (proposal.proposalKind == "specialist" &&
                (proposal.status == "deferred" || proposal.status == "rejected" ||
                 proposal.status == "revision_requested"))
            {
                if (GUI.Button(new Rect(width - 194f, buttonY, 170f, 30f),
                    "Revise & resubmit"))
                    SendIntent(new MoveIntent {
                        kind = "revise_village_proposal",
                        proposalId = proposal.id,
                        reason = "The specialist revised the request in response to the council decision."
                    });
                return;
            }
            var x = width - 366f;
            if (proposal.status != "approved" &&
                GUI.Button(new Rect(x, buttonY, 82f, 30f), "Approve"))
                DecideProposal(proposal, "approved", "The reeve authorized this village priority.");
            if (proposal.status != "deferred" &&
                GUI.Button(new Rect(x + 86f, buttonY, 82f, 30f), "Defer"))
                DecideProposal(proposal, "deferred", "The council deferred this proposal until higher priorities are secure.");
            if (proposal.proposalKind == "specialist" &&
                GUI.Button(new Rect(x + 172f, buttonY, 82f, 30f), "Revise"))
                DecideProposal(proposal, "revision_requested", "The council requested a revised specialist submission.");
            if (proposal.status != "rejected" &&
                GUI.Button(new Rect(x + 258f, buttonY, 82f, 30f), "Reject"))
                DecideProposal(proposal, "rejected", "The council rejected this proposal in its current form.");
        }

        private static string ProposalDecisionState(VillageProposalView proposal)
        {
            if (proposal.status == "revision_requested")
                return "The council requested revision before authorization.";
            if (proposal.status == "deferred")
                return "Deferred; the demonstrated demand remains on record.";
            if (proposal.status == "rejected")
                return "Rejected in this form; the specialist may revise and resubmit.";
            return "Awaiting the reeve's decision";
        }

        private static string RequirementsText(VillageFacilityRequirementsView requirements)
        {
            if (requirements == null) return "";
            string List(string[] values) => values == null ? "none" : string.Join(", ", values);
            return $"REQUIREMENTS  Rooms: {List(requirements.rooms)} · Fixtures: {List(requirements.fixtures)} · " +
                $"Storage: {List(requirements.storage)} · Utilities: {List(requirements.utilities)} · " +
                $"Access: {List(requirements.access)} · Safety: {List(requirements.safety)} · " +
                $"Inputs: {List(requirements.inputs)} · Outputs: {List(requirements.outputs)} · " +
                $"Staffing: {List(requirements.staffing)}";
        }

        private void DecideProposal(VillageProposalView proposal, string outcome, string reason) =>
            SendIntent(new MoveIntent {
                kind = "decide_village_proposal",
                proposalId = proposal.id,
                outcome = outcome,
                reason = reason
            });

        private static string BudgetText(VillageBudgetView budget) => budget == null
            ? "No budget submitted"
            : $"{budget.materials?.lumber ?? 0} lumber · {budget.laborUnits:0.#} labor";

        private static string BudgetUsageText(VillageCommissionView commission)
        {
            if (commission.budgetUsage == null) return BudgetText(commission.budget);
            if (commission.budgetUsage.status == "legacy_untracked")
                return "Historical usage unavailable for this migrated commission";
            return $"{commission.budgetUsage.materials?.lumber ?? 0}/{commission.budget?.materials?.lumber ?? 0} lumber · " +
                $"{commission.budgetUsage.laborUnits:0.#}/{commission.budget?.laborUnits ?? 0:0.#} labor · " +
                Readable(commission.budgetUsage.status);
        }

        private static string ForemanReviewText(VillageCommissionView commission)
        {
            var review = commission.foremanReview;
            return review == null
                ? "FOREMAN  First worksite review pending"
                : $"FOREMAN  {review.foremanName} reviewed {review.completedElements}/{review.totalElements} elements · {review.blockedElements} waiting on material";
        }

        private void DrawShopOverlay()
        {
            if (!shopOpen || view.location == "dungeon" || view.shop == null) return;
            var goods = view.shop.goods ?? Array.Empty<ShopGoodView>();
            var panel = new Rect(Screen.width - 402f, 68f, 390f, Mathf.Max(150f, 84f + goods.Length * 42f));
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 300f, 24f), view.shop.name, headingStyle);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 34f, 300f, 20f), $"Staffed by {view.shop.keeper}", subtleStyle);
            if (GUI.Button(new Rect(panel.x + 348f, panel.y + 8f, 28f, 24f), "×")) shopOpen = false;
            for (var index = 0; index < goods.Length; index++)
            {
                var good = goods[index];
                var y = panel.y + 64f + index * 42f;
                GUI.Label(new Rect(panel.x + 14f, y, 220f, 20f), $"{good.name}  ×{good.quantity}", bodyStyle);
                GUI.Label(new Rect(panel.x + 14f, y + 19f, 120f, 18f), $"{good.priceCp} CP", subtleStyle);
                GUI.enabled = view.hero.goldCp >= good.priceCp;
                if (GUI.Button(new Rect(panel.x + 292f, y + 4f, 80f, 28f), "Buy"))
                    SendIntent(new MoveIntent { kind = "shop_buy", actorId = view.hero.id, itemKind = good.itemKind });
                GUI.enabled = true;
            }
        }

        private string[] NearbyActions()
        {
            var priority = new[] { "talk", "read", "open", "collect", "breach", "harvest", "dig", "use", "examine" };
            return Array.FindAll(priority, action => VillageCellForAction(action) != null);
        }

        private static string VillageActionLabel(string action) => action switch
        {
            "breach" => "Breach [B]",
            "talk" => "Talk [T]",
            "examine" => "Examine [X]",
            "read" => "Read [E]",
            "use" => "Use [U]",
            _ => Readable(action)
        };

        private CellView VillageCellForAction(string action)
        {
            var chosen = SelectedCell();
            if (chosen?.actions != null && Array.IndexOf(chosen.actions, action) >= 0) return chosen;
            return Array.Find(view.map.cells, cell =>
                cell.actions != null && Array.IndexOf(cell.actions, action) >= 0);
        }

        private void InteractWithAction(string action)
        {
            var cell = VillageCellForAction(action);
            if (cell == null || string.IsNullOrEmpty(cell.objectId)) return;
            SendIntent(new MoveIntent
            {
                kind = "world_interact", action = action, objectId = cell.objectId,
                x = cell.x, y = cell.y
            });
        }

        private void DrawDungeonCommands(Rect panel)
        {
            var x = panel.x + 322f;
            if (Can("death_save"))
            {
                CommandButton(ref x, panel, "Death Save [V]", "death_save", () => SendIntent(new MoveIntent { kind = "death_save" }));
                return;
            }
            if (SelectedDoorIsAdjacent())
                CommandButton(ref x, panel, "Open", "open", OpenSelectedDoor);
            if (selected.HasValue)
                CommandButton(ref x, panel, "Examine [X]", "examine", ExamineSelected);
            if (!string.IsNullOrEmpty(SelectedTargetId()))
                CommandButton(ref x, panel, "Shoot [R]", "ranged_attack", () => AttackSelected("ranged_attack"));
            CommandButton(ref x, panel, "Search [Q]", "search", () => SendIntent(new MoveIntent { kind = "search" }));
            CommandButton(ref x, panel, "Wait", "wait", () => SendIntent(new MoveIntent { kind = "wait" }));
            CommandButton(ref x, panel, "Potion [H]", "use_item", UseFirstPotion);
            CommandButton(ref x, panel, "Power [P]", "class_power", UseClassPower);
            CommandButton(ref x, panel, "Rest", "short_rest", () => SendIntent(new MoveIntent { kind = "short_rest" }));
            CommandButton(ref x, panel, "Ascend", "stairs_up", () => SendIntent(new MoveIntent { kind = "stairs_up" }));
            CommandButton(ref x, panel, "Descend", "stairs", () => SendIntent(new MoveIntent { kind = "stairs" }));
            if (GUI.Button(new Rect(x, panel.y + 7f, 76f, 28f), "Items [I]")) inventoryOpen = !inventoryOpen;
            x += 80f;
            if (GUI.Button(new Rect(x, panel.y + 7f, 76f, 28f), "Party [C]")) ToggleGroupManagement();
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

        private void ExamineSelected()
        {
            if (selected.HasValue) StartCoroutine(DungeonAction("examine", selected.Value));
        }

        private void DrawInventoryOverlay()
        {
            if (!inventoryOpen || view.location != "dungeon") return;
            var owner = CurrentInventoryOwner();
            if (owner == null) return;
            var items = owner.items ?? Array.Empty<InventoryItemView>();
            var panel = new Rect(Screen.width - 402f, 68f, 390f, 460f);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 260f, 24f), "INVENTORY & EQUIPMENT", headingStyle);
            if (GUI.Button(new Rect(panel.x + 348f, panel.y + 8f, 28f, 24f), "×")) inventoryOpen = false;
            DrawInventoryOwners(panel);
            var viewport = new Rect(panel.x + 10f, panel.y + 72f, panel.width - 20f, panel.height - 82f);
            var content = new Rect(0f, 0f, viewport.width - 18f, Mathf.Max(viewport.height, items.Length * 42f));
            inventoryScroll = GUI.BeginScrollView(viewport, inventoryScroll, content);
            for (var index = 0; index < items.Length; index++)
                DrawInventoryItem(owner, items[index], index);
            GUI.EndScrollView();
        }

        private InventoryOwnerView CurrentInventoryOwner()
        {
            var owners = view.inventories ?? Array.Empty<InventoryOwnerView>();
            var owner = Array.Find(owners, entry => entry.actorId == inventoryActorId);
            return owner ?? Array.Find(owners, entry => entry.actorId == view.hero.id);
        }

        private void DrawInventoryOwners(Rect panel)
        {
            var owners = view.inventories ?? Array.Empty<InventoryOwnerView>();
            var x = panel.x + 12f;
            foreach (var owner in owners)
            {
                var label = owner.actorName.Split(' ')[0];
                if (GUI.Button(new Rect(x, panel.y + 38f, 82f, 26f), label))
                {
                    inventoryActorId = owner.actorId;
                    inventoryScroll = Vector2.zero;
                }
                x += 86f;
            }
        }

        private void DrawInventoryItem(InventoryOwnerView owner, InventoryItemView item, int index)
        {
            var y = 8f + index * 42f;
            var count = item.charges > 0 ? $" · {item.charges} charges" : item.quantity > 1 ? $" · ×{item.quantity}" : "";
            var state = item.equipped ? " · EQUIPPED" : count;
            GUI.Label(new Rect(4f, y, 190f, 20f), item.name + state, bodyStyle);
            var x = 198f;
            if (Can("equip") && item.itemType == "equipment" && !item.equipped)
                ItemButton(ref x, y, "Equip", () => SendIntent(new MoveIntent { kind = "equip", actorId = owner.actorId, itemId = item.id }));
            if (Can("unequip") && item.equipped && item.slot == "offhand")
                ItemButton(ref x, y, "Remove", () => SendIntent(new MoveIntent { kind = "unequip", actorId = owner.actorId, slot = "offhand" }));
            if (Can("use_item") && owner.actorId == view.hero.id && item.kind == "healing_potion")
                ItemButton(ref x, y, "Use", () => SendIntent(new MoveIntent { kind = "use_item", itemId = item.id }));
            if (Can("invoke_item") && owner.actorId == view.hero.id && item.invokable)
                ItemButton(ref x, y, "Invoke", () => SendIntent(new MoveIntent { kind = "invoke_item", itemId = item.id, targetId = SelectedTargetId() }));
            if (Can("throw_item") && owner.actorId == view.hero.id && item.throwable)
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
            var members = view.partyMembers ?? Array.Empty<PartyMemberView>();
            if (!partyOpen || members.Length == 0) return;
            var width = Mathf.Min(940f, Screen.width - 40f);
            var height = Mathf.Min(620f, Screen.height - 110f);
            var panel = new Rect((Screen.width - width) * 0.5f, 68f, width, height);
            DrawPanel(panel);
            var member = PartyMemberById(members, partyActorId);
            var heading = member == null ? "GROUP MANAGEMENT" : $"PARTY · {members.Length} MEMBERS";
            GUI.Label(new Rect(panel.x + 14f, panel.y + 10f, 260f, 24f), heading, headingStyle);
            if (member != null) DrawMemberNavigation(panel);
            DrawPartyRoster(panel, members);
            if (member == null) DrawGroupManagement(panel, members);
            else DrawPartyContent(panel, member);
        }

        private void DrawMemberNavigation(Rect panel)
        {
            if (GUI.Button(new Rect(panel.x + 232f, panel.y + 8f, 130f, 28f), "← Manage Group"))
            {
                partyActorId = null;
                partyContentScroll = Vector2.zero;
                return;
            }
            DrawPartyTabs(panel);
        }

        private void DrawPartyTabs(Rect panel)
        {
            var labels = new[] { "[1] Overview", "[2] Activities", "[3] Combat", "[4] Skills" };
            var x = panel.x + 232f;
            for (var index = 0; index < labels.Length; index++)
            {
                GUI.enabled = partyTab != index;
                var label = partyTab == index ? $"● {labels[index]}" : labels[index];
                if (GUI.Button(new Rect(x, panel.y + 38f, 112f, 29f), label))
                {
                    partyTab = index;
                    partyContentScroll = Vector2.zero;
                }
                GUI.enabled = true;
                x += 116f;
            }
        }

        private static PartyMemberView PartyMemberById(PartyMemberView[] members, string actorId) =>
            string.IsNullOrEmpty(actorId) ? null : Array.Find(members, member => member.id == actorId);

        private void DrawPartyRoster(Rect panel, PartyMemberView[] members)
        {
            var viewport = new Rect(panel.x + 12f, panel.y + 72f, 208f, panel.height - 84f);
            var content = new Rect(0f, 0f, 190f, Mathf.Max(viewport.height, members.Length * 58f));
            partyRosterScroll = GUI.BeginScrollView(viewport, partyRosterScroll, content);
            for (var index = 0; index < members.Length; index++)
            {
                var member = members[index];
                if (GUI.Button(new Rect(0f, index * 58f, 186f, 52f), $"{member.name}\n{Readable(member.className)} · {member.hp}/{member.maxHp} HP"))
                {
                    partyActorId = member.id;
                    partyContentScroll = Vector2.zero;
                }
            }
            GUI.EndScrollView();
        }

        private void DrawGroupManagement(Rect panel, PartyMemberView[] members)
        {
            var viewport = new Rect(panel.x + 232f, panel.y + 52f, panel.width - 244f, panel.height - 64f);
            var content = new Rect(0f, 0f, viewport.width - 18f, 510f);
            partyContentScroll = GUI.BeginScrollView(viewport, partyContentScroll, content);
            DrawGroupStatus(members);
            if (view.location == "dungeon") DrawGroupTactics();
            else DrawGroupTownPolicy();
            DrawGroupRosterSummary(members);
            GUI.EndScrollView();
        }

        private void DrawGroupStatus(PartyMemberView[] members)
        {
            var ready = 0;
            var wounded = 0;
            foreach (var member in members)
            {
                if (member.hp > 0) ready += 1;
                if (member.hp > 0 && member.hp < member.maxHp) wounded += 1;
            }
            GUI.Label(new Rect(4f, 4f, 520f, 28f), "The Adventuring Group", titleStyle);
            GUI.Label(new Rect(4f, 38f, 620f, 20f), $"{members.Length} members · {ready} ready · {wounded} wounded · {members.Length - ready} down", bodyStyle);
            GUI.Label(new Rect(4f, 64f, 620f, 18f), "Choose a member from the roster for individual activities, combat role, skills, or character sheet.", subtleStyle);
        }

        private void DrawGroupTownPolicy()
        {
            GUI.Label(new Rect(4f, 106f, 620f, 20f), "GROUP MOVEMENT", headingStyle);
            GUI.Label(new Rect(4f, 132f, 360f, 20f), $"Current: {Readable(view.partyMovement)}", bodyStyle);
            var movement = view.regrouping ? "Regrouping…" : view.partyMovement == "dispersed" ? "Regroup" : "Disperse";
            GUI.enabled = !view.regrouping;
            if (GUI.Button(new Rect(390f, 124f, 140f, 30f), movement)) TogglePartyMovement();
            GUI.enabled = true;
            GUI.Label(new Rect(4f, 178f, 620f, 20f), "SHARED SPENDING POLICY", headingStyle);
            GUI.Label(new Rect(4f, 204f, 360f, 20f), SpendingLabel(), bodyStyle);
            if (GUI.Button(new Rect(390f, 196f, 140f, 30f), "Change Policy")) CycleSpendingPolicy();
        }

        private void DrawGroupTactics()
        {
            var order = view.partyOrder;
            if (order == null) return;
            GUI.Label(new Rect(4f, 106f, 620f, 20f), $"TACTICAL ORDER · {Readable(order.objective)} · {Readable(order.formation)}", headingStyle);
            var objectives = string.IsNullOrEmpty(SelectedTargetId())
                ? new[] { "explore", "hold", "advance", "retreat" }
                : new[] { "explore", "hold", "advance", "retreat", "focus" };
            DrawOrderRow(new Rect(-10f, 0f, 650f, 0f), 136f, "Objective", objectives, true);
            DrawOrderRow(new Rect(-10f, 0f, 650f, 0f), 188f, "Formation", new[] { "column", "line", "wedge", "scatter" }, false);
        }

        private void DrawGroupRosterSummary(PartyMemberView[] members)
        {
            var y = view.location == "dungeon" ? 260f : 258f;
            GUI.Label(new Rect(4f, y, 620f, 20f), "ROLES & PRIORITIES", headingStyle);
            for (var index = 0; index < members.Length; index++)
            {
                var member = members[index];
                GUI.Label(new Rect(4f, y + 30f + index * 26f, 600f, 20f),
                    $"{member.name} · {Readable(member.combatRole)} · {Readable(member.jobFocus)} ({member.workPriority})", bodyStyle);
            }
        }

        private void DrawPartyContent(Rect panel, PartyMemberView member)
        {
            var viewport = new Rect(panel.x + 232f, panel.y + 72f, panel.width - 244f, panel.height - 84f);
            var content = new Rect(0f, 0f, viewport.width - 18f, partyTab is 1 or 3 ? 720f : 510f);
            partyContentScroll = GUI.BeginScrollView(viewport, partyContentScroll, content);
            GUI.Label(new Rect(4f, 4f, 420f, 26f), member.name, titleStyle);
            GUI.Label(new Rect(4f, 32f, 480f, 20f), $"Level {member.level} {Readable(member.className)} · {member.hp}/{member.maxHp} HP", bodyStyle);
            if (partyTab == 0) DrawPartyOverview(member);
            else if (partyTab == 1) DrawPartyActivities(member);
            else if (partyTab == 2) DrawPartyCombat(member);
            else DrawPartySkills(member);
            GUI.EndScrollView();
        }

        private void DrawPartyOverview(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 70f, 560f, 20f), $"AC {member.ac}  ·  Attack +{member.attackBonus}  ·  Damage {member.damage}  ·  Range {member.attackRange}", bodyStyle);
            GUI.Label(new Rect(4f, 100f, 560f, 20f), $"Combat: {Readable(member.combatRole)}  ·  Highest activity: {Readable(member.jobFocus)} ({member.workPriority})", bodyStyle);
            if (member.equipment != null)
                GUI.Label(new Rect(4f, 138f, 620f, 44f), $"Weapon: {member.equipment.weapon}  ·  Armor: {member.equipment.armor}\nOff hand: {member.equipment.offhand}", subtleStyle);
            if (GUI.Button(new Rect(4f, 198f, 190f, 30f), "Character Sheet [Enter]"))
            {
                characterSheetOpen = true;
                characterScroll = Vector2.zero;
            }
        }

        private void DrawPartyActivities(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 70f, 620f, 20f), "Set what this character should spend time doing.", bodyStyle);
            var current = string.IsNullOrEmpty(member.currentJob) ? "No active assignment" : $"{member.currentJob} · {Readable(member.currentJobStatus)}";
            GUI.Label(new Rect(4f, 96f, 620f, 20f), current, subtleStyle);
            var activities = member.activities ?? Array.Empty<ActivityPriorityView>();
            for (var index = 0; index < activities.Length; index++)
                DrawPartyActivity(member, activities[index], index);
        }

        private void DrawPartyActivity(PartyMemberView member, ActivityPriorityView activity, int index)
        {
            var y = 132f + index * 72f;
            var skills = activity.skillNames?.Length > 0 ? string.Join(", ", activity.skillNames) : "No direct skill practice";
            GUI.Label(new Rect(4f, y, 410f, 20f), activity.name, activity.available ? bodyStyle : subtleStyle);
            GUI.Label(new Rect(4f, y + 21f, 430f, 18f), activity.available ? $"Exercises: {skills}" : $"Requires: {Readable(activity.requirement)}", subtleStyle);
            GUI.Label(new Rect(454f, y + 8f, 72f, 20f), $"{activity.priority}", bodyStyle);
            GUI.enabled = activity.available;
            if (GUI.Button(new Rect(530f, y + 3f, 34f, 28f), "−")) ConfigureActivity(member, activity, -10);
            if (GUI.Button(new Rect(570f, y + 3f, 34f, 28f), "+")) ConfigureActivity(member, activity, 10);
            GUI.enabled = true;
        }

        private void DrawPartyCombat(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 70f, 620f, 20f), $"Fighting role: {Readable(member.combatRole)}", bodyStyle);
            var roles = member.id == view.hero.id
                ? new[] { "leader" }
                : Array.FindAll(view.combatRoles ?? Array.Empty<string>(), role => role != "leader");
            DrawChoiceButtons(roles, 4f, 104f, value => ConfigureMember(member, combatRole: value));
            if (view.partyOrder == null) return;
            GUI.Label(new Rect(4f, 210f, 620f, 20f), $"Party order: {Readable(view.partyOrder.objective)} · {Readable(view.partyOrder.formation)}", headingStyle);
            var objectives = string.IsNullOrEmpty(SelectedTargetId())
                ? new[] { "explore", "hold", "advance", "retreat" }
                : new[] { "explore", "hold", "advance", "retreat", "focus" };
            DrawOrderRow(new Rect(0f, 0f, 650f, 0f), 242f, "Objective", objectives, true);
            DrawOrderRow(new Rect(0f, 0f, 650f, 0f), 294f, "Formation", new[] { "column", "line", "wedge", "scatter" }, false);
        }

        private void DrawPartySkills(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 70f, 620f, 20f), "Skills improve through completed work, exploration, combat, and facility activities.", bodyStyle);
            var skills = member.skills ?? Array.Empty<SkillView>();
            for (var index = 0; index < skills.Length; index++)
            {
                var skill = skills[index];
                var y = 102f + index * 44f;
                GUI.Label(new Rect(4f, y, 310f, 20f), $"{skill.name} · Rank {skill.rank}", bodyStyle);
                GUI.Label(new Rect(4f, y + 19f, 310f, 18f), $"{skill.ability.ToUpperInvariant()} · {skill.practice}/{skill.practiceTarget} practice", subtleStyle);
            }
        }

        private void ConfigureActivity(PartyMemberView member, ActivityPriorityView activity, int change)
        {
            ConfigureMember(member, jobFocus: activity.jobType, workPriority: Mathf.Clamp(activity.priority + change, 0, 100));
        }

        private static void DrawChoiceButtons(string[] choices, float startX, float startY, Action<string> action)
        {
            var values = choices ?? Array.Empty<string>();
            for (var index = 0; index < values.Length; index++)
            {
                var x = startX + index % 4 * 142f;
                var y = startY + index / 4 * 34f;
                if (GUI.Button(new Rect(x, y, 136f, 28f), Readable(values[index]))) action(values[index]);
            }
        }

        private void ConfigureMember(PartyMemberView member, string combatRole = null, string jobFocus = null, int? workPriority = null)
        {
            SendIntent(new MoveIntent {
                kind = "configure_party_member", actorId = member.id,
                combatRole = combatRole ?? member.combatRole,
                jobFocus = jobFocus ?? member.jobFocus,
                workPriority = workPriority ?? member.workPriority
            });
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

        private void DrawCharacterSheet()
        {
            if (!characterSheetOpen) return;
            var members = view.partyMembers ?? Array.Empty<PartyMemberView>();
            if (members.Length == 0) return;
            var member = PartyMemberById(members, partyActorId);
            if (member == null) return;
            var width = Mathf.Min(760f, Screen.width - 48f);
            var height = Mathf.Min(650f, Screen.height - 96f);
            var panel = new Rect((Screen.width - width) * 0.5f, 48f, width, height);
            DrawPanel(panel);
            GUI.Label(new Rect(panel.x + 18f, panel.y + 12f, 560f, 28f), $"{member.name} · CHARACTER SHEET", titleStyle);
            var viewport = new Rect(panel.x + 16f, panel.y + 48f, panel.width - 32f, panel.height - 62f);
            var content = new Rect(0f, 0f, viewport.width - 18f, 820f);
            characterScroll = GUI.BeginScrollView(viewport, characterScroll, content);
            DrawCharacterSummary(member);
            DrawCharacterAbilities(member);
            DrawCharacterSkills(member);
            GUI.EndScrollView();
        }

        private void DrawCharacterSummary(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 4f, 620f, 22f), $"Level {member.level} {Readable(member.className)}  ·  {Readable(member.combatRole)}", headingStyle);
            GUI.Label(new Rect(4f, 34f, 620f, 22f), $"HP {member.hp}/{member.maxHp}  ·  AC {member.ac}  ·  Attack +{member.attackBonus}  ·  {member.damage}", bodyStyle);
            if (member.equipment != null)
                GUI.Label(new Rect(4f, 64f, 660f, 42f), $"Weapon: {member.equipment.weapon}  ·  Armor: {member.equipment.armor}\nOff hand: {member.equipment.offhand}", bodyStyle);
            GUI.Label(new Rect(4f, 112f, 660f, 22f), $"Highest activity priority: {Readable(member.jobFocus)} ({member.workPriority})", subtleStyle);
        }

        private void DrawCharacterAbilities(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 154f, 300f, 20f), "ABILITIES", headingStyle);
            var abilities = member.abilities ?? Array.Empty<AbilityView>();
            for (var index = 0; index < abilities.Length; index++)
            {
                var ability = abilities[index];
                var modifier = ability.modifier >= 0 ? $"+{ability.modifier}" : ability.modifier.ToString();
                GUI.Label(new Rect(4f + index % 3 * 170f, 182f + index / 3 * 28f, 160f, 22f), $"{ability.key.ToUpperInvariant()}  {ability.score} ({modifier})", bodyStyle);
            }
            var needs = member.needs ?? Array.Empty<NeedView>();
            if (needs.Length > 0)
                GUI.Label(new Rect(4f, 248f, 680f, 22f), "Needs: " + string.Join("  ·  ", Array.ConvertAll(needs, need => $"{Readable(need.key)} {need.value}")), subtleStyle);
        }

        private void DrawCharacterSkills(PartyMemberView member)
        {
            GUI.Label(new Rect(4f, 292f, 300f, 20f), "SKILLS", headingStyle);
            var skills = member.skills ?? Array.Empty<SkillView>();
            for (var index = 0; index < skills.Length; index++)
            {
                var skill = skills[index];
                var x = 4f + index % 2 * 330f;
                var y = 320f + index / 2 * 68f;
                GUI.Label(new Rect(x, y, 310f, 20f), $"{skill.name} · Rank {skill.rank}", bodyStyle);
                GUI.Label(new Rect(x, y + 21f, 310f, 18f), $"{skill.ability.ToUpperInvariant()} / {Readable(skill.category)}", subtleStyle);
                GUI.Label(new Rect(x, y + 40f, 310f, 18f), $"Practice {skill.practice} / {skill.practiceTarget}", subtleStyle);
            }
        }

        private CellView SelectedCell()
        {
            if (!selected.HasValue) return null;
            return CellAt(selected.Value);
        }

        private CellView CellAt(Vector2Int position)
        {
            foreach (var cell in view.map.cells)
                if (cell.x == position.x && cell.y == position.y) return cell;
            return null;
        }

        private string SelectionName(CellView cell)
        {
            if (!string.IsNullOrEmpty(cell.entityName)) return cell.entityName;
            if (!string.IsNullOrEmpty(cell.objectName)) return cell.objectName;
            if (!string.IsNullOrEmpty(cell.cropPlotId))
                return $"{Readable(cell.cropKind)} field";
            if (cell.storageLoosePile) return "Loose stock pile";
            if (cell.storageCell) return "Storage";
            var landmark = LandmarkAt(cell);
            if (landmark != null) return landmark.name;
            return Readable(cell.objectKind);
        }

        private string SelectionDescription(CellView cell)
        {
            var description = !string.IsNullOrEmpty(cell.objectDescription)
                ? cell.objectDescription : LandmarkAt(cell)?.description;
            description = CropDescription(cell, description);
            if (!cell.storageCell) return description;
            var entries = new string[(cell.stockpileIds ?? Array.Empty<string>()).Length];
            for (var index = 0; index < entries.Length; index++)
            {
                var kind = index < (cell.stockItemKinds?.Length ?? 0)
                    ? Readable(cell.stockItemKinds[index]) : "stock";
                var quantity = index < (cell.stockQuantities?.Length ?? 0)
                    ? cell.stockQuantities[index] : 0;
                var capacity = index < (cell.stockCapacities?.Length ?? 0)
                    ? cell.stockCapacities[index] : 0;
                entries[index] = $"{kind} {quantity}/{capacity}";
            }
            var storage = cell.storageLoosePile
                ? $"NO VALID STORAGE · LOOSE {cell.storageOverflow}  " + string.Join(" · ", entries)
                : $"STORAGE {cell.storageUsed}+{cell.storageReserved}/" +
                    $"{cell.storageAllowance} OVERFLOW {cell.storageOverflow}  " +
                    string.Join(" · ", entries);
            var tier = string.IsNullOrEmpty(cell.storageTier) ? "ground" : cell.storageTier;
            var protection = string.IsNullOrEmpty(cell.storageProtection)
                ? (tier == "container" ? "fixture" : "outdoor")
                : cell.storageProtection;
            var slots = cell.storageStackSlots > 0 ? cell.storageStackSlots : 1;
            storage += $"\n{Readable(tier)} · {Readable(protection)} · " +
                $"STACKS {cell.storageStacksUsed}/{slots}";
            return string.IsNullOrEmpty(description)
                ? storage : description + "\n" + storage;
        }

        private static string CropDescription(CellView cell, string description)
        {
            if (string.IsNullOrEmpty(cell.cropPlotId)) return description;
            var progress = Mathf.RoundToInt(Mathf.Clamp01(cell.cropGrowthProgress) * 100f);
            var expected = cell.cropExpectedMaturityDay > 0f
                ? $" · EXPECTED DAY {cell.cropExpectedMaturityDay:0.0}" : "";
            var crop = $"{Readable(cell.cropKind).ToUpperInvariant()} · " +
                $"{Readable(cell.cropStage).ToUpperInvariant()} · GROWTH {progress}%{expected}\n" +
                $"RATE {cell.cropGrowthRate:0.000} · FERTILITY {cell.cropFertility:0} · " +
                $"MOISTURE {cell.cropMoisture:0} · DAMAGE {cell.cropDamage:0}";
            if (!string.IsNullOrEmpty(cell.cropDisease))
                crop += $" · {Readable(cell.cropDisease).ToUpperInvariant()}";
            if (cell.cropLastYield > 0)
                crop += $"\nLAST HARVEST {cell.cropLastYield} · FARMING SKILL {cell.cropLastFarmerSkill}";
            if (!string.IsNullOrEmpty(cell.cropDestinationCellId))
                crop += $"\nHARVEST STORAGE {cell.cropDestinationX}, {cell.cropDestinationY}";
            return string.IsNullOrEmpty(description) ? crop : description + "\n" + crop;
        }

        private LandmarkView LandmarkAt(CellView cell) => Array.Find(
            view.map.landmarks ?? Array.Empty<LandmarkView>(),
            landmark => cell.x >= landmark.x && cell.x < landmark.x + landmark.width
                && cell.y >= landmark.y && cell.y < landmark.y + landmark.height);

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
            detailStyle = new GUIStyle(bodyStyle)
            {
                wordWrap = true,
                clipping = TextClipping.Clip
            };
            subtleStyle = NewStyle(11, new Color(0.55f, 0.58f, 0.51f));
            dangerStyle = NewStyle(12, new Color(0.96f, 0.34f, 0.28f));
            healingStyle = NewStyle(12, new Color(0.42f, 0.88f, 0.48f));
            treasureStyle = NewStyle(12, new Color(0.96f, 0.76f, 0.28f));
            stockLabelStyle = NewStyle(10, new Color(0.96f, 0.90f, 0.62f));
            stockLabelStyle.fontStyle = FontStyle.Bold;
            stockLabelStyle.alignment = TextAnchor.MiddleCenter;
            structureLabelStyle = NewStyle(12, new Color(0.96f, 0.88f, 0.56f));
            structureLabelStyle.fontStyle = FontStyle.Bold;
            structureLabelStyle.alignment = TextAnchor.MiddleCenter;
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
