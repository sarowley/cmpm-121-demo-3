import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius / this.tileWidth;
    this.knownCells = new Map();
  }

  getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i: i, j: j });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    //   const originCell = this.getCellForPoint(point);
    //   const resultCells: Cell[] = [
    //     { i: originCell.i + 1, j: originCell.j + 1 },
    //     { i: originCell.i - 1, j: originCell.j - 1 },
    //     { i: originCell.i + 1, j: originCell.j },
    //     { i: originCell.i, j: originCell.j + 1 },
    //     { i: originCell.i - 1, j: originCell.j },
    //     { i: originCell.i, j: originCell.j - 1 },
    //     { i: originCell.i + 1, j: originCell.j - 1 },
    //     { i: originCell.i - 1, j: originCell.j + 1 },
    //   ];
    //   return resultCells;
    // }

    const originCell = this.getCellForPoint(point);
    const resultCells: Cell[] = [];
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(
          this.getCanonicalCell({ i: originCell.i + i, j: originCell.j + j })
        );
      }
    }

    return resultCells;
  }
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Coin {
  cell: Cell;
  id: number;

  constructor(cell: Cell, id: number) {
    this.cell = cell;
    this.id = id;
  }
  toString(): string {
    return `${this.cell.i};${this.cell.j};${this.id}`;
  }
}

export class Geocache implements Momento<string> {
  cell: Cell;
  private board: Board;
  private currentCoins: Coin[];
  constructor(cell: Cell, board: Board, coinArray?: Coin[]) {
    this.cell = cell;
    this.board = board;
    if (coinArray != undefined) {
      this.currentCoins = coinArray;
      return this;
    }
    this.currentCoins = [];
    const numCoins = Math.floor(
      luck([cell.i, cell.j, "initalnumCoins"].toString()) * 5
    );
    for (let k = 0; k < numCoins; k++) {
      this.addCoin(new Coin(cell, k));
    }
  }
  addCoin(coin: Coin) {
    this.currentCoins.push(coin);
  }
  removeCoin(coinName: string): Coin | undefined {
    const removedCoin = this.currentCoins.find((coin) => {
      return coin.toString() == coinName;
    });
    if (removedCoin != undefined) {
      this.currentCoins = this.currentCoins.filter(
        (coin) => coin != removedCoin
      );
    }
    return removedCoin;
  }
  getNumCoins(): number {
    return this.currentCoins.length;
  }
  getCoinNames(): string[] {
    return this.currentCoins.map((coin) => coin.toString());
  }

  fromJSON(json: string): Geocache {
    const data = JSON.parse(json) as Geocache;
    const geocache = new Geocache(
      this.board.getCanonicalCell({
        i: data.cell.i,
        j: data.cell.j,
      }),
      this.board,
      data.currentCoins
    );
    const currentCoins: Coin[] = [];
    geocache.currentCoins.forEach((_coin, index) =>
      currentCoins.push(new Coin(geocache.cell, index))
    );
    geocache.currentCoins = currentCoins;
    return geocache;
  }

  toMomento(): string {
    return JSON.stringify(this);
  }
  fromMomento(momento: string) {
    const recoveredGeocache = this.fromJSON(momento);
    this.cell = recoveredGeocache.cell;
    this.currentCoins = recoveredGeocache.currentCoins;
  }
}
