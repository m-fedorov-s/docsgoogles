package main

import (
	"bytes"
	"context"
	"encoding/gob"
	"fmt"
	storage "internal/storage"
	"log/slog"
	"os"
)

type GameID string

func (k *GameID) Serialize() ([]byte, error) {
	return []byte(*k), nil
}
func (k *GameID) Deserialize(data []byte) error {
	*k = GameID(string(data))
	return nil
}

type VariantKey struct {
	GameID  GameID
	Variant uint
}

func (k *VariantKey) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(k)
	return buf.Bytes(), err
}

func (k *VariantKey) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(k)
	return err
}

func (s *Settings) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(s)
	return buf.Bytes(), err
}

func (s *Settings) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(s)
	return err
}

type Environment struct {
	Logger     *slog.Logger
	SettingsDB storage.Storage[*GameID, *Settings]
	// AnswersDB  storage.Storage[*VariantKey, *Variant]
}

func CreateEnvironment(ctx context.Context, dataDir string) *Environment {
	res := &Environment{
		Logger:     slog.New(slog.NewJSONHandler(os.Stderr, nil)),
		SettingsDB: storage.Storage[*GameID, *Settings]{},
		// AnswersDB:  storage.Storage[*VariantKey, *Variant]{},
	}
	res.SettingsDB.Init(fmt.Sprintf("%v/settings/", dataDir))
	// res.AnswersDB.Init(fmt.Sprintf("%v/answers/", dataDir))
	go func(ctx context.Context, env *Environment) {
		<-ctx.Done()
		env.Logger.Info("Closing storages...")
		res.SettingsDB.Close()
		// res.AnswersDB.Close()
		env.Logger.Info("Storages closed.")
	}(ctx, res)
	return res
}
