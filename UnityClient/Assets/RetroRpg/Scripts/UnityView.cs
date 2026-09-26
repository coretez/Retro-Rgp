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
        public HeroView hero;
        public MapView map;
        public JobView[] jobs;
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
        public string entityId;
        public string entityKind;
        public string entityName;
        public string entityObjective;
        public string entityAction;
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
        public string direction;
        public int x;
        public int y;
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
