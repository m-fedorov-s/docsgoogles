package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"time"
)

type CheckRequest struct {
	GameID     GameID
	Timestamp  time.Time
	MailHash   string
	TeamName   string
	ColumnName string
	RowName    string
	Answer     string
}

func ParseCheckRequestFromJSON(input io.Reader) (CheckRequest, error) {
	var r CheckRequest
	dec := json.NewDecoder(input)
	dec.DisallowUnknownFields()
	err := dec.Decode(&r)
	if err != nil {
		slog.Warn("Error parsing CheckRequest.", "error", fmt.Sprint(err))
	}
	return r, err
}
