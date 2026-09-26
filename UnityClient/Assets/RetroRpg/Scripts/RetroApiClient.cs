using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace RetroRpg
{
    public sealed class RetroApiClient
    {
        private readonly string baseUrl;

        public RetroApiClient(string baseUrl)
        {
            this.baseUrl = baseUrl.TrimEnd('/');
        }

        public IEnumerator Load(Action<UnityView> success, Action<string> failure)
        {
            using var request = UnityWebRequest.Get($"{baseUrl}/api/unity/state");
            yield return request.SendWebRequest();
            ReadResponse(request, success, failure);
        }

        public IEnumerator Move(int x, int y, Action<UnityView> success, Action<string> failure)
        {
            var json = JsonUtility.ToJson(new MoveEnvelope(x, y));
            using var request = new UnityWebRequest($"{baseUrl}/api/unity/action", "POST");
            request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            yield return request.SendWebRequest();
            ReadResponse(request, success, failure);
        }

        private static void ReadResponse(
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
            if (view?.map?.cells == null) failure("The engine returned no map cells.");
            else success(view);
        }
    }
}
