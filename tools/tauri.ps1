#!/usr/bin/env pwsh
#
# Build or run the desktop app.
#
#   pwsh -File tools/tauri.ps1 dev     # compile and launch, hot-editable frontend
#   pwsh -File tools/tauri.ps1 build   # release build + NSIS installer
#   pwsh -File tools/tauri.ps1 run     # launch the last release build
#
# Two things on this machine are not where you would expect, so this script
# fixes them up rather than making you remember:
#
#   1. Scoop installs rustup into `persist\rustup`, not `shims`, so cargo and
#      rustc are not on PATH by default.
#   2. We build with the GNU toolchain (`stable-x86_64-pc-windows-gnu`) because
#      MSVC Build Tools are not installed, and it needs mingw's gcc, ar and
#      windres on PATH to link.
#
# And one that is not obvious at all: the resource compiler cannot cope with a
# space in the *target* directory. `embed-resource` calls
#
#   windres --input <rc> --output <a> --include-dir $OUT_DIR --output-format=coff
#
# and windres forwards --include-dir to cc1 without quoting, so a path like
# `...\Documents\Default Project\src-tauri\target\...\out` is truncated at the
# space and the build dies with `cc1.exe: fatal error: Project\...: No such
# file or directory`. Pointing CARGO_TARGET_DIR at a space-free folder avoids
# it entirely - which is why the build output lives outside the repo.
#
# Tauri only officially supports the MSVC target on Windows. If this build
# fails at link time, install the MSVC toolchain instead:
#
#   scoop bucket add extras
#   scoop install extras/visualstudio2022buildtools extras/visualstudio2022-workload-vctools
#   rustup default stable-msvc
#
# and then delete the `gcc` entry from PATH below.

param([ValidateSet('dev', 'build', 'run')][string]$Task = 'dev')

$ErrorActionPreference = 'Stop'

$env:CARGO_HOME  = "$env:USERPROFILE\scoop\persist\rustup\.cargo"
$env:RUSTUP_HOME = "$env:USERPROFILE\scoop\persist\rustup\.rustup"
$env:CARGO_TARGET_DIR = "$env:USERPROFILE\notes-target"   # see note above: no spaces, ever

$env:PATH = @(
    "$env:USERPROFILE\.bun\bin",                          # the tauri CLI itself
    "$env:CARGO_HOME\bin",                                # cargo, rustc, rustup
    "$env:USERPROFILE\scoop\apps\gcc\current\bin",        # gcc, ar, windres
    "$env:USERPROFILE\scoop\shims",                       # 7z, git
    $env:PATH
) -join ';'

$root  = Split-Path $PSScriptRoot -Parent
$tauri = "$env:USERPROFILE\.bun\bin\tauri.exe"

Push-Location $root
try {
    switch ($Task) {
        'dev'   { & $tauri dev }
        'build' { & $tauri build }
        'run'   { & "$env:CARGO_TARGET_DIR\release\folio.exe" }
    }
}
finally { Pop-Location }
