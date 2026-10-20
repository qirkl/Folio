using System.Runtime.InteropServices;
using System.Text.Encodings.Web;
using System.Text.Json;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using Avalonia.Platform.Storage;
using Avalonia.Styling;
using Folio.Core;

namespace Folio.Desktop;

/// <summary>
/// Translates the page's Tauri calls into the C# vault service. The page is
/// unchanged: a small shim defines <c>window.__TAURI__</c> before its own
/// scripts run, so the same frontend works in Tauri and in Avalonia.
/// </summary>
public sealed class Bridge
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly Window _window;
    private readonly NativeWebView _webView;
    private readonly VaultService _vault;

    public Bridge(Window window, NativeWebView webView, VaultService vault)
    {
        _window = window;
        _webView = webView;
        _vault = vault;
    }

    public void Attach() => _webView.WebMessageReceived += OnWebMessage;

    private async void OnWebMessage(object? sender, WebMessageReceivedEventArgs e)
    {
        long id = 0;
        try
        {
            using var doc = JsonDocument.Parse(e.Body ?? "");
            var root = doc.RootElement;

            id = root.TryGetProperty("id", out var idElement) ? idElement.GetInt64() : 0;
            var cmd = root.TryGetProperty("cmd", out var cmdElement)
                ? cmdElement.GetString() ?? ""
                : "";
            var args = root.TryGetProperty("args", out var argsElement) ? argsElement : default;

            try
            {
                var result = await Handle(cmd, args);
                await Resolve(id, true, result);
            }
            catch (Exception ex)
            {
                await Resolve(id, false, ex.Message);
            }
        }
        catch
        {
            // A malformed message is not worth taking the app down for.
            if (id != 0) await Resolve(id, false, "Malformed bridge message.");
        }
    }

    private async Task<object?> Handle(string cmd, JsonElement args)
    {
        switch (cmd)
        {
            case "vault": return _vault.GetVaultInfo();
            case "set_vault": return _vault.SetVault(Str(args, "path"));
            case "settings": return _vault.GetAppSettings();
            case "set_order": _vault.SetOrder(StringArray(args, "paths").ToList()); return null;
            case "set_pinned": return _vault.SetPinned(StringArray(args, "paths").ToList());
            case "set_theme": _vault.SetTheme(Str(args, "theme")); return null;
            case "set_appearance":
                var appearance = Str(args, "appearance");
                _vault.SetAppearance(appearance);
                _window.RequestedThemeVariant = VariantFor(appearance);
                return null;
            case "set_editor_theme": _vault.SetEditorTheme(Str(args, "theme")); return null;
            case "system_scheme": return SchemeFor();
            case "set_note_font": _vault.SetNoteFont(Str(args, "path"), Str(args, "font")); return null;
            case "set_note_spacing": _vault.SetNoteSpacing(Str(args, "path"), Float(args, "spacing")); return null;
            case "set_note_size": _vault.SetNoteSize(Str(args, "path"), Float(args, "size")); return null;
            case "set_sidebar_width": _vault.SetSidebarWidth(UInt(args, "width")); return null;
            case "set_title_inline": _vault.SetTitleInline(Bool(args, "inline")); return null;
            case "set_last_note": _vault.SetLastNote(Str(args, "path")); return null;
            case "set_app_icon":
                _vault.SetAppIcon(Str(args, "name"));
                ApplyIcon(args);
                return null;
            case "import_files": return _vault.ImportFiles(StringArray(args, "paths").ToList());
            case "reveal_vault": _vault.RevealVault(); return null;
            case "create_folder": _vault.CreateFolder(Str(args, "path")); return null;
            case "rename_folder": return _vault.RenameFolder(Str(args, "from"), Str(args, "to"));
            case "delete_folder": _vault.DeleteFolder(Str(args, "path")); return null;
            case "read_note": return _vault.ReadNote(Str(args, "path"));
            case "write_note": return _vault.WriteNote(Str(args, "path"), Str(args, "body"));
            case "delete_note": _vault.DeleteNote(Str(args, "path")); return null;
            case "rename_note": return _vault.RenameNote(Str(args, "from"), Str(args, "to"));
            case "move_entry": return _vault.MoveEntry(Str(args, "from"), Str(args, "to"));
            case "avatar": return _vault.GetAvatar();
            case "set_avatar": return _vault.SetAvatar(Str(args, "source"));

            // The shell itself. These are not vault operations.
            case "dialog.open": return await OpenDialog(args);
            case "window.minimize": _window.WindowState = WindowState.Minimized; return null;
            case "window.close": _window.Close(); return null;
            case "window.toggleMaximize": ToggleMaximize(); return null;
            case "window.isMaximized": return _window.WindowState == WindowState.Maximized;
            case "window.drag": BeginDrag(); return null;

            default:
                throw new InvalidOperationException($"Unknown command: {cmd}");
        }
    }

    private async Task<string?> OpenDialog(JsonElement args)
    {
        var directory = Bool(args, "directory");
        var multiple = Bool(args, "multiple");
        var title = Str(args, "title", directory ? "Choose a folder" : "Choose a file");

        if (directory)
        {
            var folders = await _window.StorageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
            {
                Title = title,
                AllowMultiple = multiple,
            });
            return folders.Count > 0 ? folders[0].TryGetLocalPath() : null;
        }

        var types = new List<FilePickerFileType>();
        if (args.TryGetProperty("filters", out var filters) && filters.ValueKind == JsonValueKind.Array)
        {
            foreach (var filter in filters.EnumerateArray())
            {
                var name = filter.TryGetProperty("name", out var n) ? n.GetString() ?? "Files" : "Files";
                var patterns = filter.TryGetProperty("extensions", out var extensions) &&
                               extensions.ValueKind == JsonValueKind.Array
                    ? extensions.EnumerateArray()
                        .Select(x => x.GetString() ?? "")
                        .Where(x => x.Length > 0)
                        .Select(x => x.StartsWith('.') ? "*" + x : "*." + x)
                        .ToArray()
                    : Array.Empty<string>();
                types.Add(new FilePickerFileType(name) { Patterns = patterns });
            }
        }

        var files = await _window.StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = title,
            AllowMultiple = multiple,
            FileTypeFilter = types.Count > 0 ? types : null,
        });
        return files.Count > 0 ? files[0].TryGetLocalPath() : null;
    }

    private void ToggleMaximize() =>
        _window.WindowState = _window.WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;

    private void BeginDrag()
    {
        if (!OperatingSystem.IsWindows()) return;

        var handle = _window.TryGetPlatformHandle();
        if (handle is null) return;

        ReleaseCapture();
        SendMessage(handle.Handle, WM_NCLBUTTONDOWN, (IntPtr)HTCAPTION, IntPtr.Zero);
    }

    private void ApplyIcon(JsonElement args)
    {
        var size = (int)UInt(args, "size");
        if (size <= 0) return;
        if (!args.TryGetProperty("rgba", out var rgba) || rgba.ValueKind != JsonValueKind.Array) return;

        var source = rgba.EnumerateArray().Select(x => (byte)x.GetInt32()).ToArray();
        if (source.Length != size * size * 4) return;

        // The page hands over RGBA; Avalonia's bitmap wants BGRA.
        var pixels = new byte[source.Length];
        for (var i = 0; i < size * size; i++)
        {
            pixels[i * 4 + 0] = source[i * 4 + 2];
            pixels[i * 4 + 1] = source[i * 4 + 1];
            pixels[i * 4 + 2] = source[i * 4 + 0];
            pixels[i * 4 + 3] = source[i * 4 + 3];
        }

        var bitmap = new WriteableBitmap(
            new PixelSize(size, size),
            new Vector(96, 96),
            PixelFormat.Bgra8888,
            AlphaFormat.Unpremul);

        using (var frame = bitmap.Lock())
        {
            for (var y = 0; y < size; y++)
            {
                Marshal.Copy(
                    pixels,
                    y * size * 4,
                    IntPtr.Add(frame.Address, y * frame.RowBytes),
                    size * 4);
            }
        }

        using var stream = new MemoryStream();
#pragma warning disable CS0618 // the replacement overload is not in Avalonia 12.1
        bitmap.Save(stream);
#pragma warning restore CS0618
        stream.Position = 0;
        _window.Icon = new WindowIcon(stream);
    }

    private async Task Resolve(long id, bool ok, object? payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var script = $"window.__folioResolve({id}, {(ok ? "true" : "false")}, {json});";
        try
        {
            await _webView.InvokeScript(script);
        }
        catch
        {
            // The page may have navigated away or the window may be closing.
        }
    }

    // ---------------------------------------------------------------- helpers

    private static string Str(JsonElement args, string name, string fallback = "")
    {
        if (args.ValueKind != JsonValueKind.Object ||
            !args.TryGetProperty(name, out var value) ||
            value.ValueKind != JsonValueKind.String)
        {
            return fallback;
        }
        return value.GetString() ?? fallback;
    }

    private static string[] StringArray(JsonElement args, string name)
    {
        if (args.ValueKind != JsonValueKind.Object ||
            !args.TryGetProperty(name, out var value) ||
            value.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }
        return value.EnumerateArray().Select(x => x.GetString() ?? "").ToArray();
    }

    private static float Float(JsonElement args, string name, float fallback = 0) =>
        args.ValueKind == JsonValueKind.Object &&
        args.TryGetProperty(name, out var value) &&
        value.ValueKind == JsonValueKind.Number
            ? value.GetSingle()
            : fallback;

    private static uint UInt(JsonElement args, string name, uint fallback = 0) =>
        args.ValueKind == JsonValueKind.Object &&
        args.TryGetProperty(name, out var value) &&
        value.ValueKind == JsonValueKind.Number
            ? value.GetUInt32()
            : fallback;

    private static bool Bool(JsonElement args, string name, bool fallback = false) =>
        args.ValueKind == JsonValueKind.Object &&
        args.TryGetProperty(name, out var value) &&
        value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean()
            : fallback;

    private const int WM_NCLBUTTONDOWN = 0xA1;
    private static readonly IntPtr HTCAPTION = new(2);

    /// <summary>Maps the stored appearance to the theme variant the native
    /// chrome should use. System follows the OS rather than pinning a variant.</summary>
    internal static ThemeVariant VariantFor(string appearance) => appearance switch
    {
        "light" => ThemeVariant.Light,
        "dark" => ThemeVariant.Dark,
        _ => ThemeVariant.Default,
    };

    /// <summary>The OS scheme, independent of the app's own variant.</summary>
    internal static string SchemeFor() =>
        Application.Current?.PlatformSettings?.GetColorValues().ThemeVariant == PlatformThemeVariant.Dark
            ? "dark"
            : "light";

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
}
