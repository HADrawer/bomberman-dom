import { buildApp } from "./app.js";
import { setupRoutes } from "./routes.js";

window.addEventListener("DOMContentLoaded", () => {
  const app = buildApp();
  setupRoutes(app);
});
