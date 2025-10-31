package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	currentGrid Grid
	gamePlayers []Player
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections
	},
}
var (
	clients        = make(map[*websocket.Conn]string)
	mu             sync.Mutex
	timerRunning   = false
	timeLeft       = 10
	stopTimer      = make(chan bool)
	connToPlayerID = make(map[*websocket.Conn]string)
)

func broadcast(msg interface{}) {
	mu.Lock()
	defer mu.Unlock()
	for conn := range clients {
		conn.WriteJSON(msg)
	}
}

func broadcastMessage(message interface{}) {
	mu.Lock()
	defer mu.Unlock()

	msgBytes, _ := json.Marshal(message)
	for client := range clients {
		client.WriteMessage(websocket.TextMessage, msgBytes)
	}
}

func startTimer() {
	if timerRunning {
		return
	}
	timerRunning = true

	go func() {
		timeLeft = 10
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if timeLeft > 0 {
					broadcast(map[string]interface{}{
						"type":      "timer",
						"time_left": timeLeft,
					})
					timeLeft--
				} else {
					currentGrid = generateGrid(11, 15) // same dimensions as frontend
					gamePlayers = assignPlayers()

					// Broadcast game start with grid + players
					broadcast(map[string]interface{}{
						"type":    "start_game",
						"grid":    currentGrid,
						"players": gamePlayers,
					})
					mu.Lock()
					for conn, username := range clients {
						for _, p := range gamePlayers {
							if p.Name == username {
								connToPlayerID[conn] = p.ID
								break
							}
						}
					}
					mu.Unlock()

					timerRunning = false
					return
				}
			case <-stopTimer:
				log.Println("Timer stopped (not enough players).")
				timerRunning = false
				timeLeft = 10
				return
			}
		}
	}()
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

func updateTimerBaseOnPlayers() {
	mu.Lock()
	count := len(clients)
	mu.Unlock()

	if count >= 2 && count <= 4 {
		if !timerRunning {
			log.Println("Starting timer...")
			startTimer()
		}
	} else {
		if timerRunning {
			log.Println("Not enough players, stopping timer.")
			stopTimer <- true
		}
	}
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
				updateTimerBaseOnPlayers()

				broadcast(map[string]interface{}{
					"type":    "waiting",
					"message": "Waiting for players...",
				})

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
			log.Printf("User set name: %s. Total clients: %d, ", currentUserID, len(clients))
			log.Printf("Current clients: %v", clients)

			// Add client to map
			mu.Lock()
			clients[conn] = currentUserID
			mu.Unlock()

			// Send welcome message to the new user
			welcomeMsg := map[string]interface{}{
				"type": "system",
				"text": fmt.Sprintf("Hello %s , Waiting another players", currentUserID),
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
			updateTimerBaseOnPlayers()
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
			updateTimerBaseOnPlayers()

		case "message":
			var myMessage MyMessage
			json.Unmarshal(message, &myMessage)
			log.Printf("Message from %s: %s", currentUserID, myMessage.Text)

			for client := range clients {
				if currentUserID == clients[client] {
					continue // Skip sender
				}
				var sendMessage MyMessage
				sendMessage.Type = "message"
				sendMessage.From = currentUserID
				sendMessage.Text = myMessage.Text
				client.WriteJSON(sendMessage)
				log.Printf("Sent message to %s", clients[client])
			}
			// Register connection only once per user
			if currentUserID == "" {
				currentUserID = myMessage.From
				//registerSocket(currentUserID, conn)
			}

		case "move":
			var moveMsg struct {
				ID        string `json:"id"`
				Direction string `json:"direction"`
			}
			if err := json.Unmarshal(message, &moveMsg); err != nil {
				log.Printf("Error parsing move message: %v", err)
				continue
			}
			
			// playerID, ok := connToPlayerID[conn]
			// if !ok {
			// 	log.Println("Unknown connection tried to move.")
			// }

			go movePlayer(moveMsg.ID, moveMsg.Direction)

		}

	}
}

// Generate grid once per game
func generateGrid(rows, cols int) Grid {
	grid := Grid{
		Rows:  rows,
		Cols:  cols,
		Cells: make([][]Cell, rows),
	}

	// Predefined start zones
	startZones := [][2]int{
		{1, 1},
		{1, cols - 2},
		{rows - 2, 1},
		{rows - 2, cols - 2},
	}

	// Helper: is near start zone (3x3 area)
	isNearStartZone := func(r, c int) bool {
		for _, sz := range startZones {
			if abs(r-sz[0]) <= 1 && abs(c-sz[1]) <= 1 {
				return true
			}
		}
		return false
	}

	for r := 0; r < rows; r++ {
		grid.Cells[r] = make([]Cell, cols)
		for c := 0; c < cols; c++ {
			cellType := "sand"

			// Outer walls
			if r == 0 || r == rows-1 || c == 0 || c == cols-1 {
				cellType = "wall"
			} else if (r == 1 && (c == 1 || c == cols-2)) ||
				(r == rows-2 && (c == 1 || c == cols-2)) {
				cellType = "start-zone"
			} else if r%2 == 0 && c%2 == 0 {
				cellType = "inner-wall"
			} else {
				// Random destructible stones (40%), not near start
				if rand.Float64() < 0.4 && !isNearStartZone(r, c) {
					cellType = "stone"
				}
			}

			grid.Cells[r][c] = Cell{Type: cellType}
		}
	}

	return grid
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// Predefined spawn points (match your JS safe zones)
var spawnPoints = [][2]int{
	{1, 1},  // Top-left
	{1, 13}, // Top-right
	{9, 1},  // Bottom-left
	{9, 13}, // Bottom-right
}

func assignPlayers() []Player {
	players := []Player{}
	i := 0
	for _, username := range clients {
		if i >= len(spawnPoints) {
			break // max 4 players
		}
		spawn := spawnPoints[i]
		players = append(players, Player{
			ID:   fmt.Sprintf("p%d", i+1),
			X:    spawn[1],
			Y:    spawn[0],
			Name: username,
		})
		i++
	}
	return players
}

func movePlayer(id, dir string) {
	
	mu.Lock()
	for i, p := range gamePlayers {
		if p.ID == id {
			newX, newY := p.X, p.Y
			switch dir {
			case "up":
				newY--
			case "down":
				newY++
			case "left":
				newX--
			case "right":
				newX++
			}
			if newY >= 0 && newY < currentGrid.Rows &&
			newX >= 0 && newX < currentGrid.Cols {
				
				cellType := currentGrid.Cells[newY][newX].Type
				if cellType == "sand" || cellType == "start-zone" {
					gamePlayers[i].X = newX
					gamePlayers[i].Y = newY
				}
			}
			mu.Unlock()
			broadcast(map[string]interface{}{
				"type": "player_moved",
				"id":   p.ID,
				"x":    gamePlayers[i].X,
				"y":    gamePlayers[i].Y,
				"name": p.Name,
			})
			break
		}
	}
}
