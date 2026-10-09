using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace RetroRpg
{
    public sealed class RetroApiClient
    {
        private readonly string baseUrl;
        private bool viewportCenterSet;
        private int viewportCenterX;
        private int viewportCenterY;
        private readonly Dictionary<string, string> chunkRevisions = new();
        private readonly Dictionary<string, ChunkDeltaView> chunkDeltas = new();
        private readonly List<string> chunkRecency = new();
        private readonly Dictionary<string, string> cellChunkRevisions = new();
        private readonly Dictionary<string, CellView[]> cellChunks = new();
        private readonly List<string> cellChunkRecency = new();
        private const int CellChunkCacheLimit = 192;
        private const int CellChunkRevisionLimit = 96;
        private const int ChunkCacheLimit = 96;
        private const int ChunkRevisionLimit = 48;

        public RetroApiClient(string baseUrl)
        {
            this.baseUrl = baseUrl.TrimEnd('/');
        }

        public IEnumerator Load(Action<UnityView> success, Action<string> failure)
        {
            var suffix = LoadSuffix();
            using var request = UnityWebRequest.Get($"{baseUrl}/api/unity/state{suffix}");
            yield return request.SendWebRequest();
            ReadResponse(request, success, failure);
        }

        public IEnumerator Browse(int x, int y, Action<UnityView> success, Action<string> failure)
        {
            viewportCenterSet = true;
            viewportCenterX = x;
            viewportCenterY = y;
            yield return Load(success, failure);
        }

        public void TrackViewport(UnityView view)
        {
            viewportCenterSet = view.location == "village";
            if (!viewportCenterSet) return;
            viewportCenterX = view.map.origin.x + view.map.width / 2;
            viewportCenterY = view.map.origin.y + view.map.height / 2;
        }

        public IEnumerator Move(UnityView view, int x, int y, Action<UnityView> success, Action<string> failure)
        {
            var json = JsonUtility.ToJson(new MoveEnvelope(
                view, x, y, viewportCenterSet, viewportCenterX, viewportCenterY,
                KnownChunkRevisions(), KnownCellChunkRevisions()));
            using var request = new UnityWebRequest($"{baseUrl}/api/unity/action", "POST");
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();
            ReadResponse(request, success, failure);
        }

        public IEnumerator Act(MoveIntent intent, Action<UnityView> success, Action<string> failure)
        {
            var json = JsonUtility.ToJson(new ActionEnvelope(
                intent, viewportCenterSet, viewportCenterX, viewportCenterY,
                KnownChunkRevisions(), KnownCellChunkRevisions()));
            using var request = new UnityWebRequest($"{baseUrl}/api/unity/action", "POST");
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();
            ReadResponse(request, success, failure);
        }

        public IEnumerator Save(Action success, Action<string> failure)
        {
            using var request = new UnityWebRequest($"{baseUrl}/api/unity/save", "POST");
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes("{}"));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();
            if (request.result == UnityWebRequest.Result.Success) success();
            else failure($"{request.error}: {request.downloadHandler.text}");
        }

        private string LoadSuffix()
        {
            var values = new List<string> { "cellChunks=1" };
            if (viewportCenterSet)
            {
                values.Add($"centerX={viewportCenterX}");
                values.Add($"centerY={viewportCenterY}");
            }
            var revisions = ChunkRevisionQuery();
            if (revisions.Length > 0)
                values.Add($"chunkRevisions={UnityWebRequest.EscapeURL(revisions)}");
            var cellRevisions = CellChunkRevisionQuery();
            if (cellRevisions.Length > 0)
                values.Add($"cellChunkRevisions={UnityWebRequest.EscapeURL(cellRevisions)}");
            return values.Count == 0 ? "" : $"?{string.Join("&", values)}";
        }

        private string ChunkRevisionQuery()
        {
            var entries = new List<string>();
            foreach (var id in RecentChunkIds())
                if (chunkRevisions.TryGetValue(id, out var revision))
                    entries.Add($"{id}:{revision}");
            return string.Join(",", entries);
        }

        private ChunkRevisionView[] KnownChunkRevisions()
        {
            var values = new List<ChunkRevisionView>();
            foreach (var id in RecentChunkIds())
                if (chunkRevisions.TryGetValue(id, out var revision))
                    values.Add(new ChunkRevisionView { id = id, revision = revision });
            return values.ToArray();
        }

        private IEnumerable<string> RecentChunkIds()
        {
            var first = Math.Max(0, chunkRecency.Count - ChunkRevisionLimit);
            for (var index = chunkRecency.Count - 1; index >= first; index--)
                yield return chunkRecency[index];
        }

        private void TouchChunk(string id)
        {
            chunkRecency.Remove(id);
            chunkRecency.Add(id);
            if (chunkRecency.Count <= ChunkCacheLimit) return;
            var expired = chunkRecency[0];
            chunkRecency.RemoveAt(0);
            chunkDeltas.Remove(expired);
            chunkRevisions.Remove(expired);
        }

        private string CellChunkRevisionQuery()
        {
            var entries = new List<string>();
            foreach (var id in RecentCellChunkIds())
                if (cellChunkRevisions.TryGetValue(id, out var revision))
                    entries.Add($"{id}:{revision}");
            return string.Join(",", entries);
        }

        private ChunkRevisionView[] KnownCellChunkRevisions()
        {
            var values = new List<ChunkRevisionView>();
            foreach (var id in RecentCellChunkIds())
                if (cellChunkRevisions.TryGetValue(id, out var revision))
                    values.Add(new ChunkRevisionView { id = id, revision = revision });
            return values.ToArray();
        }

        private IEnumerable<string> RecentCellChunkIds()
        {
            var first = Math.Max(0, cellChunkRecency.Count - CellChunkRevisionLimit);
            for (var index = cellChunkRecency.Count - 1; index >= first; index--)
                yield return cellChunkRecency[index];
        }

        private void TouchCellChunk(string id)
        {
            cellChunkRecency.Remove(id);
            cellChunkRecency.Add(id);
            if (cellChunkRecency.Count <= CellChunkCacheLimit) return;
            var expired = cellChunkRecency[0];
            cellChunkRecency.RemoveAt(0);
            cellChunks.Remove(expired);
            cellChunkRevisions.Remove(expired);
        }

        private void MergeChunkCache(UnityView view)
        {
            if (view?.map?.chunks == null) return;
            foreach (var chunk in view.map.chunks)
            {
                if (chunk.delta != null)
                {
                    chunkDeltas[chunk.id] = chunk.delta;
                    chunkRevisions[chunk.id] = chunk.deltaRevision;
                    TouchChunk(chunk.id);
                }
                else if (chunk.unchanged && chunkDeltas.TryGetValue(chunk.id, out var delta))
                {
                    chunk.delta = delta;
                    TouchChunk(chunk.id);
                }
            }
        }

        private void MergeCellChunkCache(UnityView view)
        {
            if (view?.map?.chunks == null) return;
            var unchangedCells = SnapshotUnchangedCellChunks(view);
            foreach (var chunk in view.map.chunks)
            {
                if (chunk.cells != null && chunk.cells.Length > 0)
                {
                    cellChunks[chunk.id] = chunk.cells;
                    cellChunkRevisions[chunk.id] = chunk.cellRevision;
                    TouchCellChunk(chunk.id);
                }
                else if (chunk.cellsUnchanged && unchangedCells.TryGetValue(chunk.id, out var cells))
                {
                    chunk.cells = cells;
                    TouchCellChunk(chunk.id);
                }
            }
            RebuildViewportCells(view);
        }

        private Dictionary<string, CellView[]> SnapshotUnchangedCellChunks(UnityView view)
        {
            var snapshot = new Dictionary<string, CellView[]>();
            foreach (var chunk in view.map.chunks)
                if (chunk.cellsUnchanged && cellChunks.TryGetValue(chunk.id, out var cells))
                    snapshot[chunk.id] = cells;
            return snapshot;
        }

        private static void RebuildViewportCells(UnityView view)
        {
            var cells = new List<CellView>();
            var minX = view.map.origin.x;
            var minY = view.map.origin.y;
            var maxX = minX + view.map.width;
            var maxY = minY + view.map.height;
            foreach (var chunk in view.map.chunks)
                foreach (var cell in chunk.cells ?? Array.Empty<CellView>())
                    if (cell.x >= minX && cell.x < maxX && cell.y >= minY && cell.y < maxY)
                        cells.Add(cell);
            cells.Sort((left, right) => left.y == right.y
                ? left.x.CompareTo(right.x) : left.y.CompareTo(right.y));
            view.map.cells = cells.ToArray();
        }

        private void ReadResponse(
            UnityWebRequest request,
            Action<UnityView> success,
            Action<string> failure)
        {
            if (request.result != UnityWebRequest.Result.Success)
            {
                failure($"{request.error}: {request.downloadHandler.text}");
                return;
            }
            var view = JsonUtility.FromJson<UnityView>(request.downloadHandler.text);
            MergeChunkCache(view);
            MergeCellChunkCache(view);
            if (view?.map?.cells == null || view.map.cells.Length == 0)
                failure("The engine returned no map cells.");
            else
            {
                success(view);
            }
        }
    }
}
