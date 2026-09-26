using System;

namespace RetroRpg
{
    [Serializable]
    public sealed class UnityView
    {
        public int protocolVersion;
        public string runId;
        public int revision;
        public int tick;
        public string status;
        public string location;
        public string title;
        public string message;
        public string activity;
        public ActivityView[] activityLog;
        public string[] legalIntents;
        public HeroView hero;
        public MapView map;
        public JobView[] jobs;
        public InventoryItemView[] inventory;
        public InventoryOwnerView[] inventories;
        public TargetView[] targets;
        public PartyOrderView partyOrder;
        public PowerView classPower;
    }

    [Serializable]
    public sealed class HeroView
    {
        public string id;
        public string name;
        public int hp;
        public int maxHp;
        public int goldCp;
        public int x;
        public int y;
    }

    [Serializable]
    public sealed class MapView
    {
        public int width;
        public int height;
        public PositionView origin;
        public CellView[] cells;
    }

    [Serializable]
    public sealed class PositionView
    {
        public int x;
        public int y;
    }

    [Serializable]
    public sealed class CellView
    {
        public int x;
        public int y;
        public string tile;
        public string glyph;
        public string objectKind;
        public string objectId;
        public string[] actions;
        public string entityId;
        public string entityKind;
        public string entityName;
        public string entityObjective;
        public string entityAction;
        public string entityReason;
        public int entityHp;
        public int entityMaxHp;
    }

    [Serializable]
    public sealed class JobView
    {
        public string id;
        public string name;
        public string status;
        public string assignedActorName;
        public string blockingReason;
        public ProgressView progress;
        public JobPlanView plan;
        public PositionView destination;
    }

    [Serializable]
    public sealed class ProgressView
    {
        public int completed;
        public int total;
        public string unit;
    }

    [Serializable]
    public sealed class JobPlanView
    {
        public string template;
        public string step;
    }

    [Serializable]
    public sealed class InventoryItemView
    {
        public string id;
        public string name;
        public string kind;
        public string itemType;
        public string slot;
        public int quantity;
        public int charges;
        public bool equipped;
        public bool throwable;
        public bool invokable;
    }

    [Serializable]
    public sealed class InventoryOwnerView
    {
        public string actorId;
        public string actorName;
        public InventoryItemView[] items;
    }

    [Serializable]
    public sealed class ActivityView
    {
        public string text;
        public string tone;
    }

    [Serializable]
    public sealed class TargetView
    {
        public string id;
        public string name;
        public int x;
        public int y;
        public int hp;
        public int maxHp;
    }

    [Serializable]
    public sealed class PartyOrderView
    {
        public string id;
        public string leaderId;
        public int commandRevision;
        public string objective;
        public string formation;
        public string targetId;
        public string resourcePolicy;
        public int retreatThreshold;
        public string movementMode;
    }

    [Serializable]
    public sealed class PowerView
    {
        public string key;
        public string name;
        public int uses;
        public int remaining;
    }

    [Serializable]
    public sealed class MoveEnvelope
    {
        public MoveIntent intent;

        public MoveEnvelope(UnityView view, int x, int y)
        {
            if (view.location == "dungeon")
            {
                intent = new MoveIntent
                {
                    kind = "move",
                    direction = Direction(x - view.hero.x, y - view.hero.y)
                };
                return;
            }
            intent = new MoveIntent { kind = "local_move", x = x, y = y };
        }

        private static string Direction(int x, int y) => (x, y) switch
        {
            (0, -1) => "north",
            (1, -1) => "northeast",
            (1, 0) => "east",
            (1, 1) => "southeast",
            (0, 1) => "south",
            (-1, 1) => "southwest",
            (-1, 0) => "west",
            (-1, -1) => "northwest",
            _ => null
        };
    }

    [Serializable]
    public sealed class MoveIntent
    {
        public string kind;
        public string action;
        public string direction;
        public int x;
        public int y;
        public string itemId;
        public string objectId;
        public string targetId;
        public string actorId;
        public string slot;
        public string groupId;
        public string issuerId;
        public int expectedCommandRevision;
        public string objective;
        public string formation;
        public string resourcePolicy;
        public int retreatThreshold;
        public string movementMode;
    }

    [Serializable]
    public sealed class ActionEnvelope
    {
        public MoveIntent intent;

        public ActionEnvelope(MoveIntent value)
        {
            intent = value;
        }
    }
}
