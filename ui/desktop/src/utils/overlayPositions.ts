import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface OverlayPosition {
  x: number;
  y: number;
}

export type OverlayPositions = Record<number, OverlayPosition>;

const POSITIONS_FILE = path.join(app.getPath('userData'), 'overlay-positions.json');

export function loadOverlayPositions(): Map<number, OverlayPosition> {
  try {
    if (fs.existsSync(POSITIONS_FILE)) {
      const data = fs.readFileSync(POSITIONS_FILE, 'utf8');
      const positions: OverlayPositions = JSON.parse(data);
      return new Map(Object.entries(positions).map(([k, v]) => [parseInt(k), v]));
    }
  } catch (error) {
    console.error('Error loading overlay positions:', error);
  }
  return new Map();
}

export function saveOverlayPositions(positions: Map<number, OverlayPosition>): void {
  try {
    const obj: OverlayPositions = {};
    positions.forEach((value, key) => {
      obj[key] = value;
    });
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error('Error saving overlay positions:', error);
  }
}
