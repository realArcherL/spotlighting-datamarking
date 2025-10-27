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

    // Decode tokens and probabilistically insert markers in a single pass
    const out = [];
    let gapSinceLastMarker = 0;
    let markerWasInserted = false;

    for (let i = 0; i < ids.length; i++) {
      // Decode token directly into output array
      out.push(enc.decode([ids[i]]));

      // Try to insert marker after this token (but not after the last token)
      if (
        i < ids.length - 1 &&
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
      // Clamp minGap to reasonable range (at least 1, at most half the tokens)
      // and use as the minimum insertion index
      const minIdx = Math.min(Math.max(minGap, 1), Math.floor(ids.length / 2));
      const maxIdx = ids.length;

      // Random insertion point in range [minIdx, maxIdx)
      const insertionPoint = minIdx + randomInt(maxIdx - minIdx);
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
