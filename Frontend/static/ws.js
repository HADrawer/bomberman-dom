const protocol = location.protocol === "https:" ? "ws" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}/ws`);

// export const socket = new WebSocket("ws://10.1.201.24:8080/ws")

export { socket };

socket.addEventListener("open", (event) => {
  console.log("WebSocket connection established")
})

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data)
  document.dispatchEvent(new CustomEvent("ws_message", { detail: msg }))
})

socket.addEventListener("error", (event) => {
  console.error("WebSocket error:", event)
})

socket.addEventListener("close", (event) => {
  console.log("WebSocket connection closed")
})
