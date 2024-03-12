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

func CreateEnvironment(ctx context.Context, dataDir string) (*Environment, error) {
	res := &Environment{
		Logger:     slog.New(slog.NewJSONHandler(os.Stderr, nil)),
		SettingsDB: storage.Storage[*SettingsKey, *Settings]{},
		AnswersDB:  storage.Storage[*VariantKey, *VariantAnswers]{},
	}
	err := res.SettingsDB.Init(fmt.Sprintf("%v/settings/", dataDir))
	if err != nil {
		return nil, err
	}
	err = res.AnswersDB.Init(fmt.Sprintf("%v/answers/", dataDir))
	if err != nil {
		res.SettingsDB.Close()
		return nil, err
	}
	go func(ctx context.Context, env *Environment) {
		<-ctx.Done()
		env.Logger.Info("Closing storages...")
		res.SettingsDB.Close()
		res.AnswersDB.Close()
		env.Logger.Info("Storages closed.")
	}(ctx, res)
	return res, nil
}
