export const socket = new WebSocket("ws://localhost:8080/ws");
export const WS_URL = "ws://localhost:8080/ws";
socket.onopen = () => {
  console.log("WebSocket connection established");
};

socket.onclose = () => {
  console.log("WebSocket connection closed");
};      