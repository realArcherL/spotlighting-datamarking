import { randomInt } from 'node:crypto';
import { getEncoding } from 'js-tiktoken';

const PUA_START = 0xe000,
  PUA_END = 0xf8ff,
  N = PUA_END - PUA_START + 1;

class DataMarkingViaSpotlighting {
  /**
   * @param {number} minK - Minimum marker length (default: 7)
   * @param {number} maxK - Maximum marker length (default: 12)
   * @param {number} defaultP - Default probability of marker insertion (default: 0.2)
   * @param {number} defaultMinGap - Default minimum gap between markers (default: 1)
   * @param {string} defaultEncoding - Default tokenizer encoding (default: 'cl100k_base')
   *                                  Options: 'cl100k_base' (GPT-4), 'p50k_base' (Codex), 'r50k_base' (GPT-2/3), 'gpt2'
   */
  constructor(
    minK = 7,
    maxK = 12,
    defaultP = 0.2,
    defaultMinGap = 1,
    defaultEncoding = 'cl100k_base'
  ) {
    this.minK = minK;
    this.maxK = maxK;
    this.defaultP = defaultP;
    this.defaultMinGap = defaultMinGap;
    this.encoding = defaultEncoding;
  }

  genDataMarker() {
    const k = this.minK + randomInt(this.maxK - this.minK + 1);
    let s = '';
    for (let i = 0; i < k; i++) {
      const idx = randomInt(N);
      s += String.fromCodePoint(PUA_START + idx);
    }
    return s.normalize('NFC');
  }

  markData(text, options = {}) {
    // use replace all to replace all spaces with token
    const { sandwich = true } = options;
    const dataMarker = this.genDataMarker();
    let markedText = text.replace(/\s+/g, dataMarker);

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
      encoding = this.encoding,
      sandwich = true,
    } = options;

    const enc = getEncoding(encoding);
    const ids = enc.encode(text);
    const dataMarker = this.genDataMarker();

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

    const out = [];
    let gapSinceLastMarker = minGap;
    let markerWasInserted = false;

    // First pass: probabilistic insertion
    for (let i = 0; i < ids.length; i++) {
      out.push(enc.decode([ids[i]]));

      // Try to insert marker after this token (but not after the last token)
      if (
        i < ids.length - 1 &&
        gapSinceLastMarker >= minGap &&
        Math.random() < p
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
      // Find valid insertion points (respecting minGap from start)
      const maxValidIndex = ids.length - 1;
      const minValidIndex = Math.min(minGap, Math.floor(ids.length / 2));
      const insertionPoint =
        minValidIndex + randomInt(maxValidIndex - minValidIndex + 1);
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
