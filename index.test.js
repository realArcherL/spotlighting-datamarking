/**
 * Tests for DataMarkingViaSpotlighting
 *
 * Covers all the scenarios discussed:
 * - Basic marker generation
 * - markData functionality
 * - randomlyMarkData functionality
 * - Guaranteed marker insertion
 * - High minGap handling
 * - Probability-based insertion
 * - Sandwich mode
 * - Edge cases
 */

import { DataMarkingViaSpotlighting } from './index.js';
import { getEncoding } from 'js-tiktoken';

describe('DataMarkingViaSpotlighting', () => {
  let marker;

  beforeEach(() => {
    marker = new DataMarkingViaSpotlighting();
  });

  describe('Constructor', () => {
    test('should create instance with default values', () => {
      expect(marker.minK).toBe(7);
      expect(marker.maxK).toBe(12);
      expect(marker.defaultP).toBe(0.2);
      expect(marker.defaultMinGap).toBe(1);
      expect(marker.markerType).toBe('alphanumeric');
    });

    test('should create instance with custom values', () => {
      const customMarker = new DataMarkingViaSpotlighting(
        5,
        8,
        0.3,
        2,
        'unicode'
      );
      expect(customMarker.minK).toBe(5);
      expect(customMarker.maxK).toBe(8);
      expect(customMarker.defaultP).toBe(0.3);
      expect(customMarker.defaultMinGap).toBe(2);
      expect(customMarker.markerType).toBe('unicode');
    });
  });

  describe('genDataMarkerUniCode()', () => {
    test('should generate a marker within specified length range', () => {
      const dataMarker = marker.genDataMarkerUniCode();
      expect(dataMarker.length).toBeGreaterThanOrEqual(7);
      expect(dataMarker.length).toBeLessThanOrEqual(12);
    });

    test('should generate different markers each time', () => {
      const marker1 = marker.genDataMarkerUniCode();
      const marker2 = marker.genDataMarkerUniCode();
      const marker3 = marker.genDataMarkerUniCode();

      // At least one should be different (very high probability)
      expect(
        marker1 !== marker2 || marker2 !== marker3 || marker1 !== marker3
      ).toBe(true);
    });

    test('should use custom marker length', () => {
      const customMarker = new DataMarkingViaSpotlighting(3, 5);
      const dataMarker = customMarker.genDataMarkerUniCode();
      expect(dataMarker.length).toBeGreaterThanOrEqual(3);
      expect(dataMarker.length).toBeLessThanOrEqual(5);
    });
  });

  describe('markData()', () => {
    test('should replace all spaces with markers (with sandwich)', () => {
      const text = 'Hello World';
      const result = marker.markData(text);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();
      expect(result.markedText).not.toBe(text);

      // Count marker occurrences: 1 space replacement + 2 sandwich markers = 3 total
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBe(3);
    });

    test('should replace all spaces with markers (without sandwich)', () => {
      const text = 'Hello World Test';
      const result = marker.markData(text, { sandwich: false });

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();
      expect(result.markedText).not.toBe(text);

      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBe(2);
    });

    test('should handle single word response', () => {
      const text = 'HelloWorld';
      const result = marker.markData(text, { sandwich: false });

      // Without sandwich and no spaces, text should be unchanged
      expect(result.markedText).toBe(text);
    });

    test('should apply sandwich mode by default', () => {
      const text = 'Hello World';
      const result = marker.markData(text);

      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);
    });

    test('should handle empty string', () => {
      const result = marker.markData('');

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();

      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);
    });
  });

  describe('randomlyMarkData() - Basic Functionality', () => {
    test('should mark data with default settings', () => {
      const text = 'Hello World Test';
      const result = marker.randomlyMarkData(text);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();
      expect(typeof result.markedText).toBe('string');
      expect(typeof result.dataMarker).toBe('string');
    });
  });

  describe('randomlyMarkData() - Guaranteed Marker Insertion', () => {
    test('should ALWAYS insert at least one marker (even with low probability)', () => {
      const text = 'Hello World Test';

      // Run multiple times to ensure consistency
      for (let i = 0; i < 20; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.01, // Very low probability
          sandwich: false,
        });

        // Should always have at least one marker
        expect(result.markedText).not.toBe(text);

        // Count marker occurrences - should be at least 1
        const markerCount =
          result.markedText.split(result.dataMarker).length - 1;
        expect(markerCount).toBeGreaterThanOrEqual(1);
      }
    });

    test('should insert marker even with probability = 0', () => {
      const text = 'Hello World Test';
      const result = marker.randomlyMarkData(text, {
        p: 0,
        sandwich: false,
      });

      // Even with 0 probability, should guarantee at least one marker
      expect(result.markedText).not.toBe(text);

      // Count marker occurrences - should be exactly 1 (guaranteed insertion only)
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBe(1);
    });

    test('should not insert marker for single-token text', () => {
      const text = 'Hello'; // Single token
      const result = marker.randomlyMarkData(text, {
        p: 0.01,
        sandwich: false,
      });

      // Single token text cannot have internal markers
      // (it's only 1 token, nowhere to insert between)
      expect(result.markedText).toBe(text);
    });
  });

  describe('randomlyMarkData() - minGap Enforcement (Anti-Clustering)', () => {
    test('should enforce minimum gap between consecutive markers', () => {
      const text =
        'The quick brown fox jumps over the lazy dog and runs very fast today';
      const enc = getEncoding('cl100k_base');

      const minGapValues = [1, 2, 3, 5];

      minGapValues.forEach(minGap => {
        // Run multiple times to ensure consistency
        for (let attempt = 0; attempt < 20; attempt++) {
          const result = marker.randomlyMarkData(text, {
            p: 0.7, // High probability to insert many markers
            minGap: minGap,
            sandwich: false,
          });

          // Split by marker to get segments
          const segments = result.markedText.split(result.dataMarker);

          // Check each segment (except the last) has at least minGap tokens
          for (let i = 0; i < segments.length - 1; i++) {
            const segmentTokens = enc.encode(segments[i]);
            expect(segmentTokens.length).toBeGreaterThanOrEqual(minGap);
          }
        }
      });
    });

    test('should respect minGap=2 prevents adjacent token marking', () => {
      const text = 'One Two Three Four Five Six Seven Eight Nine Ten';
      const enc = getEncoding('cl100k_base');

      // Test multiple times to ensure no violations
      for (let i = 0; i < 50; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.8,
          minGap: 2,
          sandwich: false,
        });

        const segments = result.markedText.split(result.dataMarker);

        // Every segment between markers must have at least 2 tokens
        for (let j = 0; j < segments.length - 1; j++) {
          const segmentTokens = enc.encode(segments[j]);
          expect(segmentTokens.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    test('should respect minGap=5 creates well-spaced markers', () => {
      const text =
        'The quick brown fox jumps over the lazy dog and runs fast through the forest';
      const enc = getEncoding('cl100k_base');

      for (let i = 0; i < 30; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.6,
          minGap: 5,
          sandwich: false,
        });

        const segments = result.markedText.split(result.dataMarker);

        // Every segment between markers must have at least 5 tokens
        for (let j = 0; j < segments.length - 1; j++) {
          const segmentTokens = enc.encode(segments[j]);
          expect(segmentTokens.length).toBeGreaterThanOrEqual(5);
        }
      }
    });

    test('should never violate minGap constraint even with high probability', () => {
      const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z';
      const enc = getEncoding('cl100k_base');

      const result = marker.randomlyMarkData(text, {
        p: 0.99, // Extremely high probability
        minGap: 3,
        sandwich: false,
      });

      const segments = result.markedText.split(result.dataMarker);

      // Even with p=0.99, minGap=3 must be respected
      for (let i = 0; i < segments.length - 1; i++) {
        const segmentTokens = enc.encode(segments[i]);
        expect(segmentTokens.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('should allow markers with minGap=1 (minimum spacing)', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const enc = getEncoding('cl100k_base');

      const result = marker.randomlyMarkData(text, {
        p: 0.9,
        minGap: 1,
        sandwich: false,
      });

      const segments = result.markedText.split(result.dataMarker);

      // All segments must have at least 1 token
      for (let i = 0; i < segments.length - 1; i++) {
        const segmentTokens = enc.encode(segments[i]);
        expect(segmentTokens.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('should verify minGap prevents clustering across multiple runs', () => {
      const text = 'Hello world this is a test of marker spacing functionality';
      const enc = getEncoding('cl100k_base');

      let totalViolations = 0;
      const runs = 100;

      for (let i = 0; i < runs; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.7,
          minGap: 2,
          sandwich: false,
        });

        const segments = result.markedText.split(result.dataMarker);

        for (let j = 0; j < segments.length - 1; j++) {
          const segmentTokens = enc.encode(segments[j]);
          if (segmentTokens.length < 2) {
            totalViolations++;
          }
        }
      }

      // Should have ZERO violations across all runs
      expect(totalViolations).toBe(0);
    });
  });

  describe('randomlyMarkData() - High minGap Handling', () => {
    test('should handle minGap >= token count (fallback to halfway)', () => {
      const text = 'Hello World Test'; // 3 tokens

      const result = marker.randomlyMarkData(text, {
        p: 0.01,
        minGap: 10, // Much higher than token count
        sandwich: false,
      });

      // Should still insert a marker (fallback to halfway)
      expect(result.markedText).not.toBe(text);
      expect(result.markedText).toContain(result.dataMarker);
    });

    test('should handle extremely high minGap values', () => {
      const text = 'The quick brown fox jumps over the lazy dog';

      const result = marker.randomlyMarkData(text, {
        p: 0.01,
        minGap: 1000,
        sandwich: false,
      });

      // Should still insert a marker
      expect(result.markedText).not.toBe(text);
      expect(result.markedText).toContain(result.dataMarker);
    });

    test('should insert at halfway position when minGap is too high', () => {
      const text = 'One Two Three Four Five'; // ~5 tokens

      // Run multiple times to verify it's inserting (not just coincidence)
      let markerCount = 0;
      for (let i = 0; i < 10; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.01,
          minGap: 100,
          sandwich: false,
        });

        if (result.markedText !== text) {
          markerCount++;
        }
      }

      // All attempts should have markers
      expect(markerCount).toBe(10);
    });
  });

  describe('randomlyMarkData() - Sandwich Mode', () => {
    test('should apply sandwich mode by default', () => {
      const text = 'Hello World';
      const result = marker.randomlyMarkData(text);

      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);
    });

    test('should disable sandwich mode when specified', () => {
      const text = 'Hello World';
      const result = marker.randomlyMarkData(text, { sandwich: false });

      expect(result.markedText.startsWith(result.dataMarker)).toBe(false);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(false);
    });

    test('sandwich mode should wrap even with no internal markers', () => {
      const text = 'HelloWorld'; // Single token
      const result = marker.randomlyMarkData(text, {
        sandwich: true,
        p: 0.01,
      });

      // Should have sandwich wrapping
      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      const result = marker.randomlyMarkData('');
      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();
    });

    test('should handle very long text', () => {
      const longText = 'word '.repeat(100).trim(); // 100 words = 100 tokens
      const result = marker.randomlyMarkData(longText);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();

      // Text should be modified (markers inserted)
      expect(result.markedText).not.toBe(longText);

      // Should have sandwich wrapping (default)
      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);

      // With p=0.2 and 100 words, should have multiple markers
      // (at least sandwich + some internal markers)
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBeGreaterThanOrEqual(3);
    });

    test('should handle special characters', () => {
      const text = 'Hello! @#$% World? 123';
      const result = marker.randomlyMarkData(text);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();

      // Text should be modified (has multiple tokens)
      expect(result.markedText).not.toBe(text);

      // Should have sandwich wrapping by default
      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);

      // Should have at least sandwich markers
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBeGreaterThanOrEqual(2);
    });

    test('should handle Unicode text', () => {
      const text = 'Hello 世界 🌍';
      const result = marker.randomlyMarkData(text);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();

      // Text should be modified (has multiple tokens)
      expect(result.markedText).not.toBe(text);

      // Should have sandwich wrapping by default
      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);

      // Should have at least sandwich markers
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBeGreaterThanOrEqual(2);
    });

    test('should handle text with only spaces', () => {
      const text = '   ';
      const result = marker.markData(text);

      expect(result.markedText).toBeDefined();
      expect(result.dataMarker).toBeDefined();

      // All spaces should be replaced individually + sandwich markers
      // 3 spaces = 3 markers (1:1 replacement) + 2 sandwich = 5 total
      const markerCount = result.markedText.split(result.dataMarker).length - 1;
      expect(markerCount).toBe(5);

      // Should have sandwich wrapping (default for markData)
      expect(result.markedText.startsWith(result.dataMarker)).toBe(true);
      expect(result.markedText.endsWith(result.dataMarker)).toBe(true);
    });
  });

  describe('Emoji and Multi-byte Character Preservation', () => {
    test('should preserve simple emojis without corruption', () => {
      const text = 'Hello 👋 World 😊';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      // Remove all markers and verify text is unchanged
      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);

      // Verify no replacement characters (�) indicating corruption
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve multi-token emojis', () => {
      const text = 'Emoji test 😊 🎉 💯';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve compound emojis with ZWJ sequences', () => {
      const text = 'Family emoji: 👨‍👩‍👧‍👦 here';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve emojis with skin tone modifiers', () => {
      const text = 'Hands: 👍🏽 👋🏾 👏🏿';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve special Unicode characters', () => {
      const text = 'Special chars: ™®© and symbols ✓✗→';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve multi-byte characters (Chinese, Japanese, Korean)', () => {
      const text = '你好世界 こんにちは 안녕하세요';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve mixed content with emojis and special chars', () => {
      const text = 'Multi-byte: 你好 🌏 Café ñoño™';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve emojis across multiple runs', () => {
      const text = '🎉 Party time 🎊 celebration 🎈';

      // Run 10 times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const result = marker.randomlyMarkData(text, { p: 0.3 });
        const cleanedText = result.markedText.split(result.dataMarker).join('');

        expect(cleanedText).toBe(text);
        expect(result.markedText).not.toContain('�');
      }
    });

    test('should preserve flag emojis', () => {
      const text = 'Flags: 🇺🇸 🇬🇧 🇯🇵 🇮🇳';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should handle emoji-heavy text', () => {
      const text = '😀😃😄😁😆😅🤣😂🙂🙃😉😊😇';
      const result = marker.randomlyMarkData(text, { p: 0.5 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });

    test('should preserve emojis even with high probability and low minGap', () => {
      const text = 'Test 👋 with 😊 many 🎉 emojis 💯 here 🔥';
      const result = marker.randomlyMarkData(text, { p: 0.9, minGap: 1 });

      const cleanedText = result.markedText.split(result.dataMarker).join('');
      expect(cleanedText).toBe(text);
      expect(result.markedText).not.toContain('�');
    });
  });

  describe('Probability vs Determinism', () => {
    test('should produce different results with same input (probability-based)', () => {
      const text = 'The quick brown fox jumps over the lazy dog';

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.3,
          sandwich: false,
        });
        results.push(result.markedText);
      }

      // At least some should be different (very high probability)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    test('marker locations should vary across multiple runs', () => {
      const text = 'One Two Three Four Five Six Seven Eight Nine Ten';

      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.2,
          sandwich: false,
        });
        results.push(result.markedText);
      }

      // Should have variation in marker placement
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Security Properties', () => {
    test('should never allow multi-token text to pass unmarked', () => {
      const texts = [
        'Hello World',
        'The quick brown fox',
        'Test this security feature',
        'A B C D E F G H I J K L',
      ];

      texts.forEach(text => {
        // Test with very low probability
        const result = marker.randomlyMarkData(text, {
          p: 0.001,
          sandwich: false,
        });

        // Must have at least one marker
        expect(result.markedText).not.toBe(text);
      });
    });

    test('should handle adversarial minGap values', () => {
      const text = 'Hello World Test';

      const adversarialMinGaps = [0, 100, 1000, Number.MAX_SAFE_INTEGER];

      adversarialMinGaps.forEach(minGap => {
        const result = marker.randomlyMarkData(text, {
          p: 0.01,
          minGap: minGap,
          sandwich: false,
        });

        // Should still insert marker
        expect(result.markedText).not.toBe(text);
      });
    });
  });

  describe('Return Value Structure', () => {
    test('should return object with markedText and dataMarker', () => {
      const text = 'Hello World';
      const result = marker.randomlyMarkData(text);

      expect(result).toHaveProperty('markedText');
      expect(result).toHaveProperty('dataMarker');
      expect(typeof result.markedText).toBe('string');
      expect(typeof result.dataMarker).toBe('string');
    });

    test('should use the same marker throughout marked text', () => {
      const text = 'One Two Three Four Five';
      const result = marker.markData(text);

      // Extract all potential markers (this is a simplified check)
      const markerLength = result.dataMarker.length;
      expect(markerLength).toBeGreaterThan(0);

      // The marked text should contain the marker
      expect(result.markedText.includes(result.dataMarker)).toBe(true);
    });
  });

  describe('Single Long Token Protection', () => {
    test('should NOT split single tokens shorter than 8 characters', () => {
      const shortTokens = ['Hi', 'Hello', 'Ignore'];

      shortTokens.forEach(text => {
        const result = marker.randomlyMarkData(text, {
          p: 0.001, // Very low probability to test fallback
          sandwich: false,
        });

        // Short single tokens should not be marked
        expect(result.markedText).toBe(text);
      });
    });

    test('should split single tokens >= 8 characters at halfway point', () => {
      // "Ignoring" is a single token with 8 characters
      const text = 'Ignoring';
      const result = marker.randomlyMarkData(text, {
        p: 0.001, // Very low probability to force fallback
        sandwich: false,
      });

      // Should have marker inserted
      expect(result.markedText).not.toBe(text);
      expect(result.markedText).toContain(result.dataMarker);

      // Should be split at halfway point (4 chars)
      const halfPoint = Math.floor(text.length / 2);
      const expected =
        text.slice(0, halfPoint) + result.dataMarker + text.slice(halfPoint);
      expect(result.markedText).toBe(expected);
    });

    test('should consistently mark long single tokens across multiple attempts', () => {
      const text = 'IgnorePreviousInstructions'; // 26 chars, likely single token

      let markerCount = 0;
      for (let i = 0; i < 20; i++) {
        const result = marker.randomlyMarkData(text, {
          p: 0.001, // Very low probability
          sandwich: false,
        });

        if (result.markedText !== text) {
          markerCount++;
        }
      }

      // All attempts should have markers (guaranteed insertion)
      expect(markerCount).toBe(20);
    });

    test('should split at character halfway point, not token boundary', () => {
      // Test with known single-token strings only
      const testCases = [
        'Ignoring', // 8 chars, single token
        'abcdefghijklmnopqrstuvwxyz', // 26 chars, known single token
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // 26 chars, known single token
      ];

      testCases.forEach(text => {
        const result = marker.randomlyMarkData(text, {
          p: 0.001,
          sandwich: false,
        });

        // Should be split at character halfway point
        const halfPoint = Math.floor(text.length / 2);
        const expected =
          text.slice(0, halfPoint) + result.dataMarker + text.slice(halfPoint);

        expect(result.markedText).toBe(expected);
      });
    });

    test('should handle edge case of exactly 8 character single token', () => {
      const text = 'Ignoring'; // Exactly 8 characters

      const result = marker.randomlyMarkData(text, {
        p: 0.001,
        sandwich: false,
      });

      // Should be marked (threshold is >= 8)
      expect(result.markedText).not.toBe(text);
      expect(result.markedText).toContain(result.dataMarker);
    });
  });

  describe('base64EncodeData()', () => {
    test('should encode simple text to Base64', () => {
      const text = 'Hello World';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();
      expect(result.prompt).toBeDefined();
      expect(result.markedText).toBe('SGVsbG8gV29ybGQ=');
      expect(typeof result.markedText).toBe('string');
    });

    test('should handle Unicode characters', () => {
      const text = 'Hello 世界';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });

    test('should handle emojis and special characters', () => {
      const text = '🎉 Hello! Émojis: ™®© 😀';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });

    test('should handle empty string', () => {
      const text = '';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBe('');
      expect(result.prompt).toBeDefined();
    });

    test('should handle multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });

    test('should handle text with special whitespace characters', () => {
      const text = 'Text\twith\ttabs\nand\nnewlines\rand\rcarriage returns';
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });

    test('should return correct prompt format', () => {
      const text = 'Test data';
      const result = marker.base64EncodeData(text);

      expect(result.prompt).toContain('base64');
      expect(result.prompt).toContain('data');
      expect(result.prompt).toContain('instructions');
    });

    test('should handle very long text', () => {
      const text = 'A'.repeat(100000);
      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });

    test('should handle all Unicode planes', () => {
      // Test various Unicode ranges
      const text =
        'Latin: Hello ' +
        'CJK: 你好世界 ' +
        'Arabic: مرحبا ' +
        'Hebrew: שלום ' +
        'Cyrillic: Привет ' +
        'Greek: Γεια ' +
        'Emoji: 😀🎉💯 ' +
        'Math: ∑∫∂∇ ' +
        'Symbols: ™®©€£¥';

      const result = marker.base64EncodeData(text);

      expect(result.markedText).toBeDefined();

      // Verify it can be decoded back correctly
      const decoded = Buffer.from(result.markedText, 'base64').toString(
        'utf-8'
      );
      expect(decoded).toBe(text);
    });
  });
});
