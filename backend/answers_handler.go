package main

import (
	"fmt"
	"net/http"
)

func CreateAnswersHandler(env *Environment) func(http.ResponseWriter, *http.Request) {
	Logger := env.Logger.With("handler", "answers")
	return func(w http.ResponseWriter, req *http.Request) {
		Logger.Info("Got request", "User-Agent", req.UserAgent())
		if req.Method != http.MethodPost {
			http.Error(w, "Wrong method", http.StatusBadRequest)
			return
		}
		parsed, err := ParseAnswersPostFromJson(req.Body)
		if err != nil {
			Logger.Error("Error parsing payload", "error", fmt.Sprint(err))
			http.Error(w, "Failed parsing payload", http.StatusBadRequest)
			return
		}
		err = parsed.Validate()
		if err != nil {
			Logger.Error("Error validating payload", "error", fmt.Sprint(err))
			http.Error(w, fmt.Sprintf("Maformed: %v", err), http.StatusBadRequest)
			return
		}
		key := SettingsKey(parsed.GameID)
		existing, err := env.SettingsDB.Contains(&key)
		if err != nil {
			Logger.Error("Unexpected error in DB", "error", fmt.Sprint(err))
			http.Error(w, "error", http.StatusInternalServerError)
			return
		}
		if !existing {
			http.Error(w, "game not found", http.StatusNotFound)
			return
		}
		settings, err := env.SettingsDB.Get(&key)
		if err != nil {
			Logger.Error("Unexpected error in DB", "error", fmt.Sprint(err))
			http.Error(w, "error", http.StatusInternalServerError)
			return
		}
		records := make(map[uint]*VariantAnswers)
		for _, r := range parsed.Records {
			_, ok := records[r.Variant]
			if !ok {
				records[r.Variant] = &VariantAnswers{
					Answers: make(map[AnswerKey]string),
				}
			}
			answerKey := ConvertKey(r.Key, settings)
			records[r.Variant].Answers[answerKey] = r.Data
		}
		Logger.Info("Merged answers", "answers", fmt.Sprint(records))
		for variant, r := range records {
			key := VariantKey{
				GameID:  parsed.GameID,
				Variant: variant,
			}
			hasOld, err := env.AnswersDB.Contains(&key)
			if err != nil {
				Logger.Error("Unexpected error in contains method", "error", fmt.Sprint(err))
			}
			if err != nil || !hasOld {
				err = env.AnswersDB.Put(&key, r)
				if err != nil {
					Logger.Error("Failed to put data to storage", "error", fmt.Sprint(err), "key", fmt.Sprint(key), "value", fmt.Sprint(r))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}
			} else {
				old, err := env.AnswersDB.Get(&key)
				if err != nil {
					Logger.Error("Error getting answers from database", "error", fmt.Sprint(err))
					http.Error(w, "Error", http.StatusInternalServerError)
					return
				}
				if old.Answers == nil {
					old.Answers = make(map[AnswerKey]string)
				}
				for answerKey, data := range r.Answers {
					old.Answers[answerKey] = data
				}
				err = env.AnswersDB.Put(&key, old)
				if err != nil {
					Logger.Error("Failed to put data to storage", "error", fmt.Sprint(err), "key", fmt.Sprint(key), "value", fmt.Sprint(old))
					w.WriteHeader(http.StatusInternalServerError)
					return
				}
			}
		}
		w.WriteHeader(http.StatusAccepted)
	}
}

func ConvertKey(key AnswerKeyMessage, settings *Settings) AnswerKey {
	return AnswerKey{
		ColumnIndex: 1,
		RowIndex:    1,
	}
}
