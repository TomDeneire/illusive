# Illusive Adjectives

A desktop CRUD application for maintaining a dictionary of English adjectives
(root, adjective, derived adverb, translations, and examples — literal and
figurative). Built with [Wails](https://wails.io) (Go backend, vanilla
HTML/JS/CSS frontend) and [SQLite](https://www.sqlite.org/) storage.

## Data

- `dainty_woordenlijst.ods` and `projectillusiveadjectives.doc` are the
  original source files the schema and initial data were derived from.
- `illusive.db` is the seeded SQLite database, generated from those sources
  by `cmd/migrate`. It ships alongside the executables so the app has data
  to open on first run, and can be edited directly by the user afterwards
  with any SQLite tool.

### Schema

Table `adjectives`:

| Column                   | Description                        |
|--------------------------|-------------------------------------|
| `root`                    | Root word / noun                    |
| `adjective`               | The adjective itself                |
| `derived_adverb`          | Adverb derived from the adjective   |
| `translation_literal`     | Dutch translation, literal sense    |
| `translation_figurative`  | Dutch translation, figurative sense |
| `example_literal`         | Example sentence, literal sense     |
| `example_figurative`      | Example sentence, figurative sense  |

### Re-running the migration

```sh
go run ./cmd/migrate illusive.db
```

This refuses to overwrite an existing database file, so remove or rename
`illusive.db` first if you want to regenerate it from scratch.

## UI preferences

All columns are shown by default except "Root" and "Derived adverb". Table
column widths can be resized by dragging the column edges, and columns can
be shown or hidden via the "Columns" menu above the table. Both preferences
are remembered between sessions, stored outside the sqlite database in a
small JSON config file under the OS-standard config directory:

- Linux: `~/.config/illusive/ui-config.json`
- Windows: `%LOCALAPPDATA%\illusive\ui-config.json`

## Development

Requires Go, Node/npm, and the [Wails CLI](https://wails.io/docs/gettingstarted/installation).
On Linux, GTK3 and WebKit2GTK development packages must be installed.

```sh
make run    # live development with hot reload
make test   # go test ./...
```

## Building

```sh
make build           # Linux executable -> build/bin/illusive
make build-windows   # Windows executable -> build/bin/illusive.exe
```

Both are self-contained, single-file executables — no CGO cross-compilation
toolchain is required, since the app uses a pure-Go SQLite driver
(`modernc.org/sqlite`) and Wails' syscall-based Windows backend. Place
`illusive.db` next to the executable; the app opens (or creates) an
`illusive.db` file in its own directory at startup.

## Releasing

```sh
make release VERSION=v0.1.0
```

This bumps `productVersion` in `wails.json`, builds both platform
executables, tags and pushes the commit, and publishes the Linux binary,
Windows binary, and `illusive.db` as assets on a new GitHub release.
