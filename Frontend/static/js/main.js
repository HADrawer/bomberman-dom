// import { socket } from "../ws.js";

// socket.addEventListener("open", () => {
//   const session = localStorage.getItem("sessionId");

//   if (session) {
//     socket.send(JSON.stringify({
//       type: "reconnect",
//       session: session
//     }));
//   }
// });

// socket.addEventListener("message", (event) => {
//   const msg = JSON.parse(event.data);

//   if (msg.type === "reconnect_status") {

//     if (msg.state === "waiting_room") {
//       import("./waiting.js").then(m => m.showWaitingRoom());
//     }

//     else if (msg.state === "in_game") {
//       import("./game.js").then(m => {
//         m.startGame(msg.grid, msg.players);
//       });
//     }

//     // else if (msg.state === "dead") {
//     //   import("./screens/dead.js").then(m => m.showDeadScreen());
//     // }

//     else if (msg.state === "not_found") {
//       import("./app.js").then((module) => {
//       module.showLobbyScreen();
//     });
//     }
//   }
// });
