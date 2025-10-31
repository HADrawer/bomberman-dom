export const socket = new WebSocket("ws://localhost:8080/ws")

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
