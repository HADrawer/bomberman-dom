<div align="center">
  <h1>🔥 Bomberman DOM – Multiplayer Browser Game</h1>
  <br /><br />
</div>

## 📌 Overview
**Bomberman DOM** is a real-time, multiplayer browser game inspired by the classic Bomberman.  
It is built **entirely using DOM manipulation** and the **mini-framework** created in the *mini-framework* project.

No Canvas.  
No WebGL.  
No third-party engines.  
Just **HTML, CSS, JavaScript, DOM, and WebSockets**.

Up to **4 players** can join a lobby and battle until **only one remains alive**.

---

## 🎯 Objectives
This project covers:

- Real-time multiplayer logic  
- DOM-based game rendering  
- A lobby system with player counter  
- WebSocket communication  
- Bombs, explosions, destructible blocks  
- Random power-ups  
- Smooth animations at **60 FPS**  
- Game performance optimization  

---

## 🧩 Features

### 🧑‍🤝‍🧑 Players
- Supports **2 to 4** players per room  
- Each player has **3 lives**  
- Starting positions: **4 corners** of the map  
- Smooth, optimized DOM movement  

---

### 🗺️ Map
- Fully visible static map  
- **Indestructible walls** (always in same positions)  
- **Randomly generated destructible blocks**  
- Safe starting area around each player  
- DOM elements represent every tile  

---

### 💣 Bomb Mechanics
- Players can place bombs  
- Bombs explode in **four directions**  
- Explosion range depends on **Flame power-up**  
- Explosion destroys **blocks**, hurts players, triggers power-ups  
- Bomb limit depends on **Bomb power-up**

---

## ⭐ Power-Ups
After destroying a block, one of these may randomly appear:

- **Bomb Up** → increases number of bombs a player can drop  
- **Flame Up** → increases explosion radius  
- **Speed Up** → increases movement speed  

---

## 💬 Multiplayer Chat
Before the game starts, players can communicate through a **WebSocket chat**.

This chat acts as the "Hello World" of real-time multiplayer:
- Displays all players joining  
- Shows player messages  
- Syncs across all clients  

---

## ⏳ Lobby System
When users join:

### ✔ If players ≥ 2 and < 4  
A **20-second window** opens.

If not filled by 4 players in time →  
A **10-second final countdown** starts.

### ✔ If players reach 4 early  
Start the **10-second countdown immediately**.

After the 10-second countdown →  
➡️ Game begins automatically.

---

## 🕹️ Gameplay Rules
- Movement must be at **60 FPS**, no frame drops  
- Must use `requestAnimationFrame`  
- No Canvas or WebGL allowed  
- Entire rendering is DOM-based  
- Must measure performance to ensure smooth gameplay

---

## 🛠️ Technologies Used
- **JavaScript (ES Modules)**  
- **DOM manipulation**  
- **Your custom mini-framework**  
- **WebSockets** (for multiplayer & chat)  
- **HTML + CSS**  
- **Performance APIs**  
- **requestAnimationFrame**  

---

## 🎁 Bonus Features (Optional)
These features can be added to earn extra credit:

- 🤖 **AI enemies** (Solo / Co-Op)  
- 🟥 **More power-ups**  
- 🧱 Block Pass  
- 💣 Bomb Pass  
- 🎯 Detonator (manual explosion)  
- ❤️ 1-Up (extra life)  
- 💀 Drop power-ups when dying  
- 👻 Ghost mode after death (touch a player to revive)  
- 👥 2v2 Team Mode  

---

## 📁 Project Structure 

BOMBERMAN-DOM-2
│
├── backend
│   ├── handlers
│   │   ├── server.go
│   │   └── struct.go
│   ├── websocket
│   ├── go.mod
│   ├── go.sum
│   └── main.go
│
└── Frontend
    ├── static
    │   ├── assets
    │   ├── chat
    │   ├── css
    │   ├── Framework
    │   └── js
    │       ├── app.js
    │       ├── framework.js
    │       ├── game.js
    │       ├── main.js
    │       ├── waiting.js
    │       └── ws.js
    └── index.html




---

## 👥 Group Members

| Name | Username |
|------|--------------|
| Hashem Ahmed | `hasahmed` |
| Faisal Almarzouqi | `falmarzo` |
| Shaikha Zaid | `shzaid` |
| hamed abdulrahman | `habdulrah` |
---
