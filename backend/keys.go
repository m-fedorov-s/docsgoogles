package main

import (
	"bytes"
	"encoding/gob"
)

type GameID string

type SettingsKey GameID

func (k SettingsKey) Serialize() ([]byte, error) {
	return []byte(k), nil
}

func (k *SettingsKey) Deserialize(data []byte) error {
	*k = SettingsKey(string(data))
	return nil
}

type VariantKey struct {
	GameID  GameID
	Variant uint
}

func (k VariantKey) Serialize() ([]byte, error) {
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

type CheckRequestKey struct {
	GameID    GameID
	RequestID uint
}

func (k CheckRequestKey) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(k)
	return buf.Bytes(), err
}

func (k *CheckRequestKey) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(k)
	return err
}
