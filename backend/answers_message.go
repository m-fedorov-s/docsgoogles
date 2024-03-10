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

type AnswerRecord struct {
	Variant uint
	Key     AnswerKey
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
