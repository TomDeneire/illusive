package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"illusive/internal/db"
	"illusive/internal/model"
)

// App struct
type App struct {
	ctx context.Context
	db  *db.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods, and the sqlite database is opened.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dbPath, err := dbPath()
	if err != nil {
		log.Fatalf("resolve database path: %v", err)
	}
	d, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("open database %q: %v", dbPath, err)
	}
	a.db = d
}

// dbPath returns the path to illusive.db next to the running executable,
// so the database travels alongside the single-file build.
func dbPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("locate executable: %w", err)
	}
	return filepath.Join(filepath.Dir(exe), "illusive.db"), nil
}

// ListAdjectives returns every adjective, ordered alphabetically.
func (a *App) ListAdjectives() ([]model.Adjective, error) {
	return a.db.List()
}

// SearchAdjectives returns adjectives whose fields match the given query.
func (a *App) SearchAdjectives(query string) ([]model.Adjective, error) {
	if query == "" {
		return a.db.List()
	}
	return a.db.Search(query)
}

// CreateAdjective inserts a new adjective entry.
func (a *App) CreateAdjective(entry model.Adjective) (model.Adjective, error) {
	return a.db.Create(entry)
}

// UpdateAdjective overwrites an existing adjective entry.
func (a *App) UpdateAdjective(entry model.Adjective) error {
	return a.db.Update(entry)
}

// DeleteAdjective removes an adjective entry by id.
func (a *App) DeleteAdjective(id int64) error {
	return a.db.Delete(id)
}

// UIConfig holds the user's table display preferences.
type UIConfig struct {
	ColumnWidths   map[string]int  `json:"columnWidths"`
	VisibleColumns map[string]bool `json:"visibleColumns"`
}

// uiConfigPath returns the path to the UI config file that stores the
// user's table display preferences, under the OS-standard config directory
// (%LOCALAPPDATA% on Windows, ~/.config on Linux).
func uiConfigPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate config dir: %w", err)
	}
	return filepath.Join(dir, "illusive", "ui-config.json"), nil
}

// LoadUIConfig returns the saved UI preferences. Returns a zero-value
// UIConfig if nothing has been saved yet.
func (a *App) LoadUIConfig() (UIConfig, error) {
	path, err := uiConfigPath()
	if err != nil {
		return UIConfig{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return UIConfig{}, nil
	}
	if err != nil {
		return UIConfig{}, fmt.Errorf("read ui config: %w", err)
	}
	var cfg UIConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return UIConfig{}, fmt.Errorf("parse ui config: %w", err)
	}
	return cfg, nil
}

// SaveUIConfig persists the given UI preferences to disk.
func (a *App) SaveUIConfig(cfg UIConfig) error {
	path, err := uiConfigPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode ui config: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write ui config: %w", err)
	}
	return nil
}

// shutdown closes the database connection when the app quits.
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}
