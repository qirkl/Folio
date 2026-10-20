namespace Folio.Core;

/// <summary>Where the app keeps its own files. Notes stay in the user's vault.</summary>
public static class AppPaths
{
    /// <summary>Matches the Tauri identifier, so an existing settings.json and
    /// avatar keep working when the shell changes.</summary>
    public const string AppId = "com.nick.notes";

    public static string ConfigDir
    {
        get
        {
            var root = OperatingSystem.IsMacOS()
                ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    "Library", "Application Support")
                : Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            return Path.Combine(root, AppId);
        }
    }

    /// <summary><c>Documents/Notes</c>, the same default the Tauri build uses.</summary>
    public static string DefaultVault =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Notes");

    public static string SettingsFile => Path.Combine(ConfigDir, "settings.json");
}
