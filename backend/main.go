package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
)

func main() {
	var certFile, keyFile, workDir string
	flag.StringVar(&certFile, "cert", "", "path to certificate")
	flag.StringVar(&keyFile, "key", "", "path to key")
	flag.StringVar(&workDir, "workDir", "", "path to folder with data")
	flag.Parse()

	server := &http.Server{
		Addr: ":7562",
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	env := CreateEnvironment(ctx, workDir)
	// answersHandler := CreateAnswersHandler(env)
	settingsHandler := CreateSettingsHandler(env)
	eventHandler := CreateEventHandler(env)

	// http.HandleFunc("/answer", answersHandler)
	http.HandleFunc("/settings", settingsHandler)
	http.HandleFunc("/event", eventHandler)
	go func(s *http.Server) {
		err := s.ListenAndServeTLS(certFile, keyFile)
		if err != nil {
			slog.Error(fmt.Sprint(err))
		}
	}(server)
	<-ctx.Done()
	err := server.Shutdown(context.TODO())
	if err != nil {
		slog.Error(fmt.Sprint(err))
	}
}
