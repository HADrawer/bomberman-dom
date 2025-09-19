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
var clients = make(map[*websocket.Conn]string) // conn -> username
var mu sync.Mutex


func broadcastMessage(message interface{}) {
    mu.Lock()
    defer mu.Unlock()

    msgBytes, _ := json.Marshal(message)
    for client := range clients {
        client.WriteMessage(websocket.TextMessage, msgBytes)
    }
}

func sendPlayerList(conn *websocket.Conn) {
    mu.Lock()
    defer mu.Unlock()

    players := make([]string, 0, len(clients))
    for _, username := range clients {
        players = append(players, username)
    }

    playerListMsg := map[string]interface{}{
        "type":    "player_list",
        "players": players,
    }
    
    playerListBytes, _ := json.Marshal(playerListMsg)
    conn.WriteMessage(websocket.TextMessage, playerListBytes)
    log.Printf("Sent player list to %s: %v", clients[conn], players)
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
            mu.Lock()
            delete(clients, conn)
            mu.Unlock()

            // Notify others that this user left
            leaveMsg := map[string]interface{}{
                "type": "user_left",
                "name": currentUserID,
            }
            leaveBytes, _ := json.Marshal(leaveMsg)
            
            mu.Lock()
            for client := range clients {
                client.WriteMessage(websocket.TextMessage, leaveBytes)
            }
            mu.Unlock()
            
            log.Printf("User %s disconnected. Remaining: %d", currentUserID, len(clients))
        }
        conn.Close()
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
		log.Printf("Raw message received: %s", string(message))

		var msgType struct {
			Type string `json:"type"`
		}
		 if err := json.Unmarshal(message, &msgType); err != nil {
			log.Printf("Error parsing message type: %v", err)
			continue
		}

		log.Printf("Message type: %s", msgType.Type)

		switch msgType.Type {
		case "set_name":
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Error parsing set_name message: %v", err)
				continue
			}
			
			// Extract the name field
			name, ok := msg["name"].(string)
			if !ok || name == "" {
				log.Printf("Invalid or empty name received")
				continue
			}
			
			currentUserID = name
			log.Printf("User set name: %s. Total clients: %d", currentUserID, len(clients))

			// Add client to map
			mu.Lock()
			clients[conn] = currentUserID
			mu.Unlock()

			// Send welcome message to the new user
			welcomeMsg := map[string]interface{}{
				"type": "system",
				"text": fmt.Sprintf("مرحباً %s! انتظر اللاعبين الآخرين", currentUserID),
			}
			welcomeBytes, _ := json.Marshal(welcomeMsg)
			conn.WriteMessage(websocket.TextMessage, welcomeBytes)

			sendPlayerList(conn)

			// Broadcast to ALL other clients that a new user joined
			userJoinedMsg := map[string]interface{}{
				"type": "user_joined",
				"name": currentUserID,
			}
			userJoinedBytes, _ := json.Marshal(userJoinedMsg)

			// systemMsg := map[string]interface{}{
			// 	"type": "system", 
			// 	"text": fmt.Sprintf("👤 %s انضم إلى اللعبة", currentUserID),
			// }
			// systemBytes, _ := json.Marshal(systemMsg)

			mu.Lock()
			for client, username := range clients {
				// Don't send the join notification to the user who just joined
				if username != currentUserID {
					log.Printf("Notifying %s about new user %s", username, currentUserID)
					client.WriteMessage(websocket.TextMessage, userJoinedBytes)
					// client.WriteMessage(websocket.TextMessage, systemBytes)
				}
			}
			mu.Unlock()

			// // Send current player list to the new user
			// sendPlayerList(conn)
			

		case "get_players":
			log.Printf("Sending player list to %s", currentUserID)
			sendPlayerList(conn)

		case "message", "get_users", "get_chat_history", "new_message", "logout", "get_group_chat_history", "group_message":
			var myMessage MyMessage
			json.Unmarshal(message, &myMessage)

			// Register connection only once per user
			if currentUserID == "" {
				currentUserID = myMessage.From
				//registerSocket(currentUserID, conn)
			}

			//handleWebSocketMessage(app, conn, myMessage)
		}
	}
}
