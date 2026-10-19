//! Folio — backend.
//!
//! The frontend is plain HTML/CSS/JS (no bundler), so everything that needs
//! the OS lives here. Notes are ordinary markdown files in an ordinary folder
//! on disk — one file per note, subfolders are folders — so the vault stays
//! portable, greppable and syncable with any other tool.

use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// ------------------------------------------------------------------ settings

/// Files the vault treats as notes: markdown, plus plain text from a notepad.
fn is_note_file(path: &Path) -> bool {
    match path.extension().map(|e| e.to_string_lossy().to_lowercase()) {
        Some(ext) => ext == "md" || ext == "txt",
        None => false,
    }
}

#[derive(Debug, Default, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
enum Theme {
    #[default]
    Neo,
    Classic,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default)] // a settings file written by an older version must still load
struct Settings {
    /// Where the notes live. `None` means "not chosen yet", which falls back
    /// to `Documents/Notes`.
    vault: Option<PathBuf>,
    /// A copy of the user's profile picture, inside the app config dir.
    avatar: Option<PathBuf>,
    /// Manual ordering, as vault-relative paths. Anything missing falls back to
    /// alphabetical, so new files still appear in a sensible place.
    order: Vec<String>,
    /// The note that was open last, as a vault-relative path, so a launch can
    /// pick up where the last session left off.
    last_note: Option<String>,
    /// Notes shown in the pinned section, in the order they were pinned.
    pinned: Vec<String>,
    /// `neo` keeps the translucent material; `classic` is a solid window.
    theme: Theme,
    /// Font family per note, keyed by vault-relative path. A note is a document
    /// with one typeface, so this belongs to the note rather than to a run of
    /// selected text — which also means text typed later inherits it.
    note_fonts: HashMap<String, String>,
    /// Line spacing per note, as a multiple.
    note_spacing: HashMap<String, f32>,
    /// Base text size per note, in px. The blocks carry their own spans, but a
    /// paragraph typed later would otherwise come out at the default.
    note_sizes: HashMap<String, f32>,
    /// Which app icon variant the window wears.
    #[serde(default = "default_icon")]
    app_icon: String,
    /// Whether the note's name sits in the page column above the prose instead
    /// of in its own bar above the toolbar.
    #[serde(default)]
    title_inline: bool,
    /// Sidebar width in logical pixels, set by dragging its edge.
    #[serde(default = "default_sidebar_width")]
    sidebar_width: u32,
}

fn default_icon() -> String {
    "galaxy".to_string()
}

fn default_sidebar_width() -> u32 {
    300
}

fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

fn load_settings(app: &AppHandle) -> Settings {
    config_file(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(config_file(app)?, json).map_err(|e| e.to_string())
}

// --------------------------------------------------------------- the vault

/// `Documents/Notes` — a folder the user can actually find in Explorer.
fn default_vault(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .document_dir()
        .map_err(|e| e.to_string())?
        .join("Notes"))
}

/// The notes folder in use, created on demand.
fn vault_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = match load_settings(app).vault {
        Some(chosen) => chosen,
        None => default_vault(app)?,
    };
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Resolves a vault-relative path, refusing anything that would escape the
/// vault (traversal, absolute paths) or that the OS will not accept.
fn resolve(app: &AppHandle, rel: &str) -> Result<PathBuf, String> {
    let vault = vault_dir(app)?;
    let cleaned = rel.trim().replace('\\', "/");
    let trimmed = cleaned.trim_matches('/');
    if trimmed.is_empty() {
        return Ok(vault);
    }
    if trimmed.chars().any(|c| ":*?\"<>|".contains(c)) {
        return Err(format!("Invalid path: {rel}"));
    }
    let relative = Path::new(trimmed);
    if relative.is_absolute()
        || relative
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err(format!("Invalid path: {rel}"));
    }
    Ok(vault.join(relative))
}

/// Same, but guaranteed to point at a note file: `Bordeaux` and
/// `Life/Bordeaux.md` both resolve, and other extensions are rejected.
fn note_file(app: &AppHandle, rel: &str) -> Result<PathBuf, String> {
    let path = resolve(app, rel)?;
    match path.extension().map(|e| e.to_string_lossy().to_lowercase()) {
        Some(ext) if ext == "md" || ext == "txt" => Ok(path),
        Some(_) => Err(format!("Not a note file: {rel}")),
        None => Ok(path.with_extension("md")),
    }
}

// ------------------------------------------------------------------- tree

