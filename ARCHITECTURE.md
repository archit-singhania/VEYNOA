# Architecture

Expo / React Native / TypeScript with Expo Router and Zustand. Components call a use-case store; the store calls repositories; only repositories execute SQLite. Shared domain and Zod contracts are imported by the app and Worker.

SQLite is the durable source of truth on mobile. FTS5 indexes notes. Tasks and journals are labels/state on notes, not copied content. Derived AI analysis is revision-bound so late responses cannot overwrite newer content. Audio files live under the app's document directory.

The Cloudflare Worker performs temporary inference with a Workers AI binding. It holds provider credentials, validates requests and responses, caps input size and applies Cloudflare rate-limit bindings. An installation UUID is a rate-limit hint, never authentication. A separate per-IP limiter protects against UUID rotation. No backend note database.

All cloud requests pass through a consent-aware client with deadlines. The persisted foreground job queue handles analysis and transcription, retries with backoff, and retains failed jobs for manual retry. App launch/foreground and an interval drain jobs; background execution is not promised.

No automatic deployment, production credentials or store distribution are assumed. Web is a preview target; native is the persistence and audio acceptance target.
