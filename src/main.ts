import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 1e-2;
const PIT_SPAWN_PROBABILITY = 0.1;

let spawnCheck = false;

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerPos = leaflet.latLng(MERRILL_CLASSROOM);
const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
moveMap();
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

function moveMap() {
  spawnPit(playerPos.clone());
  map.setView(playerMarker.getLatLng());
}

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  spawnCheck = true;
  navigator.geolocation.watchPosition((position) => {
    playerPos.lat = position.coords.latitude;
    playerPos.lng = position.coords.longitude;
    if (spawnCheck) {
      moveMap();
      spawnCheck = false;
    }
  });
});

let points = 0;
const coins: string[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(i: number, j: number) {
  const bounds = board.getCellBounds({ i: i, j: j });
  const cashCoins: string[] = [];
  let value = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
  for (let k = 0; k < value; k++) {
    cashCoins.push(`${i}${j}#${k}`);
  }

  const pit = leaflet.rectangle(bounds);

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>`;

    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

    function coinCheck(check: boolean) {
      if (check && value > 0) {
        value--;
        points++;
        const popped = cashCoins.pop()!;
        statusPanel.innerHTML = `Got coin: ${popped}`;
        coins.push(popped);
      }
      if (!check && points > 0) {
        value++;
        points--;
        const deposit1 = coins.pop()!;
        statusPanel.innerHTML = `Dropped off coin: ${deposit1}`;
        cashCoins.push(deposit1);
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
    }
    poke.addEventListener("click", () => coinCheck(true));
    deposit.addEventListener("click", () => coinCheck(false));
    return container;
  });
  pit.addTo(map);
}

function spawnPit(pos: leaflet.LatLng) {
  for (
    let i = pos.lat - NEIGHBORHOOD_SIZE;
    i < pos.lat + NEIGHBORHOOD_SIZE;
    i += TILE_DEGREES
  ) {
    for (
      let j = pos.lng - NEIGHBORHOOD_SIZE;
      j < pos.lng + NEIGHBORHOOD_SIZE;
      j += TILE_DEGREES
    ) {
      const l = luck([i, j].toString());
      if (l < PIT_SPAWN_PROBABILITY) {
        makePit(i, j);
      }
    }
  }
}