#[derive(Debug, Serialize)]
struct Node {
    /// Vault-relative path, e.g. `Life/Sept 2024/Bordeaux.md`.
    path: String,
    /// Display name: a folder name, or a note's title without `.md`.
    name: String,
    folder: bool,
    children: Vec<Node>,
}

/// The vault contents. Sorted by the user's manual order where one exists,
/// then folders-first alphabetically for everything else.
fn read_tree(dir: &Path, prefix: &str, order: &[String]) -> Result<Vec<Node>, String> {
    let mut folders = Vec::new();
    let mut notes = Vec::new();
    let rank = |path: &str| -> usize {
        order.iter().position(|p| p.eq_ignore_ascii_case(path)).unwrap_or(usize::MAX)
    };

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())?.filter_map(Result::ok) {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let rel = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{prefix}/{name}")
        };

        if path.is_dir() {
            folders.push(Node {
                path: rel.clone(),
                name,
                folder: true,
                children: read_tree(&path, &rel, order)?,
            });
        } else if is_note_file(&path) {
            notes.push(Node {
                path: rel,
                name: path.file_stem().unwrap_or_default().to_string_lossy().into_owned(),
                folder: false,
                children: Vec::new(),
            });
        }
    }

    let by_name = |a: &Node, b: &Node| a.name.to_lowercase().cmp(&b.name.to_lowercase());
    folders.sort_by(|a, b| rank(&a.path).cmp(&rank(&b.path)).then_with(|| by_name(a, b)));
    notes.sort_by(|a, b| rank(&a.path).cmp(&rank(&b.path)).then_with(|| by_name(a, b)));
    folders.extend(notes);
    Ok(folders)
}

// ---------------------------------------------------------------- commands

#[derive(Debug, Serialize)]
struct VaultInfo {
    /// Absolute path of the notes folder, for display and for "show in folder".
    path: String,
    notes: Vec<Node>,
    /// What to reopen on launch; `None` when this is a fresh vault.
    last_note: Option<String>,
    /// Vault-relative paths shown in the pinned section, in order.
    pinned: Vec<String>,
}

/// The current vault: where it is, and what is in it. A plain helper so both
/// commands below can share it without going through the IPC machinery.
fn vault_info(app: &AppHandle) -> Result<VaultInfo, String> {
    let path = vault_dir(app)?;
    let settings = load_settings(app);
    Ok(VaultInfo {
        notes: read_tree(&path, "", &settings.order)?,
        path: path.to_string_lossy().into_owned(),
        last_note: settings.last_note,
        pinned: settings.pinned,
    })
}

/// Remember which notes are pinned, in the order given.
#[tauri::command]
fn set_pinned(app: AppHandle, paths: Vec<String>) -> Result<Vec<String>, String> {
    let mut settings = load_settings(&app);
    settings.pinned = paths;
    save_settings(&app, &settings)?;
    Ok(settings.pinned)
}

/// The bits of settings the page needs to render itself.
#[derive(Debug, Serialize)]
struct AppSettings {
    theme: String,
    fonts: HashMap<String, String>,
    spacing: HashMap<String, f32>,
    sizes: HashMap<String, f32>,
    app_icon: String,
    sidebar_width: u32,
    title_inline: bool,
}

#[tauri::command]
fn settings(app: AppHandle) -> AppSettings {
    let settings = load_settings(&app);
    AppSettings {
        theme: match settings.theme {
            Theme::Classic => "classic".to_string(),
            Theme::Neo => "neo".to_string(),
        },
        fonts: settings.note_fonts,
        spacing: settings.note_spacing,
        sizes: settings.note_sizes,
        app_icon: settings.app_icon,
        sidebar_width: settings.sidebar_width,
        title_inline: settings.title_inline,
    }
}

/// Whether the note's name is set in the page column.
#[tauri::command]
fn set_title_inline(app: AppHandle, inline: bool) -> Result<(), String> {
    let mut settings = load_settings(&app);
    settings.title_inline = inline;
    save_settings(&app, &settings)
}

/// Line spacing for one note. Anything at the default is stored as absent, so
/// settings stay small.
#[tauri::command]
fn set_note_spacing(app: AppHandle, path: String, spacing: f32) -> Result<(), String> {
    let mut settings = load_settings(&app);
    if (spacing - 1.6).abs() < 0.005 {
        settings.note_spacing.remove(&path);
    } else {
        settings.note_spacing.insert(path, spacing.clamp(1.1, 2.4));
    }
    save_settings(&app, &settings)
}

