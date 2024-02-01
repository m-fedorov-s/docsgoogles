package main

import (
	"fmt"
	"net/http"
)

func CreateSettingsHandler(env *Environment) func(http.ResponseWriter, *http.Request) {
	Logger := env.Logger.With("handler", "settings")
	return func(w http.ResponseWriter, req *http.Request) {
		Logger.Info("Started")
		parsed, err := ParseSettingsFromJson(req.Body)
		if err != nil {
			Logger.Error("Error parsing payload", "error", fmt.Sprint(err))
			http.Error(w, "Failed parsing payload", http.StatusBadRequest)
			return
		}
		key := GameID(parsed.ID)
		env.SettingsDB.Put(&key, &parsed)
		Logger.Info(fmt.Sprintf("Saved %v under key %v", parsed, key), "gameID", key)
		w.WriteHeader(http.StatusAccepted)
	}
}
