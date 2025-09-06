package game

type GameState struct {
	Type        string `json:"type,omitempty"`
	Playing     bool
	Map         [][]string              `json:"map,omitempty"`
	BlockUpdate []BlockUpdate           `json:"block_updates,omitempty"`
	Players     []Player                `json:"players,omitempty"`
	KeysPressed map[int]map[string]bool `json:"-"`
	Alive       int                     `json:"-"`
	PlayerCount int                     `json:"player_count,omitempty"`
	CountDown   int                     `json:"countdown"`
}

type BlockUpdate struct {
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Block string `json:"block"`
}
