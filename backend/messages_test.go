package main

import (
	"strings"
	"testing"
)

func TestParseSettingsFromJson(t *testing.T) {
	var example string = `{"ID":"afne","Type":1,"Name":"Test Name","Teams":{"Team A":1, "Team B":2, "Team C":3}, "ColumnNames":["A","B","C"],"RowNames":["1","2","3"],"Variants":[{"Answers":{"1":"123","2":"CAB"}}]}`
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
	var example string = `{"GameID":"abd","Timestamp":1703585600,"MailHash":"ad44FEr","TeamName":"Test Team","ColumnName":"A","RowName":"1","Answer":"i dunno"}`
	result, err := ParseCheckRequestFromJson(strings.NewReader(example))
	if err != nil {
		t.Errorf("Got unexpected error: %v", err)
		return
	}
	if result.GameID != "abd" {
		t.Errorf("Got unexpected gameID: %v (expected \"abd\"", result.GameID)
	}
}
