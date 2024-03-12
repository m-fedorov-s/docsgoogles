package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
)

type AnswerKey struct {
	ColumnIndex uint
	RowIndex    uint
}

type AnswerKeyMessage struct {
	ColumnIndex *uint
	RowIndex    *uint
	ColumnName  *string
	RowName     *string
}

type AnswerRecord struct {
	Variant uint
	Key     AnswerKeyMessage
	Data    string
}

type AnswersPost struct {
	GameID  GameID
	Records []AnswerRecord
}

func ParseAnswersPostFromJson(input io.Reader) (AnswersPost, error) {
	var r AnswersPost
	dec := json.NewDecoder(input)
	dec.DisallowUnknownFields()
	err := dec.Decode(&r)
	if err != nil {
		slog.Warn("Error decoding answers post.", "error", fmt.Sprint(err))
	}
	return r, err
}

func (p AnswersPost) Validate() error {
	if p.GameID == "" {
		return fmt.Errorf("Missing game id")
	}
	for _, r := range p.Records {
		if r.Key.ColumnIndex == nil && r.Key.ColumnName == nil || r.Key.ColumnIndex != nil && r.Key.ColumnName != nil {
			return fmt.Errorf("Exactely one of \"ColumnName\" and \"ColumnIndex\" should be set")
		}
		if r.Key.RowIndex == nil && r.Key.RowName == nil || r.Key.RowIndex != nil && r.Key.RowName != nil {
			return fmt.Errorf("Exactely one of \"RowName\" and \"RowIndex\" should be set")
		}
	}
	return nil
}
