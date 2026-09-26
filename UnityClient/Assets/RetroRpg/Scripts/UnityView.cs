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
    }

    [Serializable]
    public sealed class ProgressView
    {
        public int completed;
        public int total;
        public string unit;
    }

    [Serializable]
    public sealed class MoveEnvelope
    {
        public MoveIntent intent;

        public MoveEnvelope(int x, int y)
        {
            intent = new MoveIntent { kind = "local_move", x = x, y = y };
        }
    }

    [Serializable]
    public sealed class MoveIntent
    {
        public string kind;
        public int x;
        public int y;
    }
}
