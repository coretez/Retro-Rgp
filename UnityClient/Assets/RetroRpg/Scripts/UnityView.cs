using System;

namespace RetroRpg
{
    [Serializable]
    public sealed class UnityView
    {
        public int protocolVersion;
        public int visualRegistryVersion;
        public string runId;
        public int revision;
        public int tick;
        public string status;
        public string location;
        public string villageScenario;
        public bool adventurersPresent;
        public string title;
        public string townClock;
        public string daylightPhase;
        public float daylightLevel;
        public string message;
        public string activity;
        public ActivityView[] activityLog;
        public string[] legalIntents;
        public HeroView hero;
        public PositionView observationCenter;
        public MapView map;
        public JobView[] jobs;
        public InventoryItemView[] inventory;
        public InventoryOwnerView[] inventories;
        public TargetView[] targets;
        public PartyOrderView partyOrder;
        public PartyMemberView[] partyMembers;
        public string[] combatRoles;
        public SimulationView simulation;
        public string partyMovement;
        public bool regrouping;
        public SpendingPolicyView spendingPolicy;
        public VillageDevelopmentView villageDevelopment;
        public VillageTradeView villageTrade;
        public VillageMeaningView villageMeaning;
        public PowerView classPower;
        public ShopView shop;
    }

    [Serializable]
    public sealed class SimulationView
    {
        public bool canRun;
        public bool tacticalPauseRequired;
        public string reason;
    }

    [Serializable]
    public sealed class SpendingPolicyView
    {
        public string mode;
        public int autonomousLimitCp;
        public int spentCp;
    }

    [Serializable]
    public sealed class VillageTradeView
    {
        public int treasuryCp;
        public MerchantPolicyView policy;
        public int nextArrivalAtTick;
        public MerchantVisitView activeVisit;
    }

    [Serializable]
    public sealed class VillageMeaningView
    {
        public int schemaVersion;
        public string status;
        public bool passed;
        public bool complete;
        public string summary;
        public int residentCount;
        public int residentReceiptCount;
        public int buildingCount;
        public int buildingReceiptCount;
        public string[] gaps;
        public string[] violations;
        public TownMeaningReceiptView town;
        public ResidentMeaningReceiptView[] residents;
        public BuildingMeaningReceiptView[] buildings;
    }

    [Serializable]
    public sealed class TownMeaningReceiptView
    {
        public string id;
        public string name;
        public string scenario;
        public string foundingCause;
        public int population;
        public int householdCount;
        public int housedResidents;
        public string leaderActorId;
        public string leaderName;
        public string activePriority;
        public string[] services;
        public int storageOverflow;
    }

    [Serializable]
    public sealed class ResidentMeaningReceiptView
    {
        public string id;
        public string name;
        public string primaryRole;
        public string lifeStage;
        public string originReason;
        public string householdId;
        public string householdName;
        public string residenceId;
        public string residenceName;
        public string housingStatus;
        public string[] enabledWorkTypes;
        public string[] workplaceIds;
        public string[] relationshipActorIds;
        public ResidentPurposeView purpose;
        public string consequence;
    }

    [Serializable]
    public sealed class ResidentPurposeView
    {
        public string status;
        public string jobId;
        public string jobType;
        public string action;
        public string reason;
        public string schedule;
    }

    [Serializable]
    public sealed class BuildingMeaningReceiptView
    {
        public string id;
        public string key;
        public string name;
        public string status;
        public string cause;
        public string districtKey;
        public string[] operatorActorIds;
        public string consequence;
    }

    [Serializable]
    public sealed class MerchantPolicyView
    {
        public int intervalDays;
        public int stayDays;
        public int reserveCp;
        public bool autoBuy;
        public bool autoSell;
    }

    [Serializable]
    public sealed class MerchantVisitView
    {
        public string id;
        public MerchantActorView merchant;
        public int arrivedAtTick;
        public int departsAtTick;
        public MerchantStockView[] inventory;
    }

    [Serializable]
    public sealed class MerchantActorView
    {
        public string id;
        public string name;
        public PositionView position;
        public string currentAction;
    }

    [Serializable]
    public sealed class MerchantStockView
    {
        public string itemKind;
        public int quantity;
    }

