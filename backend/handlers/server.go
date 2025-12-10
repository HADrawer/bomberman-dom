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

type ClientData struct {
	Name      string
	Skin      string
	SessionID string
	GameState string
}

var (
	clients        = make(map[*websocket.Conn]ClientData)
	mu             sync.Mutex
	timerRunning   = false
	timeLeft       = 60
	stopTimer      = make(chan bool)
	connToPlayerID = make(map[*websocket.Conn]string)
	bombs          = make(map[string]Bomb)
)
var gameStarted bool = false

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
func init() {
	// Seed RNG once
	rand.Seed(time.Now().UnixNano())
}

func startTimer() {
	if timerRunning {
		return
	}
	timerRunning = true

	go func() {
		timeLeft = 20
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
					gameStarted = true
					broadcast(map[string]interface{}{
						"type":    "start_game",
						"grid":    currentGrid,
						"players": gamePlayers,
					})
					mu.Lock()
					for conn, clientData := range clients {
						for _, p := range gamePlayers {
							if p.SessionID == clientData.SessionID {
								connToPlayerID[conn] = p.ID
								clientData.GameState = "StateInGame"
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
				timeLeft = 60
				return
			}
		}
	}()
}

func sendPlayerList(conn *websocket.Conn) {
	mu.Lock()
	defer mu.Unlock()

	players := make([]map[string]string, 0, len(clients))
	for _, clientData := range clients {
		players = append(players, map[string]string{
			"name":    clientData.Name,
			"skin":    clientData.Skin,
			"session": clientData.SessionID,
		})
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
	var currentUserName string
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
					"name": currentUserName,
				}
				leaveBytes, _ := json.Marshal(leaveMsg)

				mu.Lock()
				for client := range clients {
					client.WriteMessage(websocket.TextMessage, leaveBytes)
				}
				mu.Unlock()

				log.Printf("User %s disconnected. Remaining: %d", currentUserName, len(clients))
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

			name, _ := msg["name"].(string)
			skin, _ := msg["skin"].(string)

			if gameStarted {
				conn.WriteJSON(map[string]interface{}{
					"type":   "join_denied",
					"reason": "Game already started",
				})
				return
			}
			if len(clients) >= 4 {
				conn.WriteJSON(map[string]interface{}{
					"type":   "join_denied",
					"reason": "Game is Full Already",
				})
				return
			}

			if name == "" {
				log.Printf("Invalid or empty name received")
				continue
			}

			session := generateSessionID()

			currentUserID = session
			currentUserName = name

			mu.Lock()
			clients[conn] = ClientData{Name: name, Skin: skin, SessionID: session, GameState: "waiting_room"}
			mu.Unlock()

			conn.WriteJSON(map[string]interface{}{
				"type":      "session_assigned",
				"sessionId": session,
			})

			log.Printf("User set name: %s with skin: %s", name, skin)

			// Send welcome message to the new user
			welcomeMsg := map[string]interface{}{
				"type": "system",
				"text": fmt.Sprintf("Hello %s , Waiting another players", clients[conn].Name),
			}
			welcomeBytes, _ := json.Marshal(welcomeMsg)
			conn.WriteMessage(websocket.TextMessage, welcomeBytes)

			sendPlayerList(conn)

			// Broadcast to ALL other clients that a new user joined
			userJoinedMsg := map[string]interface{}{
				"type": "user_joined",
				"name": name,
				"skin": skin,
			}

			userJoinedBytes, _ := json.Marshal(userJoinedMsg)

			updateTimerBaseOnPlayers()
			mu.Lock()
			for client, clientData := range clients { // Don't send the join notification to the user who just joined
				if clientData.SessionID != currentUserID {
					log.Printf("Notifying %s about new user %s", clientData.Name)
					client.WriteMessage(websocket.TextMessage, userJoinedBytes)
					// client.WriteMessage(websocket.TextMessage, systemBytes)
				}
			}
			mu.Unlock()

			// // Send current player list to the new user
			// sendPlayerList(conn)

		case "get_players":
			log.Printf("Sending player list to %s", currentUserName)
			sendPlayerList(conn)
			updateTimerBaseOnPlayers()

		case "message":
			var myMessage MyMessage
			json.Unmarshal(message, &myMessage)
			log.Printf("Message from %s: %s", currentUserName, myMessage.Text)

			for client := range clients {
				if currentUserID == clients[client].Name {
					continue // Skip sender
				}
				var sendMessage MyMessage
				sendMessage.Type = "message"
				sendMessage.From = currentUserName
				sendMessage.Text = myMessage.Text
				client.WriteJSON(sendMessage)
				log.Printf("Sent message to %s", clients[client])
			}
			// Register connection only once per user
			if currentUserName == "" {
				currentUserName = myMessage.From
				//registerSocket(currentUserName, conn)
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
			println(moveMsg.ID)
			println(moveMsg.Direction)
			movePlayer(moveMsg.ID, moveMsg.Direction)

		case "damage":
			var d struct {
				ID     string `json:"id"`
				Amount int    `json:"amount"`
			}
			if err := json.Unmarshal(message, &d); err == nil {
				damagePlayer(d.ID, d.Amount)
			}

		case "plant_bomb":
			var bombMsg struct {
				ID string `json:"id"`
				X  int    `json:"x"`
				Y  int    `json:"y"`
			}
			if err := json.Unmarshal(message, &bombMsg); err != nil {
				log.Println("Error parsing Plant_bomb:", err)
				continue
			}
			playerID := connToPlayerID[conn]
			plant_bomb(playerID, bombMsg.X, bombMsg.Y)

		case "reconnect":
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("Error parsing set_name message: %v", err)
				continue
			}
			mu.Lock()
			session := msg["session"].(string)

			state := ""
			for _, clientData := range clients {

				if session == clientData.SessionID {

					state = clientData.GameState
					break
				}

			}

			if state == "" {
				mu.Unlock()
				conn.WriteJSON(map[string]interface{}{
					"type":  "reconnect_status",
					"state": "not_found",
				})
				return
			}

			mu.Unlock()
			switch state {
			case "waiting_room":
				conn.WriteJSON(map[string]interface{}{
					"type":  "reconnect_status",
					"state": "waiting_room",
				})
			case "in_game":
				conn.WriteJSON(map[string]interface{}{
					"type":    "reconnect_status",
					"state":   "in_game",
					"grid":    currentGrid,
					"players": gamePlayers,
				})

				// case StateDead:
				// 	conn.WriteJSON(map[string]interface{}{
				// 		"type":  "reconnect_status",
				// 		"state": "dead",
				// 	})
			}
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
				if rand.Float64() < 0.8 && !isNearStartZone(r, c) {
					cellType = "stone"
				}
			}

			grid.Cells[r][c] = Cell{Type: cellType, PowerUp: ""}
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
	for _, clientData := range clients {
		if i >= len(spawnPoints) {
			break // max 4 players
		}
		spawn := spawnPoints[i]
		players = append(players, Player{
			ID:           fmt.Sprintf("p%d", i+1),
			X:            spawn[1],
			Y:            spawn[0],
			Name:         clientData.Name,
			SessionID:    clientData.SessionID,
			State:        StateInGame,
			Skin:         clientData.Skin,
			Lives:        3,
			BombRange:    1,
			BombCount:    1,
			MoveCooldown: 500 * time.Millisecond,
			NextMoveTime: time.Now(),
		})
		i++
	}
	return players
}
func canMove(player Player, newX, newY int) bool {

	// 1. Bomb blocking check
	for _, b := range bombs {
		if b.X == newX && b.Y == newY {

			// Owner standing ON bomb is allowed
			if b.OwnerID == player.ID && player.X == b.X && player.Y == b.Y {
				return true
			}

			// Once owner steps off → bomb becomes solid
			if b.OwnerID == player.ID && !(player.X == b.X && player.Y == b.Y) {
				b.Walkable = false
				bombs[b.ID] = b
				return false
			}

			// Others NEVER walk on bombs
			return false
		}
	}

	// 2. Prevent walking into another player
	for _, other := range gamePlayers {
		if other.ID != player.ID {
			if other.X == newX && other.Y == newY {
				return false
			}
		}
	}

	// Otherwise free to move
	return true
}

