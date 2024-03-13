package main

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"
)

type CheckRequest struct {
	GameID     GameID
	Timestamp  *time.Time
	MailHash   string
	TeamName   string
	ColumnName string
	RowName    string
	Answer     string
}

type CheckResponse struct {
	IsCorrect      bool
	Message        string
	ExpectedAnswer string
}

func ParseCheckRequestFromJSON(input io.Reader) (CheckRequest, error) {
	var r CheckRequest
	dec := json.NewDecoder(input)
	dec.DisallowUnknownFields()
	err := dec.Decode(&r)
	return r, err
}

func (req CheckRequest) Validate() error {
	if req.GameID == "" {
		return fmt.Errorf("Invalid game id")
	}
	if req.Timestamp == nil {
		return fmt.Errorf("Missing timestamp")
	}
	if req.TeamName == "" {
		return fmt.Errorf("Invalid team name")
	}
	if req.ColumnName == "" {
		return fmt.Errorf("Invalid column name")
	}
	if req.RowName == "" {
		return fmt.Errorf("Invalid row name")
	}
	if req.Answer == "" {
		return fmt.Errorf("Empty answer")
	}
	return nil
}

func (response CheckResponse) ToJson() (string, error) {
	var buf strings.Builder
	enc := json.NewEncoder(&buf)
	err := enc.Encode(response)
	return buf.String(), err
}
