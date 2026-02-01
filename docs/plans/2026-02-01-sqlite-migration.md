# SQLite Migration Design

Replace JSON file storage with SQLite using better-sqlite3.

## Schema

```sql
-- Single SQLite file at: {userData}/resume-tailor.db

CREATE TABLE profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  resume_json TEXT NOT NULL,
  imported_at TEXT,
  source_file TEXT,
  last_modified_at TEXT
);

CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT,
  job_url TEXT,
  location TEXT,
  employment_type TEXT,
  salary_range TEXT,
  current_status_id TEXT NOT NULL,
  status_history_json TEXT NOT NULL,
  resume_path TEXT,
  cover_letter_path TEXT,
  folder_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE export_history (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  date TEXT NOT NULL,
  resume_path TEXT,
  cover_letter_path TEXT,
  folder_path TEXT NOT NULL
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  settings_json TEXT NOT NULL
);

CREATE TABLE api_keys (
  provider TEXT PRIMARY KEY,
  encrypted_key TEXT NOT NULL
);
```

## Architecture

- `database.service.ts` - Central SQLite connection, migrations
- Existing services refactored to use `db.prepare()` instead of file I/O
- Complex objects (resume, settings) stored as JSON columns

## Implementation Order

1. Install `better-sqlite3` + `@types/better-sqlite3`
2. Create `database.service.ts`
3. Migrate services: settings → api-key → profile → history → applications
4. Add JSON file migration for existing users
5. Update electron-builder config for native modules
6. Test & cleanup

## Electron-Builder Config

```json
{
  "build": {
    "npmRebuild": true,
    "buildDependenciesFromSource": true
  },
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3"
  }
}
```

## Unchanged

- PDF export still writes to user-selected folders
- AI services unchanged
- IPC handlers unchanged (just call refactored services)