func movePlayer(id, dir string) {
	mu.Lock()
	for i, p := range gamePlayers {
		if p.ID == id {

			pp := &gamePlayers[i]
			// Save old position BEFORE moving
			oldX := pp.X
			oldY := pp.Y

			print("1")

			// Move based on player's speed (1 or 2 steps)
			if time.Now().Before(pp.NextMoveTime) {
				mu.Unlock()
				return
			}
			print("2")
			pp.NextMoveTime = time.Now().Add(pp.MoveCooldown)

			var pickedPickup map[string]interface{} = nil

			newX, newY := pp.X, pp.Y
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
			if !canMove(*pp, newX, newY) {
				mu.Unlock()
				return
			}

			if newY < 0 || newY >= currentGrid.Rows ||
				newX < 0 || newX >= currentGrid.Cols {
				mu.Unlock()
				return
			}

			cell := &currentGrid.Cells[newY][newX]

			// Walkable
			if cell.Type != "sand" && cell.Type != "start-zone" {
				mu.Unlock()
				return
			}

			// Move the real player
			pp.X = newX
			pp.Y = newY

			for bi := range bombs {
				b := bombs[bi] // copy struct
				if b.OwnerID == pp.ID && b.Walkable {
					if oldX != b.X || oldY != b.Y {
						b.Walkable = false
						bombs[bi] = b // write back updated struct
					}
				}

				// Bomb belongs to player and currently walkable
				if b.OwnerID == pp.ID && b.Walkable {

					// Player moved off the bomb’s tile
					if oldX != b.X || oldY != b.Y {
						b.Walkable = false // ❄️ freeze it
					}
				}
			}
			// Pick up power-up if present (still inside lock)
			if cell.PowerUp != "" {
				powerType := cell.PowerUp
				cell.PowerUp = "" // remove it from the grid

				// Apply effect on the real player
				switch powerType {
				case "bomb":
					pp.BombCount++
					fmt.Printf("%s picked up bomb!\n", pp.Name)

				case "flame":
					pp.BombRange++
					fmt.Printf("%s picked up flame!\n", pp.Name)

				case "speed":
					pp.MoveCooldown = pp.MoveCooldown / 2

				}

				fmt.Printf("Player %s picked up power-up: %s\n", pp.Name, powerType)

				// prepare a pickup event to send after unlock (so we keep same unlock position)
				pickedPickup = map[string]interface{}{
					"type":     "powerup_picked",
					"playerID": pp.ID,
					"x":        pp.X,
					"y":        pp.Y,
					"powerup":  powerType,
				}
			}

			// keep your original unlock position
			mu.Unlock()

			// original movement broadcast (unchanged format)
			broadcast(map[string]interface{}{
				"type":      "player_moved",
				"id":        p.ID,
				"x":         gamePlayers[i].X,
				"y":         gamePlayers[i].Y,
				"name":      p.Name,
				"direction": dir,
				"lives":     gamePlayers[i].Lives,
				// "speed":     p.MoveCooldown / time.Millisecond,
			})

			// broadcast pickup if any (after unlock, same pattern you used elsewhere)
			if pickedPickup != nil {
				broadcast(pickedPickup)
			}

			break
		}
	}
}

