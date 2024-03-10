package main

import (
	"strings"
	"testing"
)

func TestParseSettingsFromJson(t *testing.T) {
	var example string = `{"ID":"afne","Type":1,"Name":"Test Name","Teams":{"Team A":1, "Team B":2, "Team C":3}, "ColumnNames":["A","B","C"],"RowNames":["1","2","3"]}`
	result, err := ParseSettingsFromJson(strings.NewReader(example))
	if err != nil {
		t.Errorf("Got unexpected error: %v", err)
		return
	}
	if result.Name != "Test Name" {
		t.Errorf("Got unexpected name: %v (expected \"Test Name\"", result.Name)
	}
}

func TestParseCheckRequestFromJson(t *testing.T) {
	var example string = `{"GameID":"abd","Timestamp":"2024-07-03T18:23:45.000Z","MailHash":"ad44FEr","TeamName":"Test Team","ColumnName":"A","RowName":"1","Answer":"i dunno"}`
	result, err := ParseCheckRequestFromJSON(strings.NewReader(example))
	if err != nil {
		t.Errorf("Got unexpected error: %v", err)
		return
	}
	if result.GameID != "abd" {
		t.Errorf("Got unexpected gameID: %v (expected \"abd\"", result.GameID)
	}
}

func TestSerialization(t *testing.T) {
	settings := Settings{
		ID:          "test-id",
		Type:        AbakaGameType,
		ColumnNames: []string{"a", "b"},
		RowNames:    []string{"1", "2"},
	}
	serialized, err := settings.Serialize()
	if err != nil {
		t.Fatalf("Error serializing settings: %v", err)
	}
	var restored Settings
	err = restored.Deserialize(serialized)
	if err != nil {
		t.Fatalf("Failed to deserialize settings: %v", err)
	}
	if restored.ID != settings.ID || restored.Type != settings.Type {
		t.Fatalf("Settings changed unexpectedly: was: %v, got: %v", settings, restored)
	}
}
