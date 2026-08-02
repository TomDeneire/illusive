package model

// Adjective represents a single entry in the adjectives dictionary.
type Adjective struct {
	ID                   int64  `json:"id"`
	Root                 string `json:"root"`
	Adjective            string `json:"adjective"`
	DerivedAdverb        string `json:"derivedAdverb"`
	TranslationLiteral   string `json:"translationLiteral"`
	TranslationFigurative string `json:"translationFigurative"`
	ExampleLiteral       string `json:"exampleLiteral"`
	ExampleFigurative    string `json:"exampleFigurative"`
}
