namespace Folio.Core;

/// <summary>One row in the sidebar. <c>Path</c> is always vault-relative and
/// uses '/' separators, which is what the page puts in data attributes.</summary>
public sealed class Node
{
    public string Path { get; set; } = "";
    public string Name { get; set; } = "";
    public bool Folder { get; set; }
    public List<Node> Children { get; set; } = new();
}

/// <summary>The payload of the <c>vault</c> command.</summary>
public sealed class VaultInfo
{
    public string Path { get; set; } = "";
    public List<Node> Notes { get; set; } = new();
    public string? LastNote { get; set; }
    public List<string> Pinned { get; set; } = new();
}

/// <summary>The subset of settings the page needs to render itself.</summary>
public sealed class AppSettings
{
    public string Theme { get; set; } = "neo";
    public string Appearance { get; set; } = "system";
    public string EditorTheme { get; set; } = "synced";
    public Dictionary<string, string> Fonts { get; set; } = new();
    public Dictionary<string, float> Spacing { get; set; } = new();
    public Dictionary<string, float> Sizes { get; set; } = new();
    public string AppIcon { get; set; } = "galaxy";
    public uint SidebarWidth { get; set; } = 300;
    public bool TitleInline { get; set; }
}
