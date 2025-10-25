export interface RandomMarkingOptions {
  p?: number;
  minGap?: number;
  encoding?: string;
  sandwich?: boolean;
}

export interface MarkingOptions {
  sandwich?: boolean;
}

export interface MarkingResult {
  markedText: string;
  dataMarker: string;
}

export class DataMarkingViaSpotlighting {
  minK: number;
  maxK: number;
  defaultP: number;
  defaultMinGap: number;
  encoding: string;

  constructor(
    minK?: number,
    maxK?: number,
    defaultP?: number,
    defaultMinGap?: number,
    defaultEncoding?: string
  );

  genDataMarker(): string;
  markData(text: string, options?: MarkingOptions): MarkingResult;
  randomlyMarkData(text: string, options?: RandomMarkingOptions): MarkingResult;
}
