import { randomBytes } from 'node:crypto';

const PUA_START = 0xe000,
  PUA_END = 0xf8ff,
  N = PUA_END - PUA_START + 1;

class DataMarkingViaSpotlighting {
  constructor(minK = 6, maxK = 11) {
    this.minK = minK;
    this.maxK = maxK;
  }

  genDataMarker() {
    const k = this.minK + (randomBytes(1)[0] % (this.maxK - this.minK + 1));
    const bytes = randomBytes(k);
    let s = '';
    for (let i = 0; i < k; i++) {
      const idx = bytes[i] % N;
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

  randomMarking() {
    // Placeholder for future implementation
    // This method will handle random marking logic
  }
}

// Example usage
const marker = new DataMarkingViaSpotlighting();
const originalText =
  'This is a sample text to be marked, Now with spotlighting data marking.';
const markedText = marker.markData(originalText);
console.log('Original Text:', originalText);
console.log('Generated Token:', markedText.dataMarker);
console.log('Marked Text:', markedText);
