/* The vault, the settings file and the note files — the Rust commands, in Node.
 *
 * The shapes matter: the renderer expects exactly what the Tauri commands
 * returned, so this is a port rather than a redesign. Behaviour that protected
 * the user's data is kept: paths are confined to the vault, writes go through a
 * temp file and are swapped in, and deleting moves things to .trash.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const isNoteFile = (p) => /\.(md|txt)$/i.test(p || '');
const base64 = (buf) => Buffer.from(buf).toString('base64');

const MIME = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const mimeFor = (p) => MIME[String(path.extname(p)).slice(1).toLowerCase()] || 'image/jpeg';
const dataUri = (file) => 'data:' + mimeFor(file) + ';base64,' + base64(fs.readFileSync(file));

function defaults() {
  return {
    vault: null,
    avatar: null,
    order: [],
    last_note: null,
    pinned: [],
    theme: 'neo',
    note_fonts: {},
    note_spacing: {},
    note_sizes: {},
    app_icon: 'galaxy',
    sidebar_width: 300,
    title_inline: false
  };
}

function configFile() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'settings.json');
}

function loadSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
    return Object.assign(defaults(), parsed || {});
  } catch (_) {
    return defaults();
  }
}

function saveSettings(settings) {
  fs.writeFileSync(configFile(), JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function defaultVault() {
  return path.join(app.getPath('documents'), 'Notes');
}

function vaultDir(settings) {
  const s = settings || loadSettings();
  const dir = s.vault || defaultVault();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/* Refuse anything that would escape the vault, or that the OS will not accept. */