    [Serializable]
    public sealed class VillageDevelopmentView
    {
        public string policy;
        public string activePriority;
        public VillagePriorityView[] priorities;
        public VillageProjectView[] projects;
        public ResidentNeedsAssessmentView residentNeedsAssessment;
        public int lastResidentNeedsReviewAtTick;
        public int nextResidentNeedsReviewAtTick;
        public VillageStrategyBoardView strategyBoard;
        public VillageArchitectPlanView[] architectPlans;
        public VillageArchitectPlanDecisionView[] architectPlanDecisions;
    }

    [Serializable]
    public sealed class ResidentNeedsAssessmentView
    {
        public int assessedAtTick;
        public string assessedByActorId;
        public int residentCount;
        public int homelessCount;
        public NeedCountsView warningCounts;
        public NeedCountsView dangerCounts;
        public ResidentNeedView[] residents;
        public FoodOutlookView foodOutlook;
        public string recommendedPriority;
        public string recommendationReason;
    }

    [Serializable]
    public sealed class NeedCountsView
    {
        public int hunger;
        public int fatigue;
        public int safety;
        public int social;
        public int morale;
    }

    [Serializable]
    public sealed class ResidentNeedView
    {
        public string residentId;
        public string residentName;
        public string householdId;
        public string housingStatus;
        public ResidentNeedValuesView needs;
        public string[] urgentNeeds;
        public string[] requests;
    }

    [Serializable]
    public sealed class ResidentNeedValuesView
    {
        public int hunger;
        public int fatigue;
        public int safety;
        public int social;
        public int morale;
    }

    [Serializable]
    public sealed class FoodOutlookView
    {
        public int availablePortions;
        public int oneDayTarget;
        public int stableTarget;
        public float coverageDays;
        public bool seasonalPlantingUnderway;
        public string[] risks;
    }

    [Serializable]
    public sealed class VillageStrategyBoardView
    {
        public string policy;
        public string leaderActorId;
        public int revision;
        public string activeProposalId;
        public string activeCommissionId;
        public VillageProposalView[] proposalQueue;
        public VillageDecisionView[] decisions;
        public VillageCommissionView[] commissions;
    }

    [Serializable]
    public sealed class VillageProposalView
    {
        public string id;
        public string projectKey;
        public string proposalKind;
        public string proposalSeriesId;
        public int revision;
        public string facilityType;
        public string name;
        public string status;
        public string requesterActorId;
        public string requesterPersonKey;
        public string intendedOperatorActorId;
        public string intendedOperatorPersonKey;
        public string reason;
        public string expectedBenefit;
        public int acceptableDelayTicks;
        public string rejectionConsequence;
        public string revisionReason;
        public string previousProposalId;
        public string supersededByProposalId;
        public string latestDecisionId;
        public string commissionId;
        public int budgetVersion;
        public VillageBudgetView requestedBudget;
        public VillageProposalDemandView demand;
        public VillageFacilityRequirementsView requirements;
    }

    [Serializable]
    public sealed class VillageProposalDemandView
    {
        public string status;
        public int score;
        public string summary;
        public int evaluatedAtTick;
        public VillageDemandMetricView[] metrics;
    }

    [Serializable]
    public sealed class VillageDemandMetricView
    {
        public string key;
        public string label;
        public float value;
        public float threshold;
        public string comparison;
        public bool satisfied;
    }

    [Serializable]
    public sealed class VillageFacilityRequirementsView
    {
        public string[] rooms;
        public string[] fixtures;
        public string[] storage;
        public string[] utilities;
        public string[] access;
        public string[] safety;
        public string[] inputs;
        public string[] outputs;
        public string[] staffing;
    }

    [Serializable]
    public sealed class VillageDecisionView
    {
        public string id;
        public string proposalId;
        public string projectKey;
        public string outcome;
        public string reason;
        public string source;
        public string decidedByActorId;
        public int decidedAtTick;
        public VillageBudgetView budget;
    }

    [Serializable]
    public sealed class VillageCommissionView
    {
        public string id;
        public string proposalId;
        public string decisionId;
        public string projectId;
        public string projectKey;
        public string status;
        public string authorizedByActorId;
        public int authorizedAtTick;
        public string suspensionReason;
        public VillageBudgetView budget;
        public VillageBudgetUsageView budgetUsage;
        public VillageCommissionAssignmentsView assignments;
        public VillagePlanningView planning;
        public VillageForemanReviewView foremanReview;
    }

