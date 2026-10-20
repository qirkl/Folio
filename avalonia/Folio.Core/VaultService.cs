using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Folio.Core;

/// <summary>
/// The vault and the preferences, ported from the Tauri backend. Notes are
/// ordinary markdown files in an ordinary folder, so this class deliberately
/// has no database and no index: the filesystem is the source of truth.
/// </summary>
public sealed class VaultService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly object _gate = new();

    public VaultService(string? configDir = null)
    {
        ConfigDir = configDir ?? AppPaths.ConfigDir;
        Directory.CreateDirectory(ConfigDir);
        SettingsPath = Path.Combine(ConfigDir, "settings.json");
    }

    public string ConfigDir { get; }
    public string SettingsPath { get; }

    // ------------------------------------------------------------- settings

    /// <summary>Parsed once and kept; every command used to re-read the file,
    /// which is wasted work on something as hot as a note switch.</summary>
    private Settings? _settings;

    public Settings LoadSettings()
    {
        lock (_gate)
        {
            if (_settings is not null) return _settings;
            try
            {
                if (!File.Exists(SettingsPath)) return _settings = new Settings();
                var json = File.ReadAllText(SettingsPath);
                return _settings = JsonSerializer.Deserialize<Settings>(json, JsonOptions) ?? new Settings();
            }
            catch
            {
                // A malformed file must not stop the app from opening. The next
                // save rewrites it, which is what the Rust backend did too.
                return _settings = new Settings();
            }
        }
    }

    public void SaveSettings(Settings settings)
    {
        lock (_gate)
        {
            _settings = settings;
            Directory.CreateDirectory(ConfigDir);
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            var tmp = SettingsPath + ".tmp";
            File.WriteAllText(tmp, json);
            File.Move(tmp, SettingsPath, true);
        }
    }

    // ---------------------------------------------------------------- vault

    public string VaultDir
    {
        get
        {
            var chosen = LoadSettings().Vault;
            var dir = string.IsNullOrWhiteSpace(chosen) ? AppPaths.DefaultVault : chosen;
            Directory.CreateDirectory(dir);
            return dir;
        }
    }

    /// <summary>
    /// Resolves a vault-relative path and refuses anything that would escape
    /// the vault: traversal, absolute paths, or characters Windows rejects.
    /// </summary>
    public string Resolve(string rel)
    {
        var vault = VaultDir;
        var cleaned = (rel ?? "").Trim().Replace('\\', '/');
        var trimmed = cleaned.Trim('/');
        if (trimmed.Length == 0) return vault;

        if (trimmed.IndexOfAny(":*?\"<>|".ToCharArray()) >= 0)
            throw new InvalidOperationException($"Invalid path: {rel}");
        if (Path.IsPathRooted(trimmed))
            throw new InvalidOperationException($"Invalid path: {rel}");

        var parts = trimmed.Split('/');
        if (parts.Any(p => p.Length == 0 || p is "." or ".."))
            throw new InvalidOperationException($"Invalid path: {rel}");

        var full = Path.GetFullPath(Path.Combine(vault, Path.Combine(parts)));
        var vaultFull = Path.GetFullPath(vault);
        var prefix = vaultFull.EndsWith(Path.DirectorySeparatorChar)
            ? vaultFull
            : vaultFull + Path.DirectorySeparatorChar;

        if (!full.Equals(vaultFull, StringComparison.OrdinalIgnoreCase) &&
            !full.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Invalid path: {rel}");
        }

        return full;
    }

    /// <summary><c>Bordeaux</c> and <c>Life/Bordeaux.md</c> both resolve; other
    /// extensions are rejected.</summary>
    public string NoteFile(string rel)
    {
        var path = Resolve(rel);
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            "" => path + ".md",
            ".md" or ".txt" => path,
            _ => throw new InvalidOperationException($"Not a note file: {rel}"),
        };
    }

    public static bool IsNoteFile(string path) =>
        Path.GetExtension(path).ToLowerInvariant() is ".md" or ".txt";

    public List<Node> ReadTree(string dir, string prefix, IReadOnlyList<string> order)
    {
        var ranks = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < order.Count; i++) ranks.TryAdd(order[i], i);
        int Rank(string path) => ranks.TryGetValue(path, out var i) ? i : int.MaxValue;

        var folders = new List<Node>();
        var notes = new List<Node>();

        foreach (var entry in Directory.EnumerateFileSystemEntries(dir))
        {
            var name = Path.GetFileName(entry);
            if (name.StartsWith('.')) continue;

            var rel = string.IsNullOrEmpty(prefix) ? name : $"{prefix}/{name}";
            if (Directory.Exists(entry))
            {
                folders.Add(new Node
                {
                    Path = rel,
                    Name = name,
                    Folder = true,
                    Children = ReadTree(entry, rel, order),
                });
            }
            else if (IsNoteFile(entry))
            {
                notes.Add(new Node
                {
                    Path = rel,
                    Name = Path.GetFileNameWithoutExtension(entry),
                    Folder = false,
                });
            }
        }

        int Compare(Node a, Node b)
        {
            var byRank = Rank(a.Path).CompareTo(Rank(b.Path));
            return byRank != 0
                ? byRank
                : string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase);
        }

        folders.Sort(Compare);
        notes.Sort(Compare);
        folders.AddRange(notes);
        return folders;
    }

    public VaultInfo GetVaultInfo()
    {
        var vault = VaultDir;
        var settings = LoadSettings();
        return new VaultInfo
        {
            Path = vault,
            Notes = ReadTree(vault, "", settings.Order),
            LastNote = settings.LastNote,
            Pinned = settings.Pinned,
        };
    }

    public VaultInfo SetVault(string path)
    {
        var trimmed = (path ?? "").Trim();
        if (!Path.IsPathFullyQualified(trimmed))
            throw new InvalidOperationException("Choose an absolute folder path.");

        var dir = Path.GetFullPath(trimmed);
        Directory.CreateDirectory(dir);

        var settings = LoadSettings();
        settings.Vault = dir;
        SaveSettings(settings);
        return GetVaultInfo();
    }

    public void RevealVault()
    {
        var dir = VaultDir;
        var start = OperatingSystem.IsWindows()
            ? new ProcessStartInfo("explorer.exe") { UseShellExecute = true, Arguments = $"\"{dir}\"" }
            : OperatingSystem.IsMacOS()
                ? new ProcessStartInfo("open") { UseShellExecute = true, Arguments = $"\"{dir}\"" }
                : new ProcessStartInfo("xdg-open") { UseShellExecute = true, Arguments = $"\"{dir}\"" };
        Process.Start(start);
    }

    // ------------------------------------------------------------- commands

    public List<string> SetPinned(List<string> paths)
    {
        var settings = LoadSettings();
        settings.Pinned = paths;
        SaveSettings(settings);
        return settings.Pinned;
    }

    public AppSettings GetAppSettings()
    {
        var settings = LoadSettings();
        return new AppSettings
        {
            Theme = settings.Theme == "classic" ? "classic" : "neo",
            Appearance = NormalizeAppearance(settings.Appearance),
            EditorTheme = NormalizeEditorTheme(settings.EditorTheme),
            Fonts = settings.NoteFonts,
            Spacing = settings.NoteSpacing,
            Sizes = settings.NoteSizes,
            ReadNotes = settings.ReadNotes ?? new(),
            CollapsedFolders = settings.CollapsedFolders ?? new(),
            SidebarWidth = settings.SidebarWidth == 0 ? 300u : settings.SidebarWidth,
            TitleInline = settings.TitleInline,
        };
    }

    public void SetTitleInline(bool inline)
    {
        var settings = LoadSettings();
        settings.TitleInline = inline;
        SaveSettings(settings);
    }

    public void SetNoteSpacing(string path, float spacing)
    {
        var settings = LoadSettings();
        if (Math.Abs(spacing - 1.6f) < 0.005f) settings.NoteSpacing.Remove(path);
        else settings.NoteSpacing[path] = Math.Clamp(spacing, 1.1f, 2.4f);
        SaveSettings(settings);
    }

    public void SetNoteSize(string path, float size)
    {
        var settings = LoadSettings();
        if (Math.Abs(size - 16f) < 0.5f) settings.NoteSizes.Remove(path);
        else settings.NoteSizes[path] = Math.Clamp(size, 8f, 72f);
        SaveSettings(settings);
    }

    public void SetSidebarWidth(uint width)
    {
        var settings = LoadSettings();
        settings.SidebarWidth = Math.Clamp(width, 200u, 640u);
        SaveSettings(settings);
    }

    public void SetNoteFont(string path, string font)
    {
        var settings = LoadSettings();
        if (string.IsNullOrWhiteSpace(font)) settings.NoteFonts.Remove(path);
        else settings.NoteFonts[path] = font;
        SaveSettings(settings);
    }

    public void SetLastNote(string path)
    {
        var settings = LoadSettings();
        var next = string.IsNullOrWhiteSpace(path) ? null : path;
        if (settings.LastNote == next) return;
        settings.LastNote = next;
        SaveSettings(settings);
    }

    public void SetOrder(List<string> paths)
    {
        var settings = LoadSettings();
        settings.Order = paths.Take(5000).ToList();
        SaveSettings(settings);
    }

    public void SetTheme(string theme)
    {
        var settings = LoadSettings();
        settings.Theme = theme == "classic" ? "classic" : "neo";
        SaveSettings(settings);
    }

    /// <summary>
    /// Light, dark, or system. System is resolved by the shell (which owns the
    /// OS theme) for the native chrome; the page resolves it for the palette.
    /// </summary>
    public void SetAppearance(string appearance)
    {
        var settings = LoadSettings();
        settings.Appearance = NormalizeAppearance(appearance);
        SaveSettings(settings);
    }

    private static string NormalizeAppearance(string? appearance) =>
        appearance is "light" or "dark" or "system" ? appearance : "system";

    /// <summary>
    /// Synced, light, or dark for the note surface only. The shell does not
    /// apply this to the native chrome; the page resolves whether it follows
    /// <see cref="Settings.Appearance"/> or stays pinned.
    /// </summary>
    public void SetEditorTheme(string editorTheme)
    {
        var settings = LoadSettings();
        settings.EditorTheme = NormalizeEditorTheme(editorTheme);
        SaveSettings(settings);
    }

    private static string NormalizeEditorTheme(string? editorTheme) =>
        editorTheme is "light" or "dark" ? editorTheme : "synced";

    /// <summary>Read mode belongs to the note, not to the session.</summary>
    public void SetNoteRead(string path, bool read)
    {
        var settings = LoadSettings();
        settings.ReadNotes ??= new List<string>();
        settings.ReadNotes.RemoveAll(p => string.Equals(p, path, StringComparison.OrdinalIgnoreCase));
        if (read && !string.IsNullOrWhiteSpace(path)) settings.ReadNotes.Add(path);
        SaveSettings(settings);
    }

    /// <summary>Closed folders, so the sidebar comes back as it was left.</summary>
    public void SetCollapsedFolders(IEnumerable<string> paths)
    {
        var settings = LoadSettings();
        settings.CollapsedFolders = paths.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct().ToList();
        SaveSettings(settings);
    }

    public void CreateFolder(string path) => Directory.CreateDirectory(Resolve(path));

    public string ReadNote(string path)
    {
        var file = NoteFile(path);
        if (!File.Exists(file)) return "";

        var body = File.ReadAllText(file);

        /* Photos used to live inside the markdown as data URIs. A note with a
           couple of them reached several megabytes, and every open paid for it
           twice: once crossing the bridge as a script, once as HTML to parse.
           Externalising happens here, on the way out, so the page never sees the
           big body. The old file is kept beside it as .bak. */
        var smaller = ExternaliseImages(body);
        if (!string.Equals(smaller, body, StringComparison.Ordinal))
        {
            try
            {
                File.Copy(file, file + ".bak", true);
                var tmp = file + ".tmp";
                File.WriteAllText(tmp, smaller);
                File.Move(tmp, file, true);
                body = smaller;
            }
            catch
            {
                // A read must still succeed even if the tidy-up does not.
            }
        }

        return ForPage(body);
    }

    public string WriteNote(string path, string body)
    {
        var file = NoteFile(path);
        var parent = Path.GetDirectoryName(file);
        if (parent is not null) Directory.CreateDirectory(parent);

        // The page works in file:// URLs for attachments; the file keeps them
        // relative so the vault stays portable.
        var onDisk = ExternaliseImages(ForDisk(body));

        // Write a sibling and swap it in, so a crash mid-save cannot truncate.
        var tmp = file + ".tmp";
        File.WriteAllText(tmp, onDisk);
        File.Move(tmp, file, true);
        return file;
    }

    // ------------------------------------------------------------ attachments

    public const string AttachmentsDir = ".attachments";

    private static readonly Regex InlineImage = new(
        @"data:image/(?<ext>png|jpe?g|gif|webp|bmp);base64,(?<data>[A-Za-z0-9+/=]+)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private string AttachmentsUrl
    {
        get
        {
            var dir = VaultDir;
            if (!dir.EndsWith(Path.DirectorySeparatorChar)) dir += Path.DirectorySeparatorChar;
            return new Uri(dir).AbsoluteUri + AttachmentsDir + "/";
        }
    }

    /// <summary>
    /// Moves every inline image into .attachments, named by content hash so the
    /// same picture is stored once. Returns the original text if any image fails
    /// to decode, so a note is never left half converted.
    /// </summary>
    private string ExternaliseImages(string body)
    {
        if (body.IndexOf("data:image/", StringComparison.OrdinalIgnoreCase) < 0) return body;

        var dir = Path.Combine(VaultDir, AttachmentsDir);
        try { Directory.CreateDirectory(dir); } catch { return body; }

        var ok = true;
        var rewritten = InlineImage.Replace(body, match =>
        {
            try
            {
                var ext = match.Groups["ext"].Value.ToLowerInvariant() switch
                {
                    "jpeg" => "jpg",
                    var other => other
                };
                var bytes = Convert.FromBase64String(match.Groups["data"].Value);
                var hash = Convert.ToHexString(SHA1.HashData(bytes)).ToLowerInvariant();
                var name = hash + "." + ext;
                var file = Path.Combine(dir, name);

                if (!File.Exists(file))
                {
                    var tmp = file + ".tmp";
                    File.WriteAllBytes(tmp, bytes);
                    File.Move(tmp, file, true);
                }

                return AttachmentsDir + "/" + name;
            }
            catch
            {
                ok = false;
                return match.Value;
            }
        });

        return ok ? rewritten : body;
    }

    private string ForPage(string body) =>
        body.IndexOf(AttachmentsDir + "/", StringComparison.Ordinal) < 0
            ? body
            : body.Replace(AttachmentsDir + "/", AttachmentsUrl);

    private string ForDisk(string body) =>
        body.Replace(AttachmentsUrl, AttachmentsDir + "/");

    public void DeleteNote(string path)
    {
        var file = NoteFile(path);
        if (!File.Exists(file)) return;

        var trash = Path.Combine(VaultDir, ".trash");
        Directory.CreateDirectory(trash);

        var name = Path.GetFileName(file);
        var stem = Path.GetFileNameWithoutExtension(file);
        var ext = Path.GetExtension(file);
        var target = Path.Combine(trash, name);
        var n = 1;
        while (File.Exists(target) || Directory.Exists(target))
            target = Path.Combine(trash, $"{stem} {n++}{ext}");

        File.Move(file, target);
    }

    public string RenameNote(string from, string to)
    {
        var src = NoteFile(from);
        var dst = NoteFile(to);
        if (!File.Exists(src)) throw new InvalidOperationException($"No such note: {from}");
        if (File.Exists(dst) || Directory.Exists(dst))
            throw new InvalidOperationException($"{to} already exists.");

        var parent = Path.GetDirectoryName(dst);
        if (parent is not null) Directory.CreateDirectory(parent);
        File.Move(src, dst);
        return dst;
    }

    public string RenameFolder(string from, string to)
    {
        var src = Resolve(from);
        var dst = Resolve(to);
        if (!Directory.Exists(src)) throw new InvalidOperationException($"No such folder: {from}");
        if (File.Exists(dst) || Directory.Exists(dst))
            throw new InvalidOperationException($"{to} already exists.");

        var parent = Path.GetDirectoryName(dst);
        if (parent is not null) Directory.CreateDirectory(parent);
        Directory.Move(src, dst);
        return to;
    }

    public void DeleteFolder(string path)
    {
        var dir = Resolve(path);
        if (!Directory.Exists(dir)) throw new InvalidOperationException($"No such folder: {path}");

        var vault = Path.GetFullPath(VaultDir);
        if (Path.GetFullPath(dir).Equals(vault, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("That is the notes folder itself.");

        var trash = Path.Combine(vault, ".trash");
        Directory.CreateDirectory(trash);

        var name = Path.GetFileName(dir);
        var target = Path.Combine(trash, name);
        var n = 1;
        while (File.Exists(target) || Directory.Exists(target))
            target = Path.Combine(trash, $"{name} {n++}");

        Directory.Move(dir, target);
    }

    public List<string> ImportFiles(List<string> paths)
    {
        var vault = VaultDir;
        var imported = new List<string>();

        foreach (var raw in paths)
        {
            var src = (raw ?? "").Trim();
            if (src.Length == 0 || !File.Exists(src) || !IsNoteFile(src)) continue;

            var stem = Path.GetFileNameWithoutExtension(src);
            var ext = Path.GetExtension(src).ToLowerInvariant();
            var name = $"{stem}{ext}";
            var n = 2;
            while (File.Exists(Path.Combine(vault, name)) || Directory.Exists(Path.Combine(vault, name)))
                name = $"{stem} {n++}{ext}";

            File.Copy(src, Path.Combine(vault, name));
            imported.Add(name);
        }

        if (imported.Count == 0)
            throw new InvalidOperationException("Only .md and .txt files can be dropped in.");
        return imported;
    }

    public string MoveEntry(string from, string to)
    {
        var src = Resolve(from);
        var dst = Resolve(to);
        var srcIsDir = Directory.Exists(src);

        if (!srcIsDir && !File.Exists(src))
            throw new InvalidOperationException($"Nothing to move at {from}");
        if (File.Exists(dst) || Directory.Exists(dst))
            throw new InvalidOperationException($"{to} already exists.");
        if (srcIsDir)
        {
            var srcFull = Path.GetFullPath(src) + Path.DirectorySeparatorChar;
            if (Path.GetFullPath(dst).StartsWith(srcFull, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("A folder cannot be moved inside itself.");
        }

        var parent = Path.GetDirectoryName(dst);
        if (parent is not null) Directory.CreateDirectory(parent);
        if (srcIsDir) Directory.Move(src, dst);
        else File.Move(src, dst);

        var settings = LoadSettings();
        string Rewrite(string p) =>
            p == from ? to
            : p.StartsWith(from + "/", StringComparison.Ordinal) ? to + p[from.Length..]
            : p;

        settings.Order = settings.Order.Select(Rewrite).ToList();
        settings.Pinned = settings.Pinned.Select(Rewrite).ToList();
        settings.LastNote = settings.LastNote is null ? null : Rewrite(settings.LastNote);
        RenameKeys(settings.NoteFonts, Rewrite);
        RenameKeys(settings.NoteSpacing, Rewrite);
        RenameKeys(settings.NoteSizes, Rewrite);
        SaveSettings(settings);

        return to;
    }

    private static void RenameKeys<T>(Dictionary<string, T> map, Func<string, string> rewrite)
    {
        var moved = map.Keys
            .Select(key => (Old: key, New: rewrite(key)))
            .Where(pair => pair.Old != pair.New)
            .ToList();

        foreach (var (oldKey, newKey) in moved)
        {
            if (map.Remove(oldKey, out var value)) map[newKey] = value;
        }
    }

    // -------------------------------------------------------------- avatar

    public string? GetAvatar()
    {
        var avatar = LoadSettings().Avatar;
        return avatar is not null && File.Exists(avatar) ? ToDataUri(avatar) : null;
    }

    public string SetAvatar(string source)
    {
        const long maxBytes = 8 * 1024 * 1024;

        var src = (source ?? "").Trim();
        if (!File.Exists(src)) throw new InvalidOperationException("Choose an image file.");

        var size = new FileInfo(src).Length;
        if (size > maxBytes)
            throw new InvalidOperationException(
                $"That image is {size / 1_048_576.0:F1} MB — keep it under 8 MB.");

        Directory.CreateDirectory(ConfigDir);
        var ext = Path.GetExtension(src).TrimStart('.').ToLowerInvariant();
        if (ext.Length == 0) ext = "png";
        var dest = Path.Combine(ConfigDir, "avatar." + ext);
        File.Copy(src, dest, true);

        var settings = LoadSettings();
        settings.Avatar = dest;
        SaveSettings(settings);
        return ToDataUri(dest);
    }

    private static string ToDataUri(string path)
    {
        var mime = Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            _ => "image/jpeg",
        };
        return $"data:{mime};base64,{Convert.ToBase64String(File.ReadAllBytes(path))}";
    }
}
