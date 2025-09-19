export const socket = new WebSocket("ws://localhost:8080/ws");
export const WS_URL = "ws://localhost:8080/ws";


socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established');
});

socket.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});

socket.addEventListener('close', (event) => {
  console.log('WebSocket connection closed');
});