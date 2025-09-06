package handlers

import (
	game "bomberman/models"
	"context"
	"sync"

	"github.com/gorilla/websocket"
)

type Server struct {
	gameMu sync.Mutex
	Game   game.GameState

	connsMu sync.RWMutex
	Conns   map[int]*websocket.Conn

	keyEventChannel chan game.Movement
	ControlChan     chan string
	CancelFunc      context.CancelFunc

	gameStateChannel    chan game.GameState
	mapUpdateChannel    chan []game.BlockUpdate
	playerUpdateChannel chan []game.Player
	playerCountChannel  chan game.Player
	playerLeaveChannel  chan game.Player
}

func New() *Server {
	return &Server{}
}
