import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Coin, Geocache, Board } from "./board";
import { LatLngExpression } from "leaflet";
// eslint-disable-next-line @typescript-eslint/naming-convention
import L from "leaflet";

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
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.05;

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const cacheHolder: leaflet.Layer[] = [];
let playerCoins: Coin[] = [];
let lines: LatLngExpression[] = [];

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_MIN_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_MAX_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    {
      //.tileLayer(
      //"http://bloximages.newyork1.vip.townnews.com/greensboro.com/content/tncms/assets/v3/editorial/9/89/989b5e12-29a5-11e5-b33b-dbdeb97834b8/55a42ca3238ba.image.jpg?resize=940%2C813",
      //{
      maxZoom: 19,
      attribution:
        // eslint-disable-next-line @typescript-eslint/quotes
        '&copy; <a href="https://server.arcgisonline.com/arcgis/rest/services</a>',
    }
  )
  .addTo(map);

const monkeyIcon = L.icon({
  // eslint-disable-next-line @typescript-eslint/quotes
  iconUrl:
    "http://bloximages.newyork1.vip.townnews.com/greensboro.com/content/tncms/assets/v3/editorial/9/89/989b5e12-29a5-11e5-b33b-dbdeb97834b8/55a42ca3238ba.image.jpg?resize=940%2C813",
  iconSize: [40, 40],
});

const playerMarker = leaflet.marker(MERRILL_CLASSROOM, {
  icon: monkeyIcon,
});

if (localStorage.getItem("marker")) {
  playerMarker.setLatLng(
    JSON.parse(localStorage.getItem("marker")!) as leaflet.LatLng
  );
}

if (localStorage.getItem("inventory")) {
  playerCoins = JSON.parse(localStorage.getItem("inventory")!) as Coin[];
}

if (localStorage.getItem("line")) {
  lines = JSON.parse(localStorage.getItem("line")!) as LatLngExpression[];
}

if (localStorage.getItem("visited")) {
  board.updateKnownCells(
    JSON.parse(localStorage.getItem("visited")!) as string[][]
  );
}

const lat = playerMarker.getLatLng().lat;
const lng = playerMarker.getLatLng().lng;

moveTo(lat, lng);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

function moveMap(playerPos: leaflet.LatLng) {
  map.setView(playerPos);
  cacheHolder.forEach((cache) => {
    cache.remove();
  });
  localStorage.setItem(
    "marker",
    JSON.stringify({
      lat: playerMarker.getLatLng().lat,
      lng: playerMarker.getLatLng().lng,
    })
  );
  lines.push({ lat: playerPos.lat, lng: playerPos.lng });
  localStorage.setItem("line", JSON.stringify(lines));
  L.polyline(lines, { color: "purple" }).addTo(map);
  getCaches(playerPos);
}

moveMap(playerMarker.getLatLng());

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.getLatLng().lat = position.coords.latitude;
    playerMarker.getLatLng().lng = position.coords.longitude;
    moveMap(playerMarker.getLatLng());
  });
  lines = [];
});

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => {
  playerMarker.getLatLng().lat += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMap(playerMarker.getLatLng());
});

const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => {
  playerMarker.getLatLng().lat -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMap(playerMarker.getLatLng());
});

const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => {
  playerMarker.getLatLng().lng += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMap(playerMarker.getLatLng());
});

const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => {
  playerMarker.getLatLng().lng -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
  moveMap(playerMarker.getLatLng());
});

const resetButton = document.querySelector("#reset")!;
resetButton.addEventListener("click", () => {
  const resetPrompt = confirm("Are you sure you want to reset your data?");
  if (resetPrompt) {
    localStorage.clear();
    location.reload();
  }
});

function makeCache(i: number, j: number) {
  const cell = board.getCellForPoint(
    leaflet.latLng({
      lat: i,
      lng: j,
    })
  );

  const cache = leaflet.rectangle(board.getCellBounds(cell)) as leaflet.Layer;

  cache.bindPopup(() => {
    const container = document.createElement("div");

    addCoinsFromCache(board.getCacheForPoint(cell), container);

    addCoinsFromInventory(board.getCacheForPoint(cell), container);
    return container;
  });
  cache.addTo(map);
  cacheHolder.push(cache);
}

function getCaches(point: leaflet.LatLng) {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      const x = point.lat + i * TILE_DEGREES;
      const y = point.lng + j * TILE_DEGREES;
      const cell = board.getCellForPoint(leaflet.latLng({ lat: x, lng: y }));
      if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
        makeCache(cell.i, cell.j);
      }
    }
  }
}
getCaches(playerMarker.getLatLng());

function addCoinsFromCache(geocache: Geocache, container: HTMLElement) {
  geocache.currentCoins.forEach((coin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.innerHTML = `
            <div>Cache Coin: <span id="coin">${coin.id}</span></div>`;

    const currHiddenCoin = document.createElement("button") as HTMLElement;
    currHiddenCoin.hidden = true;
    container.append(currHiddenCoin);
    currHiddenCoin.innerHTML = `
            <div>Player Coin: <span id="coin">${coin.id}</span></div>`;
    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currHiddenCoin.hidden = false;
      geocache.removeCoin(coin);
      playerCoins.push(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), board);
    });

    currHiddenCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currHiddenCoin.hidden = true;
      geocache.addCoin(coin);
      removeFromInventory(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), board);
    });
  });
}

function addCoinsFromInventory(geocache: Geocache, container: HTMLElement) {
  playerCoins.forEach((coin) => {
    const currCoin = document.createElement("button") as HTMLElement;
    container.append(currCoin);
    currCoin.innerHTML = `
            <div>Player Coin: <span id="coin">${coin.id}</span></div>`;
    const currHiddenCoin = document.createElement("button") as HTMLElement;
    currHiddenCoin.hidden = true;
    container.append(currHiddenCoin);
    currHiddenCoin.innerHTML = `
            <div>Cache Coin: <span id="coin">${coin.id}</span></div>`;

    currCoin.addEventListener("click", () => {
      currCoin.hidden = true;
      currHiddenCoin.hidden = false;
      geocache.addCoin(coin);
      removeFromInventory(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), board);
    });

    currHiddenCoin.addEventListener("click", () => {
      currCoin.hidden = false;
      currHiddenCoin.hidden = true;
      geocache.removeCoin(coin);
      playerCoins.push(coin);
      updateCacheAtPoint(geocache.cell, geocache.cacheToString(), board);
    });
  });
}

function removeFromInventory(coin: Coin) {
  playerCoins.forEach((item, index) => {
    if (item === coin) {
      playerCoins.splice(index, 1);
    }
  });
}

function updateCacheAtPoint(cell: Cell, data: string, board: Board) {
  const { i, j } = cell;
  const key = [i, j].toString();
  board.knownCells.set(key, data);

  const jsonMap = JSON.stringify(Array.from(board.knownCells.entries()));
  localStorage.setItem("visited", jsonMap);

  localStorage.setItem("inventory", JSON.stringify(playerCoins));
}
