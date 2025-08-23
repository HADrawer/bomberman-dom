package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {

	mux := http.NewServeMux()

	// Serve static files
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("../Frontend/static"))))

	// Serve index.html
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../Frontend/index.html")
	})

	// WebSocket route
	// mux.HandleFunc("/ws", wsHandler)

	port := ":8080"
	fmt.Println(" Server is running on http://localhost" + port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
