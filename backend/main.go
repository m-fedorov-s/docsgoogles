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
	var isLocal bool
	var port int64
	flag.StringVar(&certFile, "cert", "", "path to certificate")
	flag.StringVar(&keyFile, "key", "", "path to key")
	flag.StringVar(&workDir, "workDir", "", "path to folder with data")
	flag.BoolVar(&isLocal, "local", false, "run in local mode")
	flag.Int64Var(&port, "port", 7562, "port to listen on")
	flag.Parse()

	if isLocal {
		fmt.Println("Running in local mode!")
	} else if certFile == "" || keyFile == "" {
		panic("Setificate or key is missing")
	}

	server := &http.Server{
		Addr: fmt.Sprintf(":%v", port),
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	env, err := CreateEnvironment(ctx, workDir)
	if err != nil {
		panic(err)
	}
	answersHandler := CreateAnswersHandler(env)
	settingsHandler := CreateSettingsHandler(env)
	eventHandler := CreateEventHandler(env)

	http.HandleFunc("/answers", answersHandler)
	http.HandleFunc("/settings", settingsHandler)
	http.HandleFunc("/event", eventHandler)
	go func(s *http.Server) {
		var err error
		if isLocal {
			err = s.ListenAndServe()
		} else {
			err = s.ListenAndServeTLS(certFile, keyFile)
		}
		if err != nil {
			slog.Error(fmt.Sprint(err))
		}
	}(server)
	<-ctx.Done()
	err = server.Shutdown(context.TODO())
	if err != nil {
		slog.Error(fmt.Sprint(err))
	}
}