/// Base text size for one note, in px. The default is stored as absent, so
/// settings stay small.
#[tauri::command]
fn set_note_size(app: AppHandle, path: String, size: f32) -> Result<(), String> {
    let mut settings = load_settings(&app);
    if (size - 16.0).abs() < 0.5 {
        settings.note_sizes.remove(&path);
    } else {
        settings.note_sizes.insert(path, size.clamp(8.0, 72.0));
    }
    save_settings(&app, &settings)
}

/// Remember the sidebar width, clamped to something that leaves a usable note.
#[tauri::command]
fn set_sidebar_width(app: AppHandle, width: u32) -> Result<(), String> {
    let mut settings = load_settings(&app);
    settings.sidebar_width = width.clamp(200, 640);
    save_settings(&app, &settings)
}

/// Wear one of the bundled app icons on the window and taskbar.
///
/// The page decodes the PNG (it has a canvas; Rust would need an image decoder
/// and an extra feature) and hands over raw RGBA. Only the window icon can be
/// changed at runtime: Windows bakes the executable's own icon and the Start
/// Menu shortcut in at install time, so those need a reinstall.
#[tauri::command]
fn set_app_icon(
    app: AppHandle,
    window: tauri::WebviewWindow,
    name: String,
    rgba: Vec<u8>,
    size: u32,
) -> Result<(), String> {
    let expected = size as usize * size as usize * 4;
    if size == 0 || rgba.len() != expected {
        return Err(format!(
            "icon bytes are {} long, expected {expected} for {size}x{size}",
            rgba.len()
        ));
    }

    let image = tauri::image::Image::new_owned(rgba, size, size);
    window.set_icon(image).map_err(|e| e.to_string())?;

    let mut settings = load_settings(&app);
    settings.app_icon = name;
    save_settings(&app, &settings)
}

/// Set the typeface for one note. An empty family clears it back to the default.
#[tauri::command]
fn set_note_font(app: AppHandle, path: String, font: String) -> Result<(), String> {
    let mut settings = load_settings(&app);
    if font.trim().is_empty() {
        settings.note_fonts.remove(&path);
    } else {
        settings.note_fonts.insert(path, font);
    }
    save_settings(&app, &settings)
}

/// Remember which note is open, so the next launch can resume it. Skips the
/// write when nothing changed — this is called on every save.
#[tauri::command]
fn set_last_note(app: AppHandle, path: String) -> Result<(), String> {
    let mut settings = load_settings(&app);
    let next = if path.trim().is_empty() { None } else { Some(path) };
    if settings.last_note == next {
        return Ok(());
    }
    settings.last_note = next;
    save_settings(&app, &settings)
}

/// Persist the sidebar's manual ordering (vault-relative paths, top to bottom).
#[tauri::command]
fn set_order(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let mut settings = load_settings(&app);
    settings.order = paths.into_iter().take(5000).collect();
    save_settings(&app, &settings)
}

#[tauri::command]
fn vault(app: AppHandle) -> Result<VaultInfo, String> {
    vault_info(&app)
}

/// Point the app at a folder the user picked, and remember it for next launch.
#[tauri::command]
fn set_vault(app: AppHandle, path: String) -> Result<VaultInfo, String> {
    let dir = PathBuf::from(path.trim());
    if !dir.is_absolute() {
        return Err("Choose an absolute folder path.".into());
    }
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut settings = load_settings(&app);
    settings.vault = Some(dir);
    save_settings(&app, &settings)?;
    vault_info(&app)
}

/// Open the vault in Explorer / Finder / the desktop's file manager.
#[tauri::command]
fn reveal_vault(app: AppHandle) -> Result<(), String> {
    let dir = vault_dir(&app)?;
    #[cfg(target_os = "windows")]
    let mut cmd = std::process::Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut cmd = std::process::Command::new("open");
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut cmd = std::process::Command::new("xdg-open");
    cmd.arg(&dir).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Create a folder (its parents too) inside the vault.
#[tauri::command]
fn create_folder(app: AppHandle, path: String) -> Result<(), String> {
    let dir = resolve(&app, &path)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())
}

