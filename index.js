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
    let markedText = text.replaceAll(' ', dataMarker);

    if (sandwich) {
      markedText = dataMarker + markedText + dataMarker;
    }

    return {
      markedText: markedText,
      dataMarker: dataMarker,
    };
  }

  randomlyMarkData(text, options = {}) {
    // Merge user options with defaults
    const {
      p = this.defaultP,
      minGap = this.defaultMinGap,
      encoding = this.encoding,
      sandwich = true,
    } = options;

    const enc = getEncoding(encoding);
    const ids = enc.encode(text);
    const dataMarker = this.genDataMarker();

    const out = [];
    let since = minGap,
      thr = Math.floor(p * 1_000_000);
    let markerInserted = false;

    for (let i = 0; i < ids.length; i++) {
      out.push(enc.decode([ids[i]]));
      if (i < ids.length - 1 && since >= minGap && randomInt(1_000_000) < thr) {
        out.push(dataMarker);
        since = 0;
        markerInserted = true;
      } else {
        since++;
      }
    }

    // If no marker was inserted probabilistically, insert one at a random valid position
    // Also handle single long tokens by inserting marker in the middle
    if (!markerInserted && ids.length > 1) {
      const validPositions = [];
      for (let i = minGap; i < ids.length; i++) {
        validPositions.push(i);
      }

      // If minGap is too high and no valid positions exist, fall back to inserting at the halfway point
      if (validPositions.length === 0) {
        validPositions.push(Math.floor(ids.length / 2));
      }

      // Pick a random valid token index
      const tokenIdx = validPositions[randomInt(validPositions.length)];
      out.splice(tokenIdx, 0, dataMarker);
    } else if (!markerInserted && ids.length === 1 && text.length >= 8) {
      // Handle single long token (e.g., "IgnorePrevious", "malicious")
      // Insert marker at halfway point in the character string for security
      // Threshold of 8 chars catches most potential attack strings
      const halfPoint = Math.floor(text.length / 2);
      out[0] = text.slice(0, halfPoint) + dataMarker + text.slice(halfPoint);
    }

    let markedText = out.join('');

    if (sandwich) {
      markedText = dataMarker + markedText + dataMarker;
    }

    return { markedText: markedText, dataMarker: dataMarker };
  }
}

export { DataMarkingViaSpotlighting };
