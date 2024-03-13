package main

import (
	"fmt"
	"net/http"
	"slices"
	"sort"
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
		err = event.Validate()
		if err != nil {
			http.Error(w, fmt.Sprint(err), http.StatusBadRequest)
			return
		}
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
			http.Error(w, "column not found", http.StatusBadRequest)
			return
		}
		rowIndex := slices.Index(settings.RowNames, event.RowName)
		if rowIndex < 0 {
			http.Error(w, "row not found", http.StatusBadRequest)
			return
		}
		problemKey := ProblemKey{
			ColumnIndex: uint(columnIndex),
			RowIndex:    uint(rowIndex),
		}
		expected, found := answers.Answers[problemKey]
		if !found {
			http.Error(w, "answer not found", http.StatusNotFound)
			return
		}
		teamKey := TeamResultKey{
			GameID:   event.GameID,
			TeamName: event.TeamName,
		}
		exists, err := env.ResultsDB.Contains(&teamKey)
		if err != nil {
			Logger.Error("Error in DB", "error", err)
			http.Error(w, "error", http.StatusInternalServerError)
			return
		}
		var history *TeamResult
		if exists {
			history, err = env.ResultsDB.Get(&teamKey)
			if err != nil {
				Logger.Error("Error in DB", "error", err)
				http.Error(w, "error", http.StatusInternalServerError)
				return
			}
		} else {
			history = &TeamResult{
				Submissions: make(map[ProblemKey]([]Record)),
			}
		}
		_, ok := history.Submissions[problemKey]
		if !ok {
			history.Submissions[problemKey] = make([]Record, 0)
		}
		var (
			shouldAccept bool
			message      string
		)
		if len(history.Submissions[problemKey]) == 0 || history.Submissions[problemKey][0].Timestamp.After(*event.Timestamp) {
			shouldAccept = expected == event.Answer
			if shouldAccept {
				message = CORRECT
			} else {
				message = WRONG
			}
		} else {
			shouldAccept = false
			message = NOT_FIRST_SUBMISSION
		}
		history.Submissions[problemKey] = append(history.Submissions[problemKey], Record{Timestamp: *event.Timestamp, Answer: event.Answer})
		sort.Slice(history.Submissions[problemKey], func(i, j int) bool {
			return history.Submissions[problemKey][i].Timestamp.Before(history.Submissions[problemKey][j].Timestamp)
		})
		env.ResultsDB.Put(&teamKey, history)
		result := CheckResponse{
			Accepted:       shouldAccept,
			Message:        message,
			ExpectedAnswer: expected,
		}
		data, err := result.ToJson()
		if err != nil {
			Logger.Error("Error serializing to json", "error", fmt.Sprint(err))
			http.Error(w, "error", http.StatusInternalServerError)
			return
		}
		w.Write([]byte(data))
	}
}
