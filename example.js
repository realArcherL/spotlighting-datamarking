import { DataMarkingViaSpotlighting } from './index.js';

// Create an instance of DataMarkingViaSpotlighting
const marker = new DataMarkingViaSpotlighting();

console.log('=== Data Marking Examples ===\n');

// Example 1: Basic data marking (replaces all spaces)
console.log('1. Basic Data Marking (replaces all spaces):');
const text1 = 'This is a simple example text';
const result1 = marker.markData(text1);
console.log('Original:', text1);
console.log('Marked:', result1.markedText);
console.log('Marker used:', result1.dataMarker);
console.log('Marker length:', result1.dataMarker.length);
console.log();

// Example 2: Random data marking with default probability (0.2)
console.log('2. Random Data Marking (default probability = 0.2):');
const text2 =
  'The quick brown fox jumps over the lazy dog. This is a test sentence.';
const result2 = marker.randomlyMarkData(text2);
console.log('Original:', text2);
console.log('Marked:', result2.markedText);
console.log('Marker used:', result2.dataMarker);
console.log();

// Example 3: Random data marking with custom probability
console.log('3. Random Data Marking (custom probability = 0.5):');
const text3 = 'This text will have more markers inserted between tokens.';
const result3 = marker.randomlyMarkData(text3, { p: 0.5 });
console.log('Original:', text3);
console.log('Marked:', result3.markedText);
console.log('Marker used:', result3.dataMarker);
console.log();

// Example 4: Random data marking with custom minimum gap
console.log('4. Random Data Marking (custom minGap = 3):');
const text4 = 'Markers will be at least 3 tokens apart from each other.';
const result4 = marker.randomlyMarkData(text4, { p: 0.3, minGap: 3 });
console.log('Original:', text4);
console.log('Marked:', result4.markedText);
console.log('Marker used:', result4.dataMarker);
console.log();

// Example 5: Custom instance with different parameters
console.log('5. Custom Instance (shorter markers, higher probability):');
const customMarker = new DataMarkingViaSpotlighting(
  5, // minK: minimum marker length
  8, // maxK: maximum marker length
  0.4, // defaultP: default probability
  2, // defaultMinGap: minimum gap between markers
  'cl100k_base' // encoding
);
const text5 = 'This uses a custom marker configuration.';
const result5 = customMarker.randomlyMarkData(text5);
console.log('Original:', text5);
console.log('Marked:', result5.markedText);
console.log('Marker used:', result5.dataMarker);
console.log('Marker length:', result5.dataMarker.length);
console.log();

// Example 6: Different encoding options
console.log('6. Using different encoding (gpt2):');
const text6 = 'Testing with GPT-2 tokenizer encoding.';
const result6 = marker.randomlyMarkData(text6, { encoding: 'gpt2' });
console.log('Original:', text6);
console.log('Marked:', result6.markedText);
console.log('Marker used:', result6.dataMarker);
console.log();

console.log('No text');
const text7 = '';
const result7 = marker.randomlyMarkData(text7, { encoding: 'gpt2' });
console.log('Original:', text7);
console.log('Marked:', result7.markedText);
console.log('Marker used:', result7.dataMarker);
console.log();

console.log('Base64 text');
const text8 =
  'VGhpcyBpcyBhIG5vcm1hbCB0ZXh0IHdoaWNoIGlzIGJlaW5nIGVuY29kZWQgdG8gYmFzZTY0LCB3aWxsIHRoaXMgZ2V0IGRhdGFtYXJrZWQ/';
const result8 = marker.randomlyMarkData(text8, { encoding: 'gpt2' });
console.log('Original:', text8);
console.log('Marked:', result8.markedText);
console.log('Marker used:', result8.dataMarker);
console.log();

console.log('=== End of Examples ===');
