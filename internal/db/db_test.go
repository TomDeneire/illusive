package db

import (
	"path/filepath"
	"testing"

	"illusive/internal/model"
)

func TestCRUD(t *testing.T) {
	path := filepath.Join(t.TempDir(), "smoke.db")
	d, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer d.Close()

	created, err := d.Create(model.Adjective{Adjective: "testy", TranslationLiteral: "test-achtig"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if created.ID == 0 {
		t.Fatalf("expected non-zero id")
	}

	created.TranslationFigurative = "figuurlijk"
	if err := d.Update(created); err != nil {
		t.Fatalf("Update: %v", err)
	}

	got, err := d.Get(created.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.TranslationFigurative != "figuurlijk" {
		t.Fatalf("expected updated translation, got %q", got.TranslationFigurative)
	}

	results, err := d.Search("testy")
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 search result, got %d", len(results))
	}

	all, err := d.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("expected 1 listed entry, got %d", len(all))
	}

	if err := d.Delete(created.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := d.Get(created.ID); err == nil {
		t.Fatalf("expected error after delete")
	}
}
