export type MarkerType = 'alphanumeric' | 'unicode';

export interface RandomMarkingOptions {
  p?: number;
  minGap?: number;
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
  prompt: string;
}

export interface Base64MarkingResult {
  markedText: string;
  prompt: string;
}

export class DataMarkingViaSpotlighting {
  minK: number;
  maxK: number;
  defaultP: number;
  defaultMinGap: number;
  markerType: MarkerType;

  constructor(
    minK?: number,
    maxK?: number,
    defaultP?: number,
    defaultMinGap?: number,
    markerType?: MarkerType
  );

  genDataMarkerUniCode(): string;
  genDataMarkerAlphaNum(): string;
  genDataMarker(markerType?: MarkerType): string;
  markData(text: string, options?: MarkingOptions): MarkingResult;
  randomlyMarkData(text: string, options?: RandomMarkingOptions): MarkingResult;
  base64EncodeData(text: string): Base64MarkingResult;
}
