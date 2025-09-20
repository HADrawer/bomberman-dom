package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections
	},
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	var currentUserID string
	var once sync.Once
	closeConn := func() {
		once.Do(func() {
			if currentUserID != "" {
				//removeSocket(currentUserID)
			}
			conn.Close()
			log.Println("WebSocket connection closed for user:", currentUserID)
		})
	}

	defer closeConn()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway) {
				log.Printf("Connection closed unexpectedly: %v", err)
			}
			break
		}

		var rawJson struct {
			Type string `json:"type"`
		}
		json.Unmarshal(message, &rawJson)

		switch rawJson.Type {
		case "send":
			var myMessage MyMessage
			json.Unmarshal(message, &myMessage)
			fmt.Println("reviced==>", myMessage)
			// Register connection only once per user
			if currentUserID == "" {
				currentUserID = myMessage.From
				//registerSocket(currentUserID, conn)
			}

			//handleWebSocketMessage(app, conn, myMessage)

		}
	}
}
