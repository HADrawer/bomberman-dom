export function setupRoutes(app) {
  const routes = {
    "": () => {
      // default (landing page, could be intro screen)
      app.state.messages = [
        { author: "System", text: "Welcome! Use #/gamestart to enter chat." }
      ];
      app.update();
    },
    gamestart: () => {
      // game start = show chat UI
      app.state.messages = [
        { author: "System", text: "Game has started. Chat below!" }
      ];
      app.update();
    }
  };

  app.setRoutes(routes);
}
