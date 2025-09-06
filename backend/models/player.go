package game

import (
	"time"
)

type Movement struct {
	Type string `json:"type"`

	PlayerID int      `json:"-"`
	Keys     []string `json:"keys"`
}

type Player struct {
	Name      string `json:"name"`
	ID        int    `json:"id,omitempty"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Direction string `json:"direction,omitempty"`

	LastMoveTime   time.Time `json:"-"`
	Speed          int       `json:"-"`
	AvailableBombs int       `json:"bombs,omitempty"`
	FireDistance   int       `json:"-"`
	Lives          int       `json:"lives"`
	Damaged        bool      `json:"damaged"`
	// PowerUps       []PowerUp
}