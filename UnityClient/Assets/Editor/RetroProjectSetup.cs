using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class RetroProjectSetup
{
    public static void BuildMac()
    {
        const string scene = "Assets/Scenes/RetroRpg.unity";
        const string output = "Builds/Retro RPG.app";
        var options = new BuildPlayerOptions
        {
            scenes = new[] { scene },
            locationPathName = output,
            target = BuildTarget.StandaloneOSX,
            options = BuildOptions.None
        };
        var report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            throw new System.InvalidOperationException(report.summary.result.ToString());
    }

    public static void Configure()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        const string path = "Assets/Scenes/RetroRpg.unity";
        System.IO.Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, path);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
        PlayerSettings.companyName = "Coretez";
        PlayerSettings.productName = "Retro RPG";
        PlayerSettings.defaultScreenWidth = 1440;
        PlayerSettings.defaultScreenHeight = 900;
        PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
        PlayerSettings.resizableWindow = true;
        PlayerSettings.runInBackground = true;
        CreateGroundMaterial();
        AssetDatabase.SaveAssets();
    }

    private static void CreateGroundMaterial()
    {
        const string directory = "Assets/Resources";
        const string path = directory + "/AsciiGround.mat";
        System.IO.Directory.CreateDirectory(directory);
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        var shader = Shader.Find("RetroRpg/AsciiGround");
        if (material == null)
        {
            material = new Material(shader);
            AssetDatabase.CreateAsset(material, path);
        }
        else material.shader = shader;
    }
}
