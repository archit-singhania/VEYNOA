# Database

Versioned SQLite migrations run before UI readiness; foreign keys and WAL enabled. Migration version lives in `PRAGMA user_version`.

- notes: UUID, title, body, timestamps, pinned, archived, kind, completed, revision.
- notes_fts: external-content FTS5 index maintained by triggers.
- analyses: note ID + revision + validated JSON; topics/entities/suggestions derive from here.
- recordings: ID, note ID, document URI, creation time, duration and transcription status.
- jobs: unique deduplication key, type, note ID, payload, attempts, next attempt, state/error.
- embeddings: note ID, revision, model, vector JSON.
- canvas_nodes: note ID, node ID, text, x/y, parent ID.
- settings: key/value JSON.

Foreign-key cascades remove dependent rows. Files are removed through the repository cleanup flow. AI topics define smart collections; no duplicate note content. Separate entities, thought blocks, projects and typed graph edges remain later normalization work; the audit must explicitly track this simplification.