    [Serializable]
    public sealed class VillageBudgetView
    {
        public VillageMaterialBudgetView materials;
        public float laborUnits;
    }

    [Serializable]
    public sealed class VillageMaterialBudgetView
    {
        public int lumber;
    }

    [Serializable]
    public sealed class VillageBudgetUsageView
    {
        public VillageMaterialBudgetView materials;
        public float laborUnits;
        public VillageMaterialBudgetView remainingMaterials;
        public float remainingLaborUnits;
        public string status;
    }

    [Serializable]
    public sealed class VillageForemanReviewView
    {
        public string foremanActorId;
        public string foremanName;
        public int completedElements;
        public int totalElements;
        public int blockedElements;
        public int tick;
    }

    [Serializable]
    public sealed class VillageCommissionAssignmentsView
    {
        public VillageAssignmentView leader;
        public VillageAssignmentView requester;
        public VillageAssignmentView @operator;
        public VillageAssignmentView foreman;
        public VillageAssignmentView architect;
        public VillageAssignmentView[] builders;
        public VillageAssignmentView[] haulers;
        public VillageAssignmentView[] suppliers;
        public string[] crewActorIds;
    }

    [Serializable]
    public sealed class VillageAssignmentView
    {
        public string actorId;
        public string actorName;
        public string personKey;
    }

    [Serializable]
    public sealed class VillagePlanningView
    {
        public string status;
        public string architectActorId;
        public string architectName;
        public string planId;
        public int planRevision;
        public string recommendedAlternativeId;
        public string selectedAlternativeId;
        public string workOrderId;
        public string note;
    }

    [Serializable]
    public sealed class VillageArchitectPlanView
    {
        public string id;
        public string commissionId;
        public string proposalId;
        public string projectKey;
        public int revision;
        public string status;
        public string architectActorId;
        public string recommendedAlternativeId;
        public string selectedAlternativeId;
        public string latestDecisionId;
        public VillageArchitectAlternativeView[] alternatives;
    }

    [Serializable]
    public sealed class VillageArchitectAlternativeView
    {
        public string id;
        public int rank;
        public int score;
        public string status;
        public string[] reasons;
        public VillageArchitectSiteView site;
        public VillageArchitectBillView billOfMaterials;
    }

    [Serializable]
    public sealed class VillageArchitectSiteView
    {
        public string key;
        public string name;
        public int x;
        public int y;
        public int w;
        public int h;
    }

    [Serializable]
    public sealed class VillageArchitectBillView
    {
        public int lumber;
        public float laborUnits;
        public int elementCount;
    }

    [Serializable]
    public sealed class VillageArchitectPlanDecisionView
    {
        public string id;
        public string planId;
        public string commissionId;
        public string projectKey;
        public string alternativeId;
        public string outcome;
        public string reason;
        public string decidedByActorId;
        public int decidedAtTick;
    }

    [Serializable]
    public sealed class VillagePriorityView
    {
        public string key;
        public string name;
        public int score;
        public string reason;
        public string[] blockedBy;
    }

    [Serializable]
    public sealed class VillageProjectView
    {
        public string id;
        public string key;
        public string name;
        public string status;
        public string[] dependencies;
        public string[] blockingReasons;
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
    public sealed class ShopView
    {
        public string id;
        public string name;
        public string keeper;
        public bool staffed;
        public bool stocked;
        public bool open;
        public ShopGoodView[] goods;
    }

    [Serializable]
    public sealed class ShopGoodView
    {
        public string itemKind;
        public string name;
        public string itemType;
        public int priceCp;
        public int quantity;
    }

    [Serializable]
    public sealed class MapView
    {
        public int width;
        public int height;
        public PositionView origin;
        public CellView[] cells;
        public LandmarkView[] landmarks;
        public RegionView region;
        public ChunkView[] chunks;
    }

    [Serializable]
    public sealed class RegionView
    {
        public int minX;
        public int minY;
        public int maxX;
        public int maxY;
        public int width;
        public int height;
        public int chunkSize;
        public int foundingEnvelope;
        public int hamletEnvelope;
        public string generationMode;
        public RegionalSiteView[] sites;
        public RegionalPolylineView[] waterways;
        public PositionView[] trail;
    }