function resolve(rel, settings) {
  const vault = vaultDir(settings);
  const cleaned = String(rel || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!cleaned) return vault;
  if (/[:*?"<>|]/.test(cleaned)) throw new Error('Invalid path: ' + rel);
  const parts = cleaned.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..')) throw new Error('Invalid path: ' + rel);
  return path.join(vault, ...parts);
}

/* Notes only: `Bordeaux` and `Life/Bordeaux.md` both resolve. */
function noteFile(rel, settings) {
  const file = resolve(rel, settings);
  const ext = path.extname(file).toLowerCase();
  if (ext === '.md' || ext === '.txt') return file;
  if (ext) throw new Error('Not a note file: ' + rel);
  return file + '.md';
}

// ------------------------------------------------------------------- tree

function readTree(dir, prefix, order) {
  const folders = [];
  const notes = [];
  const rank = (p) => {
    const i = order.findIndex((o) => String(o).toLowerCase() === p.toLowerCase());
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith('.')) continue;
    const rel = prefix ? prefix + '/' + name : name;
    const full = path.join(dir, name);

    if (entry.isDirectory()) {
      folders.push({ path: rel, name, folder: true, children: readTree(full, rel, order) });
    } else if (isNoteFile(name)) {
      notes.push({
        path: rel,
        name: path.basename(name, path.extname(name)),
        folder: false,
        children: []
      });
    }
  }

  const byName = (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  folders.sort((a, b) => rank(a.path) - rank(b.path) || byName(a, b));
  notes.sort((a, b) => rank(a.path) - rank(b.path) || byName(a, b));
  return folders.concat(notes);
}

function vaultInfo(settings) {
  const s = settings || loadSettings();
  const dir = vaultDir(s);
  return {
    path: dir,
    notes: readTree(dir, '', s.order || []),
    last_note: s.last_note || null,
    pinned: s.pinned || []
  };
}

/* Settings that point at a path have to follow it when it is renamed/moved. */
function renameKeys(map, rewrite) {
  for (const key of Object.keys(map || {})) {
    const next = rewrite(key);
    if (next !== key) {
      map[next] = map[key];
      delete map[key];
    }
  }
}

function uniqueIn(dir, name) {
  const stem = path.basename(name, path.extname(name));
  const ext = path.extname(name);
  let candidate = name;
  let n = 2;
  while (fs.existsSync(path.join(dir, candidate))) candidate = stem + ' ' + n++ + ext;
  return candidate;
}

// ---------------------------------------------------------------- commands

function command(cmd, args, ctx) {
  const settings = loadSettings();
  const dir = vaultDir(settings);

  switch (cmd) {
    case 'vault':
      return vaultInfo(settings);

    case 'set_vault': {
      const chosen = String(args.path || '').trim();
      if (!path.isAbsolute(chosen)) throw new Error('Choose an absolute folder path.');
      fs.mkdirSync(chosen, { recursive: true });
      settings.vault = chosen;
      saveSettings(settings);
      return vaultInfo(settings);
    }

    case 'reveal_vault':
      ctx.shell.openPath(dir);
      return null;

    case 'settings':
      return {
        theme: settings.theme === 'classic' ? 'classic' : 'neo',
        fonts: settings.note_fonts || {},
        spacing: settings.note_spacing || {},
        sizes: settings.note_sizes || {},
        app_icon: settings.app_icon || 'galaxy',
        sidebar_width: Number(settings.sidebar_width) || 300,
        title_inline: !!settings.title_inline
      };

    case 'set_theme': {
      settings.theme = args.theme === 'classic' ? 'classic' : 'neo';
      saveSettings(settings);
      require('./material').setTheme(ctx.win, settings.theme);
      return null;
    }

    case 'set_title_inline':
      settings.title_inline = !!args.inline;
      saveSettings(settings);
      return null;

    case 'set_sidebar_width':
      settings.sidebar_width = Math.max(200, Math.min(640, Number(args.width) || 300));
      saveSettings(settings);
      return null;

    case 'set_app_icon': {
      const size = Number(args.size) || 0;
      const rgba = Buffer.from(args.rgba || []);
      if (!size || rgba.length !== size * size * 4) {
        throw new Error('icon bytes are ' + rgba.length + ' long, expected ' + (size * size * 4));
      }
      ctx.setIcon(rgba, size);
      settings.app_icon = String(args.name || 'galaxy');
      saveSettings(settings);
      return null;
    }

    case 'set_order':
      settings.order = (args.paths || []).slice(0, 5000);
      saveSettings(settings);
      return null;

    case 'set_pinned':
      settings.pinned = args.paths || [];
      saveSettings(settings);
      return settings.pinned;

    case 'set_last_note': {
      const next = String(args.path || '').trim() || null;
      if ((settings.last_note || null) === next) return null;
      settings.last_note = next;
      saveSettings(settings);
      return null;
    }

    case 'set_note_font': {
      const font = String(args.font || '').trim();
      if (font) settings.note_fonts[args.path] = font;
      else delete settings.note_fonts[args.path];
      saveSettings(settings);
      return null;
    }

    case 'set_note_spacing': {
      const spacing = Number(args.spacing) || 1.6;
      if (Math.abs(spacing - 1.6) < 0.005) delete settings.note_spacing[args.path];
      else settings.note_spacing[args.path] = Math.max(1.1, Math.min(2.4, spacing));
      saveSettings(settings);
      return null;
    }

    case 'set_note_size': {
      const size = Number(args.size) || 16;
      if (Math.abs(size - 16) < 0.5) delete settings.note_sizes[args.path];
      else settings.note_sizes[args.path] = Math.max(8, Math.min(72, size));
      saveSettings(settings);
      return null;
    }

    case 'read_note': {
      const file = noteFile(args.path, settings);
      try {
        return fs.readFileSync(file, 'utf8');
      } catch (err) {
        if (err.code === 'ENOENT') return '';
        throw err;
      }
    }

    case 'write_note': {
      const file = noteFile(args.path, settings);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = file.replace(/\.(md|txt)$/i, '') + path.extname(file) + '.tmp';
      fs.writeFileSync(tmp, String(args.body == null ? '' : args.body), 'utf8');
      fs.renameSync(tmp, file);
      return file;
    }

    case 'delete_note': {
      const file = noteFile(args.path, settings);
      if (!fs.existsSync(file)) return null;
      const trash = path.join(dir, '.trash');
      fs.mkdirSync(trash, { recursive: true });
      fs.renameSync(file, path.join(trash, uniqueIn(trash, path.basename(file))));
      return null;
    }

    case 'rename_note': {
      const src = noteFile(args.from, settings);
      const dst = noteFile(args.to, settings);
      if (!fs.existsSync(src)) throw new Error('No such note: ' + args.from);
      if (fs.existsSync(dst)) throw new Error(args.to + ' already exists.');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      return dst;
    }

    case 'create_folder':
      fs.mkdirSync(resolve(args.path, settings), { recursive: true });
      return null;

    case 'rename_folder': {
      const src = resolve(args.from, settings);
      const dst = resolve(args.to, settings);
      if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
        throw new Error('No such folder: ' + args.from);
      }
      if (fs.existsSync(dst)) throw new Error(args.to + ' already exists.');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);
      return args.to;
    }

    case 'delete_folder': {
      const target = resolve(args.path, settings);
      if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
        throw new Error('No such folder: ' + args.path);
      }
      if (path.resolve(target) === path.resolve(dir)) throw new Error('That is the notes folder itself.');
      const trash = path.join(dir, '.trash');
      fs.mkdirSync(trash, { recursive: true });
      fs.renameSync(target, path.join(trash, uniqueIn(trash, path.basename(target))));
      return null;
    }

    case 'move_entry': {
      const src = resolve(args.from, settings);
      const dst = resolve(args.to, settings);
      if (!fs.existsSync(src)) throw new Error('Nothing to move at ' + args.from);
      if (fs.existsSync(dst)) throw new Error(args.to + ' already exists.');
      if (fs.statSync(src).isDirectory() && (dst + path.sep).startsWith(src + path.sep)) {
        throw new Error('A folder cannot be moved inside itself.');
      }
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.renameSync(src, dst);

      const rewrite = (p) => {
        if (p === args.from) return args.to;
        if (String(p).startsWith(args.from + '/')) return args.to + String(p).slice(args.from.length);
        return p;
      };
      settings.order = (settings.order || []).map(rewrite);
      settings.pinned = (settings.pinned || []).map(rewrite);
      if (settings.last_note) settings.last_note = rewrite(settings.last_note);
      renameKeys(settings.note_fonts, rewrite);
      renameKeys(settings.note_spacing, rewrite);
      renameKeys(settings.note_sizes, rewrite);
      saveSettings(settings);
      return args.to;
    }

    case 'import_files': {
      const imported = [];
      for (const raw of args.paths || []) {
        if (!isNoteFile(raw) || !fs.existsSync(raw) || !fs.statSync(raw).isFile()) continue;
        const name = uniqueIn(dir, path.basename(raw));
        fs.copyFileSync(raw, path.join(dir, name));
        imported.push(name);
      }
      if (!imported.length) throw new Error('Only .md and .txt files can be dropped in.');
      return imported;
    }

    case 'avatar': {
      const file = settings.avatar;
      return file && fs.existsSync(file) && fs.statSync(file).isFile() ? dataUri(file) : null;
    }

    case 'set_avatar': {
      const src = String(args.source || '').trim();
      if (!fs.existsSync(src) || !fs.statSync(src).isFile()) throw new Error('Choose an image file.');
      const size = fs.statSync(src).size;
      if (size > 8 * 1024 * 1024) {
        throw new Error('That image is ' + (size / 1048576).toFixed(1) + ' MB — keep it under 8 MB.');
      }
      const configDir = app.getPath('userData');
      fs.mkdirSync(configDir, { recursive: true });
      const ext = (path.extname(src).slice(1) || 'png').toLowerCase();
      const dest = path.join(configDir, 'avatar.' + ext);
      fs.copyFileSync(src, dest);
      settings.avatar = dest;
      saveSettings(settings);
      return dataUri(dest);
    }

    default:
      throw new Error('Unknown command: ' + cmd);
  }
}

module.exports = { command, loadSettings, saveSettings, vaultDir, vaultInfo };