/// The markdown body of a note; empty string when the note does not exist yet.
#[tauri::command]
fn read_note(app: AppHandle, path: String) -> Result<String, String> {
    match fs::read_to_string(note_file(&app, &path)?) {
        Ok(body) => Ok(body),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Create or overwrite a note, returning its absolute path. Written to a
/// sibling temp file and swapped in, so a crash mid-save cannot truncate a note.
#[tauri::command]
fn write_note(app: AppHandle, path: String, body: String) -> Result<String, String> {
    let file = note_file(&app, &path)?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = file.with_extension("md.tmp");
    fs::write(&tmp, body.as_bytes()).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &file).map_err(|e| e.to_string())?;
    Ok(file.to_string_lossy().into_owned())
}

/// Move a note to `vault/.trash/` rather than unlinking it.
#[tauri::command]
fn delete_note(app: AppHandle, path: String) -> Result<(), String> {
    let file = note_file(&app, &path)?;
    if !file.exists() {
        return Ok(());
    }
    let trash = vault_dir(&app)?.join(".trash");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;

    let file_name = file
        .file_name()
        .ok_or("Note has no file name.")?
        .to_string_lossy()
        .into_owned();
    let stem = Path::new(&file_name)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();

    let mut target = trash.join(&file_name);
    let mut n = 1;
    while target.exists() {
        target = trash.join(format!("{stem} {n}.md"));
        n += 1;
    }
    fs::rename(&file, target).map_err(|e| e.to_string())
}

/// Rename (or move) a note, e.g. when its title changes.
#[tauri::command]
fn rename_note(app: AppHandle, from: String, to: String) -> Result<String, String> {
    let src = note_file(&app, &from)?;
    let dst = note_file(&app, &to)?;
    if !src.exists() {
        return Err(format!("No such note: {from}"));
    }
    if dst.exists() {
        return Err(format!("{to} already exists."));
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().into_owned())
}

/// Rename (or move) a folder, e.g. when its name is edited in the sidebar.
#[tauri::command]
fn rename_folder(app: AppHandle, from: String, to: String) -> Result<String, String> {
    let src = resolve(&app, &from)?;
    let dst = resolve(&app, &to)?;
    if !src.is_dir() {
        return Err(format!("No such folder: {from}"));
    }
    if dst.exists() {
        return Err(format!("{to} already exists."));
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(to)
}

/// Move a whole folder to `vault/.trash/`, the same way notes are removed.
#[tauri::command]
fn delete_folder(app: AppHandle, path: String) -> Result<(), String> {
    let dir = resolve(&app, &path)?;
    if !dir.is_dir() {
        return Err(format!("No such folder: {path}"));
    }
    if dir == vault_dir(&app)? {
        return Err("That is the notes folder itself.".into());
    }

    let trash = vault_dir(&app)?.join(".trash");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;
    let name = dir.file_name().ok_or("Folder has no name.")?.to_string_lossy().into_owned();
    let mut target = trash.join(&name);
    let mut n = 1;
    while target.exists() {
        target = trash.join(format!("{name} {n}"));
        n += 1;
    }
    fs::rename(&dir, target).map_err(|e| e.to_string())
}

// ------------------------------------------------------------- the avatar

/// Standard base64, hand-rolled so the app does not grow a dependency just to
/// show a 30px picture.
fn base64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { T[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { T[(n & 63) as usize] as char } else { '=' });
    }
    out
}

fn mime_for(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/jpeg",
    }
}

fn as_data_uri(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(format!("data:{};base64,{}", mime_for(path), base64(&bytes)))
}

/// The profile picture as a data URI, or `None` when the user has not set one.
/// A data URI keeps this off the asset protocol and out of the CSP entirely.
#[tauri::command]
fn avatar(app: AppHandle) -> Result<Option<String>, String> {
    match load_settings(&app).avatar {
        Some(path) if path.is_file() => as_data_uri(&path).map(Some),
        _ => Ok(None),
    }
}

/// Copy the chosen picture into the config dir — so it keeps working after the
/// original is moved or deleted — remember it, and hand back a data URI.
#[tauri::command]
fn set_avatar(app: AppHandle, source: String) -> Result<String, String> {
    const MAX_BYTES: u64 = 8 * 1024 * 1024;

    let src = PathBuf::from(source.trim());
    if !src.is_file() {
        return Err("Choose an image file.".into());
    }
    let size = fs::metadata(&src).map_err(|e| e.to_string())?.len();
    if size > MAX_BYTES {
        return Err(format!(
            "That image is {:.1} MB — keep it under 8 MB.",
            size as f64 / 1_048_576.0
        ));
    }

    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let dest = dir.join(format!("avatar.{ext}"));
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    let mut settings = load_settings(&app);
    settings.avatar = Some(dest.clone());
    save_settings(&app, &settings)?;

    as_data_uri(&dest)
}

