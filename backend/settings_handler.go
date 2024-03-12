package main

import (
	"fmt"
	"io"
	"net/http"
)

func CreateSettingsHandler(env *Environment) func(http.ResponseWriter, *http.Request) {
	Logger := env.Logger.With("handler", "settings")
	return func(w http.ResponseWriter, req *http.Request) {
		Logger.Info("Got request", "User-Agent", req.UserAgent())
		if req.Method != http.MethodPost {
			if b, err := io.ReadAll(req.Body); err == nil {
				key := SettingsKey(b)
				found, err := env.SettingsDB.Contains(&key)
				if err != nil {
					Logger.Error("Unexpected error in DB", "error", fmt.Sprint(err))
					http.Error(w, "Error", http.StatusInternalServerError)
					return
				}
				if !found {
					http.Error(w, "not found", http.StatusNotFound)
					return
				}
				settings, err := env.SettingsDB.Get(&key)
				if err != nil {
					Logger.Error("Error getting settings", "error", fmt.Sprint(err), "GameID", key)
					http.Error(w, "Error", http.StatusInternalServerError)
				} else {
					w.WriteHeader(http.StatusOK)
					answer, err := DumpSettingsToJson(settings)
					if err != nil {
						Logger.Error("Error dumping to json", "error", fmt.Sprint(err))
						http.Error(w, "Error", http.StatusInternalServerError)
						return
					}
					w.Write([]byte(answer))
				}
			} else {
				http.Error(w, fmt.Sprintf("Error reading body: %v", err), http.StatusBadRequest)
			}
			return
		}
		parsed, err := ParseSettingsFromJson(req.Body)
		Logger.Info("Parsing payload", "payload", fmt.Sprint(req.Body))
		if err != nil {
			Logger.Error("Error parsing payload", "error", fmt.Sprint(err))
			http.Error(w, "Failed parsing payload", http.StatusBadRequest)
			return
		}
		err = parsed.Validate()
		if err != nil {
			http.Error(w, fmt.Sprint(err), http.StatusBadRequest)
			return
		}
		key := SettingsKey(parsed.ID)
		err = env.SettingsDB.Put(&key, &parsed)
		if err != nil {
			Logger.Error("Unexpected DB error", "error", fmt.Sprint(err))
			http.Error(w, "Error", http.StatusInternalServerError)
			return
		}
		Logger.Info(fmt.Sprintf("Saved %v under key %v", parsed, key), "gameID", key)
		w.WriteHeader(http.StatusNoContent)
	}
}
