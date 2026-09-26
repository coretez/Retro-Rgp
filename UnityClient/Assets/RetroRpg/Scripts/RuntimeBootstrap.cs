using UnityEngine;

namespace RetroRpg
{
    public static class RuntimeBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void StartClient()
        {
            if (Object.FindAnyObjectByType<RetroGameController>() != null) return;
            new GameObject("Retro RPG Client").AddComponent<RetroGameController>();
        }
    }
}
