import { randomInt } from 'node:crypto';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';

class DataMarkingViaSpotlighting {
  /**
   * @param {number} minK - Minimum marker length (default: 7)
   * @param {number} maxK - Maximum marker length (default: 12)
   * @param {number} defaultP - Default probability of marker insertion (default: 0.2)
   * @param {number} defaultMinGap - Default minimum gap between markers (default: 1)
   * @param {string} markerType - Type of marker to generate (default: 'alphanumeric')
   *                             Options: 'alphanumeric' (readable), 'unicode' (invisible PUA characters)
   */
  constructor(
    minK = 7,
    maxK = 12,
    defaultP = 0.2,
    defaultMinGap = 1,
    markerType = 'alphanumeric'
  ) {
    this.minK = minK;
    this.maxK = maxK;
    this.defaultP = defaultP;
    this.defaultMinGap = defaultMinGap;
    this.markerType = markerType;
  }

  genDataMarkerUniCode() {
    const PUA_START = 0xe000,
      PUA_END = 0xf8ff,
      N = PUA_END - PUA_START + 1;
    const k = this.minK + randomInt(this.maxK - this.minK + 1);
    let s = '';
    for (let i = 0; i < k; i++) {
      const idx = randomInt(N);
      s += String.fromCodePoint(PUA_START + idx);
    }
    return s.normalize('NFC');
  }

  genDataMarkerAlphaNum() {
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const k = this.minK + randomInt(this.maxK - this.minK + 1);
    let s = '';
    for (let i = 0; i < k; i++) {
      const idx = randomInt(chars.length);
      s += chars[idx];
    }
    return s;
  }

  genDataMarker(markerType = null) {
    const type = markerType || this.markerType;

    if (type === 'unicode') {
      return this.genDataMarkerUniCode();
    } else if (type === 'alphanumeric') {
      return this.genDataMarkerAlphaNum();
    } else {
      throw new Error(
        `Invalid marker type: ${type}. Use 'alphanumeric' or 'unicode'.`
      );
    }
  }

  markData(text, options = {}) {
    const { sandwich = true, markerType = null } = options;
    const dataMarker = this.genDataMarker(markerType);
    // Replace each whitespace character individually to preserve 1:1 fidelity
    let markedText = text.replace(/\s/g, dataMarker);

    if (sandwich) {
      markedText = dataMarker + markedText + dataMarker;
    }

    return {
      markedText: markedText,
      dataMarker: dataMarker,
    };
  }

  randomlyMarkData(text, options = {}) {
    const {
      p = this.defaultP,
      minGap = this.defaultMinGap,
      sandwich = true,
      markerType = null,
    } = options;

    const enc = new Tiktoken(cl100k_base);
    const ids = enc.encode(text);
    const dataMarker = this.genDataMarker(markerType);

    // Handle single long token by splitting it
    if (ids.length === 1 && text.length >= 8) {
      const halfPoint = Math.floor(text.length / 2);
      const markedText = sandwich
        ? dataMarker +
          text.slice(0, halfPoint) +
          dataMarker +
          text.slice(halfPoint) +
          dataMarker
        : text.slice(0, halfPoint) + dataMarker + text.slice(halfPoint);
      return { markedText, dataMarker };
    }

    // Build token array by decoding each individually (needed for insertion logic)
    const tokens = [];
    for (let i = 0; i < ids.length; i++) {
      tokens.push(enc.decode([ids[i]]));
    }

    const out = [];
    let gapSinceLastMarker = 0;
    let markerWasInserted = false;

    // First pass: probabilistic insertion
    for (let i = 0; i < tokens.length; i++) {
      out.push(tokens[i]);

      // Try to insert marker after this token (but not after the last token)
      if (
        i < tokens.length - 1 &&
        gapSinceLastMarker >= minGap &&
        randomInt(1e9) / 1e9 < p
      ) {
        out.push(dataMarker);
        gapSinceLastMarker = 0;
        markerWasInserted = true;
      } else {
        gapSinceLastMarker++;
      }
    }

    // Fallback: ensure at least one marker if none were inserted
    if (!markerWasInserted && ids.length > 1) {
      // Auto-adjust minGap if it's unreasonably large (> half the tokens)
      // This ensures markers can be inserted in the middle region of the text
      const effectiveMinGap = Math.min(minGap, Math.floor(ids.length / 2));

      // Find valid insertion points (respecting effectiveMinGap from start)
      const minIdx = Math.max(effectiveMinGap, 1);
      const maxIdx = ids.length - 1;
      // Ensure we have a valid range
      const insertionPoint =
        minIdx >= maxIdx ? maxIdx : minIdx + randomInt(maxIdx - minIdx + 1);
      out.splice(insertionPoint, 0, dataMarker);
    }

    let markedText = out.join('');
    if (sandwich) {
      markedText = dataMarker + markedText + dataMarker;
    }

    return { markedText, dataMarker };
  }
}

export { DataMarkingViaSpotlighting };
