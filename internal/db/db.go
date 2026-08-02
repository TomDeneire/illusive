// Package db provides sqlite storage for the adjectives dictionary.
package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"

	"illusive/internal/model"
)

const schema = `
CREATE TABLE IF NOT EXISTS adjectives (
	id                     INTEGER PRIMARY KEY AUTOINCREMENT,
	word                   TEXT NOT NULL DEFAULT '',
	adjective              TEXT NOT NULL DEFAULT '',
	derived_adverb         TEXT NOT NULL DEFAULT '',
	translation_literal    TEXT NOT NULL DEFAULT '',
	translation_figurative TEXT NOT NULL DEFAULT '',
	example_literal        TEXT NOT NULL DEFAULT '',
	example_figurative     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_adjectives_adjective ON adjectives(adjective);
`

// DB wraps a sqlite connection for the adjectives dictionary.
type DB struct {
	conn *sql.DB
}

// Open opens (creating if needed) the sqlite database at path and ensures the schema exists.
func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if _, err := conn.Exec(schema); err != nil {
		conn.Close()
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	return &DB{conn: conn}, nil
}

// Close closes the underlying database connection.
func (d *DB) Close() error {
	return d.conn.Close()
}

// List returns all adjectives ordered alphabetically.
func (d *DB) List() ([]model.Adjective, error) {
	rows, err := d.conn.Query(`SELECT id, word, adjective, derived_adverb, translation_literal, translation_figurative, example_literal, example_figurative FROM adjectives ORDER BY adjective`)
	if err != nil {
		return nil, fmt.Errorf("list adjectives: %w", err)
	}
	defer rows.Close()
	return scanAll(rows)
}

// Search returns adjectives whose word, adjective, or translations match the query.
func (d *DB) Search(query string) ([]model.Adjective, error) {
	like := "%" + query + "%"
	rows, err := d.conn.Query(`
		SELECT id, word, adjective, derived_adverb, translation_literal, translation_figurative, example_literal, example_figurative
		FROM adjectives
		WHERE word LIKE ? OR adjective LIKE ? OR translation_literal LIKE ? OR translation_figurative LIKE ?
		ORDER BY adjective`, like, like, like, like)
	if err != nil {
		return nil, fmt.Errorf("search adjectives: %w", err)
	}
	defer rows.Close()
	return scanAll(rows)
}

// Get returns a single adjective by id.
func (d *DB) Get(id int64) (model.Adjective, error) {
	row := d.conn.QueryRow(`SELECT id, word, adjective, derived_adverb, translation_literal, translation_figurative, example_literal, example_figurative FROM adjectives WHERE id = ?`, id)
	var a model.Adjective
	err := row.Scan(&a.ID, &a.Word, &a.Adjective, &a.DerivedAdverb, &a.TranslationLiteral, &a.TranslationFigurative, &a.ExampleLiteral, &a.ExampleFigurative)
	if err != nil {
		return model.Adjective{}, fmt.Errorf("get adjective %d: %w", id, err)
	}
	return a, nil
}

// Create inserts a new adjective and returns it with its assigned id.
func (d *DB) Create(a model.Adjective) (model.Adjective, error) {
	res, err := d.conn.Exec(`
		INSERT INTO adjectives (word, adjective, derived_adverb, translation_literal, translation_figurative, example_literal, example_figurative)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		a.Word, a.Adjective, a.DerivedAdverb, a.TranslationLiteral, a.TranslationFigurative, a.ExampleLiteral, a.ExampleFigurative)
	if err != nil {
		return model.Adjective{}, fmt.Errorf("create adjective: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return model.Adjective{}, fmt.Errorf("create adjective: %w", err)
	}
	a.ID = id
	return a, nil
}

// Update overwrites an existing adjective identified by a.ID.
func (d *DB) Update(a model.Adjective) error {
	res, err := d.conn.Exec(`
		UPDATE adjectives
		SET word = ?, adjective = ?, derived_adverb = ?, translation_literal = ?, translation_figurative = ?, example_literal = ?, example_figurative = ?
		WHERE id = ?`,
		a.Word, a.Adjective, a.DerivedAdverb, a.TranslationLiteral, a.TranslationFigurative, a.ExampleLiteral, a.ExampleFigurative, a.ID)
	if err != nil {
		return fmt.Errorf("update adjective %d: %w", a.ID, err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update adjective %d: %w", a.ID, err)
	}
	if n == 0 {
		return fmt.Errorf("update adjective %d: not found", a.ID)
	}
	return nil
}

// Delete removes an adjective by id.
func (d *DB) Delete(id int64) error {
	res, err := d.conn.Exec(`DELETE FROM adjectives WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete adjective %d: %w", id, err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete adjective %d: %w", id, err)
	}
	if n == 0 {
		return fmt.Errorf("delete adjective %d: not found", id)
	}
	return nil
}

func scanAll(rows *sql.Rows) ([]model.Adjective, error) {
	list := []model.Adjective{}
	for rows.Next() {
		var a model.Adjective
		if err := rows.Scan(&a.ID, &a.Word, &a.Adjective, &a.DerivedAdverb, &a.TranslationLiteral, &a.TranslationFigurative, &a.ExampleLiteral, &a.ExampleFigurative); err != nil {
			return nil, fmt.Errorf("scan adjective: %w", err)
		}
		list = append(list, a)
	}
	return list, rows.Err()
}
