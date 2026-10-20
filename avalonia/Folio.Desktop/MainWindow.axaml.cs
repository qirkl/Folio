using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Platform;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using Folio.Core;

namespace Folio.Desktop;

public partial class MainWindow : Window
{
    private readonly VaultService _vault;
    private readonly Bridge _bridge;

    public MainWindow()
    {
        InitializeComponent();

        // One fixed icon. Offering a choice of them never looked reliable on
        // Windows, where the taskbar caches icons, and macOS would need its own
        // mechanism entirely.
        var iconFile = Path.Combine(AppContext.BaseDirectory, "icon.ico");
        if (File.Exists(iconFile)) Icon = new WindowIcon(iconFile);

        _vault = new VaultService();
        _bridge = new Bridge(this, Web, _vault);
        _bridge.Attach();

        Opened += (_, _) =>
        {
            WindowChrome.Apply(this);
            UpdateChrome();
            LoadFrontend();
            ApplySavedAppearance();
            WatchSystemTheme();
        };

        PropertyChanged += (_, e) =>
        {
            if (e.Property == WindowStateProperty)
            {
                UpdateChrome();
                NotifyResized();
            }
        };

        // Native file drops. The page listens for Tauri's drag events, so the
        // shell forwards them under the same names.
        DragDrop.SetAllowDrop(this, true);
        AddHandler(DragDrop.DragEnterEvent, OnDragEnter);
        AddHandler(DragDrop.DragLeaveEvent, OnDragLeave);
        AddHandler(DragDrop.DropEvent, OnDrop);
    }

    private void UpdateChrome()
    {
        // A maximized window is square; the rounded clip is only for the
        // floating state, and matches the DWM border radius otherwise.
        RootBorder.CornerRadius = WindowState == WindowState.Maximized
            ? new CornerRadius(0)
            : new CornerRadius(WindowChrome.Radius);
    }

    /// <summary>Pins the native chrome to the saved light/dark/system choice.</summary>
    private void ApplySavedAppearance()
    {
        RequestedThemeVariant = Bridge.VariantFor(_vault.LoadSettings().Appearance);
    }

    /// <summary>
    /// The OS can switch light/dark while the app is open. The page gets the
    /// news so it can repaint when the preference is System, and the native
    /// variant is re-applied so the window frame and the page never disagree.
    /// </summary>
    private void WatchSystemTheme()
    {
        var settings = Application.Current?.PlatformSettings;
        if (settings is null) return;

        settings.ColorValuesChanged += (_, e) =>
        {
            Dispatcher.UIThread.Post(() =>
            {
                ApplySavedAppearance();
                var scheme = e.ThemeVariant == PlatformThemeVariant.Dark ? "dark" : "light";
                var payload = System.Text.Json.JsonSerializer.Serialize(scheme);
                _ = Web.InvokeScript($"window.__folioEmit('system-scheme', {payload});");
            });
        };
    }

    private void LoadFrontend()
    {
        var webRoot = Path.Combine(AppContext.BaseDirectory, "web");
        var indexPath = Path.Combine(webRoot, "index.html");
        if (!File.Exists(indexPath))
        {
            throw new FileNotFoundException(
                $"The frontend was not copied next to the app: {indexPath}", indexPath);
        }

        var html = File.ReadAllText(indexPath);

        // The page checks for window.__TAURI__ before its own scripts run, so
        // the shim has to be the first thing in <head>.
        const string head = "<head>";
        var at = html.IndexOf(head, StringComparison.OrdinalIgnoreCase);
        if (at < 0) throw new InvalidOperationException("index.html has no <head>.");
        html = html.Insert(at + head.Length, "<script>\n" + BridgeScript + "\n</script>");

        // Navigate to a real file rather than NavigateToString: relative paths
        // (assets/, js/) then resolve exactly as they do in the Tauri build.
        var hostPath = Path.Combine(webRoot, "__host.html");
        File.WriteAllText(hostPath, html);
        Web.Navigate(new Uri(hostPath));
    }

    private void NotifyResized()
    {
        _ = Web.InvokeScript("window.__folioEmit('resized', null);");
    }

    private void OnDragEnter(object? sender, DragEventArgs e)
    {
        _ = Web.InvokeScript("window.__folioEmit('tauri://drag-enter', null);");
    }

