using Avalonia;

namespace Folio.Desktop;

internal static class Program
{
    [STAThread]
    public static void Main(string[] args) =>
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);

    public static AppBuilder BuildAvaloniaApp()
    {
        var builder = AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();

        // The rounded acrylic backdrop is Windows-only; the other platforms get
        // their own compositor behaviour and ignore these options.
        if (OperatingSystem.IsWindows())
        {
            builder = builder.With(new Win32PlatformOptions
            {
                // WinUIComposition is the only mode that can composite a blur
                // behind the window. The fallbacks keep the app usable on older
                // machines and remote sessions.
                CompositionMode = new[]
                {
                    Win32CompositionMode.WinUIComposition,
                    Win32CompositionMode.DirectComposition,
                    Win32CompositionMode.RedirectionSurface,
                },

                // This is the piece Tauri made us fight for: it rounds the blur
                // brush itself, so the backdrop follows the same 8px curve as
                // the DWM window border on Windows 11.
                WinUICompositionBackdropCornerRadius = (float)WindowChrome.Radius,
            });
        }

        return builder;
    }
}
