# Spotlighting Data Marking

A simple package to implement data marking functionality to make indirect prompt injections difficult, based on research by Microsoft.

## Installation

```bash
npm install
```

## Usage

```javascript
import { DataMarkingViaSpotlighting } from 'spotlighting-datamarking';

// Create an instance
const marker = new DataMarkingViaSpotlighting();

// Basic usage - mark all spaces
const text = 'This is a test';
const result = marker.markData(text);
console.log(result.markedText); // Text with invisible markers
console.log(result.dataMarker); // The marker used

// Random marking - insert markers probabilistically
const result2 = marker.randomlyMarkedData('Your text here');
console.log(result2.markedText); // Text with random markers
console.log(result2.dataMarker); // The marker used

// Custom options
const result3 = marker.randomlyMarkedData('Your text here', {
  p: 0.5, // Probability of marker insertion (0-1)
  minGap: 2, // Minimum tokens between markers
  encoding: 'cl100k_base', // Tokenizer encoding
});
```

## Constructor Options

```javascript
new DataMarkingViaSpotlighting(
  minK,
  maxK,
  defaultP,
  defaultMinGap,
  defaultEncoding
);
```

- `minK` - Minimum marker length (default: 7)
- `maxK` - Maximum marker length (default: 12)
- `defaultP` - Default probability of marker insertion (default: 0.2)
- `defaultMinGap` - Default minimum gap between markers (default: 1)
- `defaultEncoding` - Default tokenizer encoding (default: 'cl100k_base')

## Example

See `example.js` for more examples.

```bash
node example.js
```