    [Serializable]
    public sealed class RegionalPolylineView
    {
        public string name;
        public PositionView[] points;
    }

    [Serializable]
    public sealed class RegionalSiteView
    {
        public string key;
        public string name;
        public string kind;
        public PositionView position;
        public string[] resources;
        public int chunkX;
        public int chunkY;
        public int distance;
        public int roundTripTicks;
        public string tripClass;
        public string dispatchStatus;
    }

    [Serializable]
    public sealed class ChunkView
    {
        public string id;
        public int chunkX;
        public int chunkY;
        public string tier;
        public string detailLevel;
        public string deltaRevision;
        public bool unchanged;
        public ChunkDeltaCountsView deltaCounts;
        public ChunkDeltaView delta;
        public string cellRevision;
        public bool cellsUnchanged;
        public CellView[] cells;
    }

    [Serializable]
    public sealed class ChunkDeltaCountsView
    {
        public int terrain;
        public int structures;
        public int resources;
        public int ownership;
    }

    [Serializable]
    public sealed class ChunkDeltaView
    {
        public string revision;
        public string[] terrainChangeIds;
        public string[] structureIds;
        public string[] resourceIds;
        public string[] ownershipIds;
        public ChunkStateEntryView[] stateEntries;
    }

    [Serializable]
    public sealed class ChunkStateEntryView
    {
        public string id;
        public string kind;
        public string itemKind;
        public string status;
        public string stage;
        public float quantity;
        public float remainingUnits;
        public float forageUnits;
    }

    [Serializable]
    public sealed class ChunkRevisionView
    {
        public string id;
        public string revision;
    }

    [Serializable]
    public sealed class LandmarkView
    {
        public int x;
        public int y;
        public int width;
        public int height;
        public string name;
        public string status;
        public bool complete;
        public string description;
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
        public string groundTile;
        public string glyph;
        public string variant;
        public string objectKind;
        public int terrainEdgeMask;
        public bool mountainRoof;
        public int objectWidth;
        public int objectHeight;
        public string objectId;
        public string objectName;
        public string objectDescription;
        public string constructionStage;
        public int constructionMaterialDelivered;
        public int constructionMaterialRequired;
        public float constructionLaborCompleted;
        public float constructionLaborRequired;
        public string visualFamily;
        public string visualState;
        public string visualMaterial;
        public string visualAssetKey;
        public string visualRenderMode;
        public string visualOrientation;
        public int visualConnectionMask;
        public int visualCondition;
        public int visualMaxCondition;
        public string visualDamageBand;
        public string visualLifecycle;
        public bool visualAccepted;
        public bool visualFallback;
        public string stockpileId;
        public bool storageCell;
        public bool storageLoosePile;
        public string storageZoneId;
        public string storageCellId;
        public string[] storageAllowedItemKinds;
        public int storagePriority;
        public int storageAllowance;
        public string storageTier;
        public string storageProtection;
        public int storageStackSlots;
        public int storageStacksUsed;
        public int storageUsed;
        public int storageReserved;
        public int storageOverflow;
        public string stockItemKind;
        public int stockQuantity;
        public int stockCapacity;
        public string[] stockpileIds;
        public string[] stockItemKinds;
        public int[] stockQuantities;
        public int[] stockCapacities;
        public string cropPlotId;
        public string cropKind;
        public string cropStage;
        public int cropCycle;
        public float cropGrowthProgress;
        public float cropGrowthRate;
        public float cropExpectedMaturityDay;
        public float cropFertility;
        public float cropMoisture;
        public float cropDamage;
        public string cropDisease;
        public int cropLastYield;
        public int cropLastFarmerSkill;
        public bool cropSowingPaused;
        public bool cropCutOrdered;
        public string cropDestinationCellId;
        public int cropDestinationX;
        public int cropDestinationY;
        public string fieldDesignationId;
        public string fieldDesignationKey;
        public string fieldDesignationCropKind;
        public string fieldDesignationStatus;
        public int fieldDesignationEdgeMask;
        public bool fieldDesignationTree;
        public string foragePatchId;
        public string forageKind;
        public string forageName;
        public string forageStage;
        public int forageYield;
        public int forageRegrowAtTick;
        public string floorPrimitiveId;
        public string floorMaterial;
        public int floorCondition;
        public int floorMaxCondition;
        public string roofPrimitiveId;
        public string roofMaterial;
        public int roofCondition;
        public int roofMaxCondition;
        public string[] actions;
        public string entityId;
        public string entityKind;
        public string entityName;
        public string entityBodyBuild;
        public string entitySkinTone;
        public string entityHairStyle;
        public string entityHairColor;
        public string entityOutfit;
        public string entityObjective;
        public string entityAction;
        public string entityReason;
        public string entityAgeStage;
        public string entitySex;
        public int entityGeneration;
        public int animalTetherX;
        public int animalTetherY;
        public string entityPose;
        public int entitySleepWidth;
        public int entitySleepHeight;
        public bool entityWorking;
        public string entityCarrying;
        public string entityCarryingKind;
        public string entityWork;
        public string entityPermissions;
        public string entityCapabilities;
        public string entityNeeds;
        public string entitySchedule;
        public string entityMemory;
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
    public sealed class PartyMemberView
    {
        public string id;
        public string name;
        public string className;
        public int level;
        public string combatRole;
        public string jobFocus;
        public int workPriority;
        public int hp;
        public int maxHp;
        public int ac;
        public int attackBonus;
        public string damage;
        public int attackRange;
        public AbilityView[] abilities;
        public SkillView[] skills;
        public string[] jobOptions;
        public WorkPriorityView[] workPriorities;
        public ActivityPriorityView[] activities;
        public string currentJob;
        public string currentJobStatus;
        public NeedView[] needs;
        public EquipmentSummaryView equipment;
    }