func damagePlayer(id string, amount int) {

	for i, p := range gamePlayers {
		if p.ID == id {
			gamePlayers[i].Lives -= amount
			if gamePlayers[i].Lives < 0 {
				gamePlayers[i].Lives = 0
			}

			broadcast(map[string]interface{}{
				"type":  "player_damaged",
				"id":    p.ID,
				"lives": gamePlayers[i].Lives,
				"name":  p.Name,
			})

			if gamePlayers[i].Lives == 0 {
				broadcast(map[string]interface{}{
					"type": "player_dead",
					"id":   p.ID,
					"name": p.Name,
				})
			}
			break
		}
	}

	alivePlayers := []Player{}
	for _, p := range gamePlayers {
		if p.Lives > 0 {
			alivePlayers = append(alivePlayers, p)
		}
	}

	if len(alivePlayers) == 1 {
		winner := alivePlayers[0]
		broadcast(map[string]interface{}{
			"type": "game_winner",
			"id":   winner.ID,
			"name": winner.Name,
		})
	} else if len(alivePlayers) == 0 {
		broadcast(map[string]interface{}{
			"type": "game_draw",
			"text": "No one survived!",
		})
	}

}

func plant_bomb(playerID string, x int, y int) {
	mu.Lock()
	var p *Player
	for i := range gamePlayers {
		if gamePlayers[i].ID == playerID {

			p = &gamePlayers[i]
			break
		}
	}

	if p == nil {
		mu.Unlock()
		return
	}

	if p.BombCount <= 0 {
		mu.Unlock()
		return
	}

	// Update player position to the provided coordinates
	p.X = x
	p.Y = y

	bombID := fmt.Sprintf("b_%d", time.Now().UnixNano())
	bomb := Bomb{
		ID:       bombID,
		X:        p.X,
		Y:        p.Y,
		OwnerID:  p.ID,
		Range:    p.BombRange,
		Walkable: true,
		PlacedAt: time.Now(),
	}

	bombs[bomb.ID] = bomb
	p.BombCount--

	mu.Unlock()

	broadcast(map[string]interface{}{
		"type": "bomb_planted",
		"id":   bomb.ID,
		"x":    bomb.X,
		"y":    bomb.Y,
	})
	go bombCountdown(bombID)
}

