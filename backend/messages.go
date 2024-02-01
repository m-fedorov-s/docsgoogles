package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"time"
)

type GameType int

const (
	UndefinedType     GameType = 0
	AbakaGameType              = 1
	TansposedAbaka             = 2
	TicTacToeGameType          = 3
	CarouselGameType           = 4
)

type SecondAnswerPolicy int

const (
	UndefinedPolicy SecondAnswerPolicy = 0
	RejectPolicy                       = 1
	AllowPolicy                        = 2
)

type Variant struct {
	Answers map[int]string
}

type Settings struct {
	ID          string
	Type        GameType
	Name        string
	Teams       map[string]uint
	ColumnNames []string
	RowNames    []string
}

func ParseSettingsFromJson(input io.Reader) (Settings, error) {
	var r Settings
	dec := json.NewDecoder(input)
	err := dec.Decode(&r)
	if err != nil {
		slog.Warn("Error decoding settings.", "error", fmt.Sprint(err))
	}
	return r, err
}

type CheckRequest struct {
	GameID     string
	Timestamp  time.Time
	MailHash   string
	TeamName   string
	ColumnName string
	RowName    string
	Answer     string
}

func ParseCheckRequestFromJson(input io.Reader) (CheckRequest, error) {
	var r CheckRequest
	dec := json.NewDecoder(input)
	err := dec.Decode(&r)
	if err != nil {
		slog.Warn("Error parsing CheckRequest.", "error", fmt.Sprint(err))
	}
	return r, err
}
