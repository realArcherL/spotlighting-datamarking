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

  markData(text) {
    // use replace all to replace all spaces with token
    const dataMarker = this.genDataMarker();
    return {
      markedText: text.replaceAll(' ', dataMarker),
      dataMarker: dataMarker,
    };
  }

  randomlyMarkedData(text, options = {}) {
    // Merge user options with defaults
    const {
      p = this.defaultP,
      minGap = this.defaultMinGap,
      encoding = this.encoding,
    } = options;

    const enc = getEncoding(encoding);
    const ids = enc.encode(text);
    const dataMarker = this.genDataMarker();

    const out = [];
    let since = minGap,
      thr = Math.floor(p * 1_000_000);

    for (let i = 0; i < ids.length; i++) {
      out.push(enc.decode([ids[i]]));
      if (i < ids.length - 1 && since >= minGap && randomInt(1_000_000) < thr) {
        out.push(dataMarker);
        since = 0;
      } else {
        since++;
      }
    }

    return { markedText: out.join(''), dataMarker: dataMarker };
  }
}

export { DataMarkingViaSpotlighting };