/// Copy files dropped onto the window into the vault. Returns their new
/// vault-relative paths, in the order given.
#[tauri::command]
fn import_files(app: AppHandle, paths: Vec<String>) -> Result<Vec<String>, String> {
    let vault = vault_dir(&app)?;
    let mut imported = Vec::new();

    for raw in paths {
        let src = PathBuf::from(&raw);
        if !src.is_file() || !is_note_file(&src) {
            continue;
        }
        let stem = src.file_stem().unwrap_or_default().to_string_lossy().into_owned();
        let ext = src
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();

        let mut name = format!("{stem}.{ext}");
        let mut n = 2;
        while vault.join(&name).exists() {
            name = format!("{stem} {n}.{ext}");
            n += 1;
        }
        fs::copy(&src, vault.join(&name)).map_err(|e| e.to_string())?;
        imported.push(name);
    }

    if imported.is_empty() {
        return Err("Only .md and .txt files can be dropped in.".into());
    }
    Ok(imported)
}

/// Move a note or folder into another folder. Settings that point at the old
/// path — pin, manual order, note font, last opened — are rewritten to follow
/// it, so a move does not quietly lose them.
#[tauri::command]
fn move_entry(app: AppHandle, from: String, to: String) -> Result<String, String> {
    let src = resolve(&app, &from)?;
    let dst = resolve(&app, &to)?;

    if !src.exists() {
        return Err(format!("Nothing to move at {from}"));
    }
    if dst.exists() {
        return Err(format!("{to} already exists."));
    }
    if src.is_dir() && dst.starts_with(&src) {
        return Err("A folder cannot be moved inside itself.".into());
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;

    let mut settings = load_settings(&app);
    let rewrite = |p: &String| -> String {
        if p == &from {
            to.clone()
        } else if let Some(rest) = p.strip_prefix(&format!("{from}/")) {
            format!("{to}/{rest}")
        } else {
            p.clone()
        }
    };

    settings.order = settings.order.iter().map(rewrite).collect();
    settings.pinned = settings.pinned.iter().map(rewrite).collect();
    settings.last_note = settings.last_note.as_ref().map(rewrite);

    rename_keys(&mut settings.note_fonts, &rewrite);
    rename_keys(&mut settings.note_spacing, &rewrite);
    rename_keys(&mut settings.note_sizes, &rewrite);

    save_settings(&app, &settings)?;
    Ok(to)
}

/// Per-note maps are keyed by vault-relative path, so a rename has to carry
/// their entries across too — for a folder, everything beneath it.
fn rename_keys<V>(map: &mut HashMap<String, V>, rewrite: &impl Fn(&String) -> String) {
    let moved: Vec<(String, String)> = map.keys().map(|k| (k.clone(), rewrite(k))).collect();
    for (old, new) in moved {
        if old != new {
            if let Some(value) = map.remove(&old) {
                map.insert(new, value);
            }
        }
    }
}

// ------------------------------------------------------------ window material

/// The window material on Windows.
///
/// Acrylic is the stronger of the two materials DWM offers here, and the radius
/// of both is fixed by the OS, so the material itself is the only way to make
/// the blur look heavier. (Mica would be a third option, but it needs
/// Windows 11 — this machine is 19045.)
///
/// Acrylic's cost is that it re-composites its noise layer every frame, which is
/// why dragging the window crawled. Rather than give up the look, we only pay
/// for it while standing still: see `swap_while_moving` below.
///
/// The outcome is recorded next to `settings.json` as `material.log`, because
/// the effect is invisible in a screenshot of the window itself (a capture of
/// the window shows what it paints, not the backdrop DWM composites behind it).
#[cfg(target_os = "windows")]
mod material {
    use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
    use std::time::Duration;

    use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

    /// At rest: the full material.
    const ACRYLIC: (u8, u8, u8, u8) = (16, 17, 20, 108);
    /// While moving: Aero blur is not as heavy, so the tint carries a little more
    /// weight to keep the panel about as dark as it was a moment ago.
    const MOVING: (u8, u8, u8, u8) = (16, 17, 20, 150);
    /// How long the window must be still before acrylic goes back on.
    const SETTLE: Duration = Duration::from_millis(180);

    static GENERATION: AtomicU64 = AtomicU64::new(0);
    static SWAPPED: AtomicBool = AtomicBool::new(false);
    static WATCHING: AtomicBool = AtomicBool::new(false);
    /// Off entirely in the Classic theme, where the window is a solid colour.
    static ENABLED: AtomicBool = AtomicBool::new(true);

    /// Applies the material for the chosen theme. `neo` is the translucent one;
    /// `classic` clears the material so the window is solid.
    pub fn apply(app: &AppHandle, window: &WebviewWindow, neo: bool) {
        use window_vibrancy::{apply_acrylic, apply_blur};

        ENABLED.store(neo, Ordering::SeqCst);

        let outcome = if neo {
            match apply_acrylic(window, Some(ACRYLIC)) {
                Ok(()) => "neo — windows 10 acrylic (aero blur while moving)".to_string(),
                Err(e) => match apply_blur(window, Some(MOVING)) {
                    Ok(()) => format!("neo — aero blur (acrylic refused: {e:?})"),
                    Err(e2) => format!("neo — no material (acrylic: {e:?}; blur: {e2:?})"),
                },
            }
        } else {
            let _ = window_vibrancy::clear_acrylic(window);
            let _ = window_vibrancy::clear_blur(window);
            "classic — solid window, no material".to_string()
        };

        if let Ok(dir) = app.path().app_config_dir() {
            let _ = std::fs::create_dir_all(&dir);
            let _ = std::fs::write(dir.join("material.log"), &outcome);
        }
    }

    /// Swaps acrylic for the cheap blur for the duration of a move, then puts it
    /// back once the window has been still for `SETTLE`.
    ///
    /// Generation counting, not a timer per event: a drag emits a move event
    /// every frame, so each one bumps the counter and a single watcher thread
    /// only restores the material when the counter stops changing.
    pub fn swap_while_moving(window: &WebviewWindow) {
        let handle = window.clone();

        window.on_window_event(move |event| {
            if !matches!(event, tauri::WindowEvent::Moved(_)) {
                return;
            }
            if !ENABLED.load(Ordering::SeqCst) {
                return; // classic theme: nothing to swap
            }
            GENERATION.fetch_add(1, Ordering::SeqCst);

            if !SWAPPED.swap(true, Ordering::SeqCst) {
                let w = handle.clone();
                let on_main = w.clone();
                let _ = w.run_on_main_thread(move || {
                    let _ = window_vibrancy::apply_blur(&on_main, Some(MOVING));
                    // Tell the page, so it can fade a veil over the change. The
                    // material swap itself is instantaneous and has no animation;
                    // a short crossfade is the only way to soften it.
                    let _ = on_main.emit("material", "moving");
                });
            }

            if WATCHING.swap(true, Ordering::SeqCst) {
                return; // a watcher is already counting down
            }
            let w = handle.clone();
            std::thread::spawn(move || loop {
                let seen = GENERATION.load(Ordering::SeqCst);
                std::thread::sleep(SETTLE);
                if GENERATION.load(Ordering::SeqCst) == seen {
                    let on_main = w.clone();
                    let _ = w.run_on_main_thread(move || {
                        if !ENABLED.load(Ordering::SeqCst) {
                            return; // theme changed to classic mid-move
                        }
                        let _ = window_vibrancy::apply_acrylic(&on_main, Some(ACRYLIC));
                        let _ = on_main.emit("material", "settled");
                    });
                    SWAPPED.store(false, Ordering::SeqCst);
                    WATCHING.store(false, Ordering::SeqCst);
                    return;
                }
            });
        });
    }
}

/// Switch between the two looks. Neo keeps the translucent material; Classic
/// clears it so the window is a solid colour.
#[tauri::command]
fn set_theme(app: AppHandle, window: tauri::WebviewWindow, theme: String) -> Result<(), String> {
    let chosen = if theme == "classic" { Theme::Classic } else { Theme::Neo };

    let mut settings = load_settings(&app);
    settings.theme = chosen;
    save_settings(&app, &settings)?;

    #[cfg(target_os = "windows")]
    material::apply(&app, &window, chosen == Theme::Neo);
    #[cfg(not(target_os = "windows"))]
    let _ = (&app, &window);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let _ = vault_dir(app.handle()); // make sure the folder exists
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let neo = load_settings(app.handle()).theme == Theme::Neo;
                material::apply(app.handle(), &window, neo);
                material::swap_while_moving(&window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault,
            set_vault,
            set_order,
            set_pinned,
            settings,
            set_theme,
            set_note_font,
            set_app_icon,
            set_sidebar_width,
            set_note_spacing,
            set_note_size,
            set_title_inline,
            import_files,
            reveal_vault,
            create_folder,
            rename_folder,
            delete_folder,
            read_note,
            write_note,
            delete_note,
            rename_note,
            move_entry,
            set_last_note,
            avatar,
            set_avatar
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
