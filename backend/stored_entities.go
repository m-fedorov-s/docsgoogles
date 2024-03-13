package main

import (
	"bytes"
	"encoding/gob"
	"time"
)

type Record struct {
	Timestamp time.Time
	Answer    string
}

type TeamResult struct {
	Submissions map[ProblemKey]([]Record)
}

func (entity TeamResult) Serialize() ([]byte, error) {
	var buf bytes.Buffer
	encoder := gob.NewEncoder(&buf)
	err := encoder.Encode(&entity)
	return buf.Bytes(), err
}

func (entity *TeamResult) Deserialize(data []byte) error {
	buf := bytes.NewBuffer(data)
	decoder := gob.NewDecoder(buf)
	err := decoder.Decode(entity)
	return err
}
