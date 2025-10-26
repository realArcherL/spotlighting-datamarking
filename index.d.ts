export type MarkerType = 'alphanumeric' | 'unicode';

export interface RandomMarkingOptions {
  p?: number;
  minGap?: number;
  encoding?: string;
  sandwich?: boolean;
  markerType?: MarkerType;
}

export interface MarkingOptions {
  sandwich?: boolean;
  markerType?: MarkerType;
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
  markerType: MarkerType;

  constructor(
    minK?: number,
    maxK?: number,
    defaultP?: number,
    defaultMinGap?: number,
    defaultEncoding?: string,
    markerType?: MarkerType
  );

  genDataMarkerUniCode(): string;
  genDataMarkerAlphaNum(): string;
  genDataMarker(markerType?: MarkerType): string;
  markData(text: string, options?: MarkingOptions): MarkingResult;
  randomlyMarkData(text: string, options?: RandomMarkingOptions): MarkingResult;
}