func bombCountdown(bombID string) {
	time.Sleep(2 * time.Second)
	mu.Lock()

	bomb, exists := bombs[bombID]
	if !exists {
		mu.Unlock()
		return
	}
	delete(bombs, bombID)

	mu.Unlock()

	explodeBomb(bomb)
}

func explodeBomb(b Bomb) {
	explosionCells := [][]int{
		{b.X, b.Y},
	}

	dirs := [][]int{
		{1, 0},
		{-1, 0},
		{0, -1},
		{0, 1},
	}
	var playersToDamage []Player

	// 35% drop chance
	const powerupDropChance = 35

	// collect spawned powerups while under lock, broadcast after unlock
	var spawned []map[string]interface{}

	mu.Lock()
	for _, d := range dirs {
		dx, dy := d[0], d[1]
		for i := 1; i <= b.Range; i++ {
			nx := b.X + dx*i
			ny := b.Y + dy*i

			if ny < 0 || ny >= currentGrid.Rows || nx < 0 || nx >= currentGrid.Cols {
				break
			}

			cell := currentGrid.Cells[ny][nx].Type

			if cell == "inner-wall" || cell == "wall" {
				break
			}

			explosionCells = append(explosionCells, []int{nx, ny})

			if cell == "stone" {
				// Destroy the stone
				cellRef := &currentGrid.Cells[ny][nx]
				cellRef.Type = "sand"

				// CHANCE to drop a powerup
				if rand.Intn(100) < powerupDropChance {
					choices := []string{"bomb", "flame", "speed"}
					ch := choices[rand.Intn(len(choices))]

					cellRef.PowerUp = ch // put into grid

					// queue spawn event to frontend
					spawned = append(spawned, map[string]interface{}{
						"type":    "spawn_powerup",
						"x":       nx,
						"y":       ny,
						"powerup": ch,
					})
				}

				break
			}
		}
	}

	for i := range gamePlayers {
		p := &gamePlayers[i]
		for _, c := range explosionCells {
			if p.X == c[0] && p.Y == c[1] {
				playersToDamage = append(playersToDamage, *p)
				break
			}
		}
	}
	mu.Unlock()

	// Broadcast any spawned powerups (frontend will show them)
	for _, ev := range spawned {
		broadcast(ev)
	}

	// For each spawned powerup schedule backend expiration after 15 seconds
	// (do this AFTER unlocking to avoid sleeping while holding mu)
	for _, ev := range spawned {
		// capture local variables for goroutine
		x, _ := ev["x"].(int)
		y, _ := ev["y"].(int)
		power, _ := ev["powerup"].(string)

		go func(px, py int, pwr string) {
			time.Sleep(15 * time.Second)

			// Only clear if still the same powerup (not picked up or replaced)
			if px >= 0 && py >= 0 && py < currentGrid.Rows && px < currentGrid.Cols {
				if currentGrid.Cells[py][px].PowerUp == pwr {
					currentGrid.Cells[py][px].PowerUp = ""

					// Notify frontend that the powerup expired
					broadcast(map[string]interface{}{
						"type": "powerup_expired",
						"x":    px,
						"y":    py,
					})
				}
			}
		}(x, y, power)
	}

	for _, p := range playersToDamage {
		damagePlayer(p.ID, 1)
	}

	broadcast(map[string]interface{}{
		"type":     "bomb_exploded",
		"id":       b.ID,
		"cells":    explosionCells,
		"owner_id": b.OwnerID,
	})

	mu.Lock()
	for i := range gamePlayers {
		if gamePlayers[i].ID == b.OwnerID {
			gamePlayers[i].BombCount++
		}
	}
	delete(bombs, b.ID)
	mu.Unlock()
}

func generateSessionID() string {
	letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	b := make([]rune, 16)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
