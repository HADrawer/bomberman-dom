import { socket } from "../ws.js";
import { VNode, App } from "../Framework/over-react.js";

let app = null;


document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");

  function showLobbyScreen() {
    const container = new VNode("div", {
      attrs: { class: "container", id: "lobby-container" }
    });

    const title = new VNode("h1", {
      attrs: { class: "bomberman" },
      children: ["Bomberman"]
    });

    const arrow = new VNode("span", {
      attrs: { class: "arrow" },
      children: [">"]
    });

    const startBtn = new VNode("div", {
      attrs: { id: "lobbyStartBtn", class: "start-text" },
      children: [arrow, " Start"]
    });

    container.append(title, startBtn);

    app = new App(container, appContainer, {});

    const startBtnVNode = app.getVNodeById("lobbyStartBtn");
    startBtnVNode.listenEvent("onclick", showNameScreen);
  }

  function showNameScreen() {
    const container = new VNode("div", {
      attrs: { class: "container", id: "name-container" }
    });

    const headingText = new VNode("h1", {
      attrs: { class: "heading-text" },
      children: ["Enter Your Name:"]
    });

    const nameInput = new VNode("input", {
      attrs: {
        type: "text",
        id: "playerName",
        placeholder: "Your name here"
      }
    });

    const br1 = new VNode("br", { attrs: {} });
    const br2 = new VNode("br", { attrs: {} });

    const h2 = new VNode("h2", {
      attrs: {},
      children: ["Select Your Character:"]
    });

    const charBox1 = new VNode("div", {
      attrs: { class: "char-box", "data-skin": "character1", id: "char1" }
    });

    const charBox2 = new VNode("div", {
      attrs: { class: "char-box", "data-skin": "character2", id: "char2" }
    });

    const charBox3 = new VNode("div", {
      attrs: { class: "char-box", "data-skin": "character3", id: "char3" }
    });

    const charBox4 = new VNode("div", {
      attrs: { class: "char-box", "data-skin": "character4", id: "char4" }
    });

    const characterSelect = new VNode("div", {
      attrs: { class: "character-select", id: "character-select" }
    });
    characterSelect.append(charBox1, charBox2, charBox3, charBox4);

    const br3 = new VNode("br", { attrs: {} });
    const br4 = new VNode("br", { attrs: {} });

    const arrow = new VNode("span", {
      attrs: { class: "arrow" },
      children: [">"]
    });

    const joinBtn = new VNode("div", {
      attrs: { id: "startBtn", class: "start-text" },
      children: [arrow, " Join"]
    });

    container.append(headingText, nameInput, br1, br2, h2, characterSelect, br3, br4, joinBtn);

    app = new App(container, app.$app, {
      playerName: '',
      selectedSkin: null
    });

    const charBoxes = ["char1", "char2", "char3", "char4"];
    charBoxes.forEach((boxId) => {
      const box = app.getVNodeById(boxId);
      box.listenEvent("onclick", () => {
        charBoxes.forEach((id) => {
          const b = app.getVNodeById(id);
          b.removeClass("selected");
        });
        box.addClass("selected");

        app.state.selectedSkin = box.attrs["data-skin"];
        app.update();
      });
    });

    // Update state when input changes
    const nameInputVNode = app.getVNodeById("playerName");
    nameInputVNode.listenEvent("oninput", (e) => {
      app.state.playerName = e.target.value;
    });

    function submitName() {
      const name = app.state.playerName.trim();
      const selectedSkin = app.state.selectedSkin;

      if (!name) return alert("Name is required!");
      if (!selectedSkin) return alert("Please select a character!");

      localStorage.setItem("playerName", name);
      localStorage.setItem("playerSkin", selectedSkin);

      socket.send(JSON.stringify({ type: "set_name", name, skin: selectedSkin }));
      loadWaitingRoom();
    }

    const startBtnVNode = app.getVNodeById("startBtn");
    startBtnVNode.listenEvent("onclick", submitName);

    nameInputVNode.listenEvent("onkeydown", (e) => {
      if (e.key === "Enter") submitName();
    });
  }

  function loadWaitingRoom() {
    import("./waiting.js").then((module) => {
      module.showWaitingRoom(app.$app);
    });
  }

  showLobbyScreen();
});
