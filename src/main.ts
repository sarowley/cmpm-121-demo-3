import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Coin, Geocache, Board } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const GAMEPLAY_MAX_ZOOM_LEVEL = 19;
const GAMEPLAY_MIN_ZOOM_LEVEL = 0;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 1e-3;
const CACHE_SPAWN_PROBABILITY = 0.05;

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
let cacheHolder: leaflet.Rectangle[] = [];
const playerCoins: Coin[] = [];
const momentos = new Map<Cell, string>();

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_MIN_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_MAX_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    //.tileLayer(
    //"http://bloximages.newyork1.vip.townnews.com/greensboro.com/content/tncms/assets/v3/editorial/9/89/989b5e12-29a5-11e5-b33b-dbdeb97834b8/55a42ca3238ba.image.jpg?resize=940%2C813",
    //{
    maxZoom: 19,
    attribution:
      // eslint-disable-next-line @typescript-eslint/quotes
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

let playerMarker = leaflet.marker(MERRILL_CLASSROOM);

if (localStorage.getItem("marker")) {
  playerMarker.setLatLng(
    JSON.parse(localStorage.getItem("marker")!) as leaflet.LatLng
  );
} else {
  playerMarker = leaflet.marker(MERRILL_CLASSROOM);
}

moveMap();
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

function moveMap() {
  cacheHolder.forEach((cache) => cache.remove());
  cacheHolder = [];
  spawnCache(playerMarker.getLatLng().clone());
  map.setView(playerMarker.getLatLng());
  storeLocation();
  playerMarker.addTo(map);
}

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.getLatLng().lat = position.coords.latitude;
    playerMarker.getLatLng().lng = position.coords.longitude;
    moveMap();
  });
});

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => {
  moveMap();
  playerMarker.getLatLng().lat += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => {
  moveMap();
  playerMarker.getLatLng().lat -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => {
  moveMap();
  playerMarker.getLatLng().lng += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => {
  moveMap();
  playerMarker.getLatLng().lng -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", () => {
  const resetPrompt = confirm("Reset all data?");
  if (resetPrompt) {
    localStorage.clear();
    location.reload();
  }
});

const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makeCache(cell: Cell) {
  const mainCache: Geocache = new Geocache(cell, board);

  if (momentos.has(cell)) {
    mainCache.fromMomento(momentos.get(cell)!);
  }

  const cache = leaflet.rectangle(board.getCellBounds(cell));
  cacheHolder.push(cache);

  cache.bindPopup(() => {
    const container = document.createElement("div");
    container.id = "container";

    const title = document.createElement("span");
    title.id = "title";
    title.innerHTML = `Cache: <span id="cellCoords">${cell.i}, ${
      cell.j
    }</span> contains <span id="numCoins">${mainCache.getNumCoins()} coins</span>`;

    const depositButton = document.createElement("button");
    depositButton.id = "deposit-button";
    depositButton.innerText = "Deposit";
    const buttons = document.createElement("div");
    buttons.id = "button-container";

    function updateUI() {
      container.querySelector<HTMLSpanElement>(
        "#numCoins"
      )!.innerText = `${mainCache.getNumCoins().toString()} coins`;
      statusPanel.innerText = `${playerCoins.length} points accumulated`;
      momentos.set(cell, mainCache.toMomento());
    }

    function createButton(coinName: string) {
      const button = document.createElement("button");
      button.innerText = coinName;
      button.addEventListener("click", () => {
        const popped = mainCache.removeCoin(coinName);
        if (popped !== undefined) {
          playerCoins.push(popped);
          statusPanel.innerText = `got coin: ${popped.toString()}`;
          button.hidden = true;
          updateUI();
        }
      });
      return button;
    }

    mainCache.getCoinNames().forEach((coinName) => {
      const button = createButton(coinName);
      buttons.append(button);
    });

    depositButton.addEventListener("click", () => {
      const popped = playerCoins.pop();
      if (popped !== undefined) {
        mainCache.addCoin(popped);
        statusPanel.innerText = `deposited coin: ${popped.toString()}`;
        const button = createButton(popped.toString());
        buttons.append(button);
      }
      updateUI();
    });

    container.append(title, depositButton, buttons);
    return container;
  });

  cache.addTo(map);
}

function spawnCache(pos: leaflet.LatLng) {
  const nearbyCells = board.getCellsNearPoint(pos);
  nearbyCells.forEach((cell) => {
    if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      makeCache(cell);
    }
  });
}

function storeLocation() {
  localStorage.setItem(
    "marker",
    JSON.stringify({
      lat: playerMarker.getLatLng().lat,
      lng: playerMarker.getLatLng().lng,
    })
  );
}
