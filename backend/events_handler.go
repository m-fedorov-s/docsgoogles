package main

import (
	"fmt"
	"net/http"
)

func CreateEventHandler(env *Environment) func(http.ResponseWriter, *http.Request) {
	Logger := env.Logger.With("handler", "event")
	return func(w http.ResponseWriter, req *http.Request) {
		event, err := ParseCheckRequestFromJson(req.Body)
		if err != nil {
			Logger.Error("Error parsing payload", "error", fmt.Sprint(err))
			http.Error(w, "Failed parsing payload", http.StatusBadRequest)
			return
		}
		Logger.Info("Incomint event", "event", fmt.Sprint(event))
	}
}
