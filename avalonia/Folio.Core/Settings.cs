namespace Folio.Core;

/// <summary>
/// The persisted preferences. Field names and semantics mirror the Rust
/// backend's <c>Settings</c> so an existing settings.json loads unchanged.
/// </summary>
public sealed class Settings
{
    public string? Vault { get; set; }
    public string? Avatar { get; set; }
    public List<string> Order { get; set; } = new();
    public string? LastNote { get; set; }
    public List<string> Pinned { get; set; } = new();
    public string Theme { get; set; } = "neo";
    /// <summary>Light, dark, or system. <c>Theme</c> stays the material choice
    /// (neo/classic), which is orthogonal to the colour palette. New installs
    /// follow the OS; an explicit choice is remembered.</summary>
    public string Appearance { get; set; } = "system";
    /// <summary>Synced, light, or dark for the note surface only. Synced follows
    /// <see cref="Appearance"/>; an explicit choice lets the page be light while
    /// the chrome is dark, or the other way around.</summary>
    public string EditorTheme { get; set; } = "synced";
    public Dictionary<string, string> NoteFonts { get; set; } = new();
    public Dictionary<string, float> NoteSpacing { get; set; } = new();
    public Dictionary<string, float> NoteSizes { get; set; } = new();
    public string AppIcon { get; set; } = "galaxy";
    public bool TitleInline { get; set; }
    public uint SidebarWidth { get; set; } = 300;
}
