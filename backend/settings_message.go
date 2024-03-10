package main

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
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

type VariantAnswers struct {
	Answers map[AnswerKey]string
}

func (s VariantAnswers) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(&s)
	return buf.Bytes(), err
}

func (s *VariantAnswers) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(s)
	return err
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
	dec.DisallowUnknownFields()
	err := dec.Decode(&r)
	if err != nil {
		slog.Warn("Error decoding settings.", "error", fmt.Sprint(err))
	}
	return r, err
}

func (s *Settings) Validate() error {
	if s.ID == "" {
		return errors.New("Bad ID")
	}
	if s.Type == UndefinedType {
		return errors.New("Bad game type")
	}
	if len(s.ColumnNames) == 0 {
		return errors.New("No columns provided")
	}
	if len(s.RowNames) == 0 {
		return errors.New("No rows provided")
	}
	return nil
}

func (s Settings) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(&s)
	return buf.Bytes(), err
}

func (s *Settings) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(s)
	return err
}
