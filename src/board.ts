import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  knownCells: Map<string, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const cache = new Geocache(cell);
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      cache.generateCoinsForCell(cell);
      this.knownCells.set(key, cache.cacheToString());
    }
    return cache.cell;
  }

  updateKnownCells(board: string[][]) {
    board.forEach((cache) => {
      this.knownCells.set(cache[0], cache[1]);
    });
  }

  getCacheForPoint(cell: Cell): Geocache {
    const { i, j } = cell;
    const key = [i, j].toString();
    return new Geocache(cell).stringToCache(this.knownCells.get(key)!);
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Number(point.lat.toFixed(4)),
      j: Number(point.lng.toFixed(4)),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds(
      [cell.i, cell.j],
      [cell.i + this.tileWidth, cell.j + this.tileWidth]
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const originCell = this.getCellForPoint(point);
    const resultCells: Cell[] = [
      { i: originCell.i + 1, j: originCell.j },
      { i: originCell.i, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j },
      { i: originCell.i, j: originCell.j - 1 },
      { i: originCell.i + 1, j: originCell.j + 1 },
      { i: originCell.i + 1, j: originCell.j - 1 },
      { i: originCell.i - 1, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j - 1 },
    ];
    return resultCells;
  }
}

export class Coin {
  cell: Cell;
  id: string;

  constructor(cell: Cell, smallId: number) {
    this.cell = cell;
    this.id = [this.cell.i, this.cell.j, smallId].toString();
  }
  toString(): string {
    return this.id;
  }
}

export class Geocache {
  cell: Cell;
  currentCoins: Coin[] = [];
  constructor(cell: Cell) {
    this.cell = cell;
  }

  addCoin(coin: Coin) {
    this.currentCoins.push(coin);
  }
  removeCoin(coin: Coin) {
    this.currentCoins.forEach((item, index) => {
      if (item === coin) {
        this.currentCoins.splice(index, 1);
      }
    });
  }

  generateCoinsForCell(cell: Cell) {
    const { i, j } = cell;
    const value = Math.floor(luck([i, j, "initialValue"].toString()) * 5);
    for (let x = 0; x <= value; x++) {
      const coin = new Coin(cell, x);
      this.addCoin(coin);
    }
  }

  cacheToString(): string {
    return JSON.stringify(this);
  }

  stringToCache(cacheData: string): Geocache {
    const cache = JSON.parse(cacheData) as Geocache;
    this.cell = cache.cell;
    this.currentCoins = cache.currentCoins;
    return this;
  }
}