    [Serializable]
    public sealed class AbilityView
    {
        public string key;
        public int score;
        public int modifier;
    }

    [Serializable]
    public sealed class SkillView
    {
        public string key;
        public string name;
        public string ability;
        public string category;
        public int rank;
        public int practice;
        public int practiceTarget;
    }

    [Serializable]
    public sealed class ActivityPriorityView
    {
        public string jobType;
        public string name;
        public int priority;
        public string[] skillNames;
        public bool available;
        public string requirement;
    }

    [Serializable]
    public sealed class WorkPriorityView
    {
        public string jobType;
        public int priority;
    }

    [Serializable]
    public sealed class NeedView
    {
        public string key;
        public int value;
    }

    [Serializable]
    public sealed class EquipmentSummaryView
    {
        public string weapon;
        public string armor;
        public string offhand;
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
        public bool viewportCenterSet;
        public int viewportCenterX;
        public int viewportCenterY;
        public ChunkRevisionView[] chunkRevisions;
        public bool cellChunkProtocol;
        public ChunkRevisionView[] cellChunkRevisions;

        public MoveEnvelope(UnityView view, int x, int y, bool centerSet, int centerX,
            int centerY, ChunkRevisionView[] revisions, ChunkRevisionView[] cellRevisions)
        {
            viewportCenterSet = centerSet;
            viewportCenterX = centerX;
            viewportCenterY = centerY;
            chunkRevisions = revisions;
            cellChunkProtocol = true;
            cellChunkRevisions = cellRevisions;
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
        public string itemKind;
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
        public string combatRole;
        public string jobFocus;
        public int workPriority;
        public string mode;
        public string proposalId;
        public string commissionId;
        public string planId;
        public string alternativeId;
        public string outcome;
        public string reason;
        public string status;
        public int limitCp;
        public bool autonomous;
    }

    [Serializable]
    public sealed class ActionEnvelope
    {
        public MoveIntent intent;
        public bool viewportCenterSet;
        public int viewportCenterX;
        public int viewportCenterY;
        public ChunkRevisionView[] chunkRevisions;
        public bool cellChunkProtocol;
        public ChunkRevisionView[] cellChunkRevisions;

        public ActionEnvelope(MoveIntent value, bool centerSet, int centerX, int centerY,
            ChunkRevisionView[] revisions, ChunkRevisionView[] cellRevisions)
        {
            intent = value;
            viewportCenterSet = centerSet;
            viewportCenterX = centerX;
            viewportCenterY = centerY;
            chunkRevisions = revisions;
            cellChunkProtocol = true;
            cellChunkRevisions = cellRevisions;
        }
    }
}
