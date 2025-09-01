package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	// Serve static files (CSS, images, etc.)
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("../Frontend/static"))))

	// Serve game folder (grid.js)
	mux.Handle("/game/", http.StripPrefix("/game/", http.FileServer(http.Dir("../Frontend/game"))))

	// Serve Framework folder (app.js, v-node.js, etc.)
	mux.Handle("/Framework/", http.StripPrefix("/Framework/", http.FileServer(http.Dir("../Frontend/Framework"))))

	// Serve app.js
	mux.Handle("/app.js", http.StripPrefix("/", http.FileServer(http.Dir("../Frontend"))))

	// Serve index.html at root
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "../Frontend/index.html")
	})

	port := ":8080"
	fmt.Println("Server running on http://localhost" + port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
