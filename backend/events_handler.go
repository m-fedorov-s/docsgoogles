package main

import (
	"fmt"
	"net/http"
	"slices"
)

func CreateEventHandler(env *Environment) func(http.ResponseWriter, *http.Request) {
	Logger := env.Logger.With("handler", "event")
	return func(w http.ResponseWriter, req *http.Request) {
		Logger.Info("Got request", "User-Agent", req.UserAgent())
		event, err := ParseCheckRequestFromJSON(req.Body)
		if err != nil {
			Logger.Error("Error parsing payload", "error", fmt.Sprint(err))
			http.Error(w, "Failed parsing payload", http.StatusBadRequest)
			return
		}
		Logger.Info("Incoming event", "event", fmt.Sprint(event))
		settingsKey := SettingsKey(event.GameID)
		settings, err := env.SettingsDB.Get(&settingsKey)
		if err != nil {
			Logger.Warn("Game with id not found", "gameID", event.GameID, "error", fmt.Sprint(err))
			http.Error(w, "Game not found", http.StatusNotFound)
			return
		}
		variant, found := settings.Teams[event.TeamName]
		if !found {
			Logger.Warn("Team not found", "gameID", event.GameID, "teamName", event.TeamName, "error", fmt.Sprint(err))
			http.Error(w, "Team not found", http.StatusNotFound)
			return
		}
		answersKey := VariantKey{
			GameID:  event.GameID,
			Variant: variant,
		}
		answers, err := env.AnswersDB.Get(&answersKey)
		if err != nil {
			Logger.Warn("Answers not found", "gameID", event.GameID, "variant", variant, "error", fmt.Sprint(err))
			http.Error(w, "Variant not found", http.StatusNotFound)
			return
		}
		Logger.Info("got answers", "answers", fmt.Sprint(answers))
		columnIndex := slices.Index(settings.ColumnNames, event.ColumnName)
		if columnIndex < 0 {
			http.Error(w, "bad column name", http.StatusBadRequest)
			return
		}
		rowIndex := slices.Index(settings.RowNames, event.RowName)
		if rowIndex < 0 {
			http.Error(w, "ban row name", http.StatusBadRequest)
			return
		}
		answerKey := AnswerKey{
			ColumnIndex: uint(columnIndex),
			RowIndex:    uint(rowIndex),
		}
		if answers.Answers[answerKey] == event.Answer {
			w.Write([]byte("correct"))
		} else {
			w.Write([]byte("wrong"))
		}
		w.WriteHeader(http.StatusOK)
	}
}
