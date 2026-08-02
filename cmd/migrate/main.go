// Command migrate creates and seeds the illusive sqlite database from the
// original dainty_woordenlijst.ods export (data.csv, embedded below).
//
// Usage: go run ./cmd/migrate [path/to/illusive.db]
package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	_ "embed"

	"illusive/internal/db"
	"illusive/internal/model"
)

//go:embed data.csv
var sourceCSV []byte

func main() {
	path := "illusive.db"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}

	if _, err := os.Stat(path); err == nil {
		log.Fatalf("refusing to overwrite existing database %q", path)
	}

	database, err := db.Open(path)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer database.Close()

	r := csv.NewReader(strings.NewReader(string(sourceCSV)))
	r.FieldsPerRecord = -1

	header, err := r.Read()
	if err != nil {
		log.Fatalf("read header: %v", err)
	}
	if len(header) < 3 {
		log.Fatalf("unexpected header: %v", header)
	}

	count := 0
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatalf("read record: %v", err)
		}
		if len(record) == 0 || strings.TrimSpace(record[0]) == "" {
			continue
		}

		a := model.Adjective{
			Adjective:             strings.TrimSpace(record[0]),
			TranslationLiteral:    strings.TrimSpace(record[1]),
			TranslationFigurative: strings.TrimSpace(record[2]),
		}
		if _, err := database.Create(a); err != nil {
			log.Fatalf("insert %q: %v", a.Adjective, err)
		}
		count++
	}

	fmt.Printf("imported %d adjectives into %s\n", count, path)
}
