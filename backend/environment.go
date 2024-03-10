package main

import (
	"context"
	"fmt"
	storage "internal/storage"
	"log/slog"
	"os"
)

type Environment struct {
	Logger     *slog.Logger
	SettingsDB storage.Storage[*SettingsKey, *Settings]
	AnswersDB  storage.Storage[*VariantKey, *VariantAnswers]
}

func CreateEnvironment(ctx context.Context, dataDir string) *Environment {
	res := &Environment{
		Logger:     slog.New(slog.NewJSONHandler(os.Stderr, nil)),
		SettingsDB: storage.Storage[*SettingsKey, *Settings]{},
		AnswersDB:  storage.Storage[*VariantKey, *VariantAnswers]{},
	}
	res.SettingsDB.Init(fmt.Sprintf("%v/settings/", dataDir))
	res.AnswersDB.Init(fmt.Sprintf("%v/answers/", dataDir))
	go func(ctx context.Context, env *Environment) {
		<-ctx.Done()
		env.Logger.Info("Closing storages...")
		res.SettingsDB.Close()
		res.AnswersDB.Close()
		env.Logger.Info("Storages closed.")
	}(ctx, res)
	return res
}
