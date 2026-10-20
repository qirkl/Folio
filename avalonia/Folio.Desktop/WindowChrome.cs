using System.Runtime.InteropServices;
using Avalonia.Controls;
using Avalonia.Platform;

namespace Folio.Desktop;

/// <summary>
/// The window's shape is owned by DWM on Windows 11: an 8px rounded corner
/// with a 1px accent border. The page is clipped to the same radius, so the
/// border and the content curve share a centre instead of fighting.
/// </summary>
internal static class WindowChrome
{
    /// <summary>Windows 11 rounded windows use an 8px radius at every scale;
    /// DWM scales it with the monitor DPI.</summary>
    public static double Radius => IsWindows11 ? 8 : 0;

    private static bool IsWindows11 =>
        OperatingSystem.IsWindows() && Environment.OSVersion.Version.Build >= 22000;

    /// <summary>Called once the HWND exists.</summary>
    public static void Apply(Window window)
    {
        if (!IsWindows11) return;

        var handle = window.TryGetPlatformHandle();
        if (handle is null) return;

        // Make the preference explicit rather than relying on the system
        // default, so the radius we clip to is the radius DWM draws.
        var preference = DwmWindowCornerPreference.Round;
        DwmSetWindowAttribute(
            handle.Handle,
            DwmWindowAttribute.WindowCornerPreference,
            ref preference,
            sizeof(int));
    }

    private enum DwmWindowAttribute
    {
        WindowCornerPreference = 33,
    }

    private enum DwmWindowCornerPreference
    {
        Round = 2,
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(
        IntPtr hwnd,
        DwmWindowAttribute attribute,
        ref DwmWindowCornerPreference value,
        int size);
}