    private void OnDragLeave(object? sender, DragEventArgs e)
    {
        _ = Web.InvokeScript("window.__folioEmit('tauri://drag-leave', null);");
    }

    private void OnDrop(object? sender, DragEventArgs e)
    {
        var paths = e.DataTransfer.TryGetFiles()?
            .Select(item => item.TryGetLocalPath())
            .Where(path => !string.IsNullOrEmpty(path))
            .ToArray() ?? Array.Empty<string>();

        var payload = System.Text.Json.JsonSerializer.Serialize(new { paths });
        _ = Web.InvokeScript($"window.__folioEmit('tauri://drag-drop', {payload});");
    }

    /// <summary>
    /// The compatibility shim. It is deliberately tiny: it only implements the
    /// slice of Tauri's API that index.html actually calls. Everything else is
    /// a request/response message to <see cref="Bridge"/>.
    /// </summary>
    private const string BridgeScript = """
        (function () {
          var pending = new Map();
          var next = 1;

          function post(text) {
            if (typeof invokeCSharpAction === "function") { invokeCSharpAction(text); return; }
            if (window.chrome && window.chrome.webview) { window.chrome.webview.postMessage(text); return; }
            throw new Error("Folio native bridge is not available");
          }

          function send(cmd, args) {
            return new Promise(function (resolve, reject) {
              var id = next++;
              pending.set(id, { resolve: resolve, reject: reject });
              post(JSON.stringify({ id: id, cmd: cmd, args: args || {} }));
            });
          }

          window.__folioResolve = function (id, ok, payload) {
            var p = pending.get(id);
            if (!p) return;
            pending.delete(id);
            if (ok) p.resolve(payload);
            else p.reject(new Error(String(payload)));
          };

          window.__folioEvents = {};
          window.__folioEmit = function (name, payload) {
            if (name === "resized" && window.__folioOnResized) {
              try { window.__folioOnResized(); } catch (e) { console.error(e); }
              return;
            }
            var cb = window.__folioEvents[name];
            if (cb) {
              try { cb({ payload: payload }); } catch (e) { console.error(e); }
            }
          };

          window.__TAURI__ = {
            core: { invoke: function (cmd, args) { return send(cmd, args); } },
            dialog: { open: function (options) { return send("dialog.open", options || {}); } },
            window: {
              getCurrentWindow: function () {
                return {
                  minimize: function () { return send("window.minimize"); },
                  close: function () { return send("window.close"); },
                  toggleMaximize: function () { return send("window.toggleMaximize"); },
                  isMaximized: function () { return send("window.isMaximized"); },
                  onResized: function (cb) {
                    window.__folioOnResized = cb;
                    return Promise.resolve(function () {});
                  }
                };
              }
            },
            event: {
              listen: function (name, cb) {
                window.__folioEvents[name] = cb;
                return Promise.resolve(function () { delete window.__folioEvents[name]; });
              }
            }
          };

          // data-tauri-drag-region is a Tauri feature. Reproduce it with a
          // small movement threshold so a double-click can still maximize
          // instead of entering the native move loop on the first press.
          var press = null;
          document.addEventListener("pointerdown", function (e) {
            if (e.button !== 0) return;
            var drag = e.target && e.target.closest && e.target.closest("[data-tauri-drag-region]");
            if (!drag) return;
            press = { x: e.clientX, y: e.clientY };
          });
          document.addEventListener("pointermove", function (e) {
            if (!press) return;
            if (Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) < 4) return;
            press = null;
            send("window.drag").catch(function () {});
          });
          document.addEventListener("pointerup", function () { press = null; });
          document.addEventListener("dblclick", function (e) {
            var drag = e.target && e.target.closest && e.target.closest("[data-tauri-drag-region]");
            if (drag) send("window.toggleMaximize").catch(function () {});
          });

          // The page has its own right-click menus (notes, folders, editor).
          // The WebView's browser menu (Back, Refresh, Save as, Print) never
          // belongs in the app, so prevent its default action everywhere. The
          // page's own contextmenu handlers still run and show its menus.
          document.addEventListener("contextmenu", function (e) {
            e.preventDefault();
          }, true);
        })();
        """;
}
