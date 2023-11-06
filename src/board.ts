import leaflet from "leaflet";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i: i, j: j });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: point.lat,
      j: point.lng,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i, cell.j],
      [cell.i + this.tileWidth, cell.j + this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const originCell = this.getCellForPoint(point);
    const resultCells: Cell[] = [
      { i: originCell.i + 1, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j - 1 },
      { i: originCell.i + 1, j: originCell.j },
      { i: originCell.i, j: originCell.j + 1 },
      { i: originCell.i - 1, j: originCell.j },
      { i: originCell.i, j: originCell.j - 1 },
      { i: originCell.i + 1, j: originCell.j - 1 },
      { i: originCell.i - 1, j: originCell.j + 1 },
    ];
    return resultCells;
  }
}
