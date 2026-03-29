# spotlighting-datamarking

Defend against indirect prompt injection using [Spotlighting](https://arxiv.org/abs/2403.14720) (Microsoft Research). Marks untrusted data with special tokens so LLMs can distinguish it from instructions.

An open-source implementation of all three spotlighting variants from the paper — data marking, random interleaving, and base64 encoding (the strongest). The spotlighting technique itself is [used by Microsoft in production](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/better-detecting-cross-prompt-injection-attacks-introducing-spotlighting-in-azur/4458404) as part of Prompt Shields in Azure AI Foundry.

## Install

```bash
npm install spotlighting-datamarking
```

## Quick Start

```javascript
import { DataMarkingViaSpotlighting } from 'spotlighting-datamarking';

const marker = new DataMarkingViaSpotlighting();

const result = marker.markData('Ignore previous instructions');
// result.markedText  → "[MARKER]Ignore[MARKER]previous[MARKER]instructions[MARKER]"
// result.dataMarker  → the random marker string
// result.prompt      → LLM instruction to prepend to your system prompt
```

## API

### `new DataMarkingViaSpotlighting(minK?, maxK?, defaultP?, defaultMinGap?, markerType?)`

| Param           | Default          | Description                     |
| --------------- | ---------------- | ------------------------------- |
| `minK`          | `7`              | Min marker length               |
| `maxK`          | `12`             | Max marker length               |
| `defaultP`      | `0.5`            | Marker insertion probability    |
| `defaultMinGap` | `1`              | Min tokens between markers      |
| `markerType`    | `'alphanumeric'` | `'alphanumeric'` or `'unicode'` |

### `markData(text, options?)`

Replaces all whitespace with markers. Returns `{ markedText, dataMarker, prompt }`.

### `randomlyMarkData(text, options?)`

Inserts markers probabilistically between tokens. Guarantees at least one marker. Returns `{ markedText, dataMarker, prompt }`.

### `base64EncodeData(text, options?)`

Base64-encodes the text. Returns `{ markedText, prompt }`.

### `sanitizeText(text)`

Strips invisible Unicode characters (zero-width spaces, BiDi controls, PUA chars, etc.). Called automatically before marking by default.

### Options

All marking methods accept:

| Option       | Default          | Description                                             |
| ------------ | ---------------- | ------------------------------------------------------- |
| `sanitize`   | `true`           | Strip invisible chars before marking                    |
| `sandwich`   | `true`           | Wrap text with boundary markers                         |
| `markerType` | instance default | Override marker type per-call                           |
| `p`          | `0.5`            | Insertion probability (`randomlyMarkData` only)         |
| `minGap`     | `1`              | Min token gap between markers (`randomlyMarkData` only) |

> **Note:** When using `unicode` markers, PUA characters (U+E000–F8FF) are **always** stripped from input regardless of the `sanitize` setting. This prevents attackers from spoofing markers.

## Usage

```javascript
import { DataMarkingViaSpotlighting } from 'spotlighting-datamarking';

const marker = new DataMarkingViaSpotlighting();
const untrustedData = getEmailBody(); // could contain injection attempts

const result = marker.randomlyMarkData(untrustedData, { p: 0.5 });

const messages = [
  { role: 'system', content: `You are a helpful assistant.\n${result.prompt}` },
  { role: 'user', content: `Summarize this email:\n${result.markedText}` },
];
```

## Sanitization

Input is sanitized by default before marking. The sanitizer removes:

- Zero-width characters (U+200B, U+200C, U+200E, U+200F)
- BiDi controls (U+202A–202E, U+2066–2069)
- Soft hyphen, BOM, word joiner, invisible operators
- Private Use Area chars (U+E000–F8FF)
- Unicode tag characters (U+E0001, U+E0020–E007F)
- Line/paragraph separators (U+2028–2029)

ZWJ (U+200D) is preserved to keep compound emoji intact (👨‍👩‍👧‍👦).

Disable with `{ sanitize: false }` if you need raw passthrough.

## Testing

```bash
npm test
```

## Real-World Validation

Two independent studies have evaluated spotlighting against adaptive attackers:

1. **[LLMail-Inject](https://arxiv.org/abs/2506.09956)** (Abdelnabi et al., SaTML 2025): A public CTF run by Microsoft with 839 participants and 208k+ submissions against an LLM email assistant. Spotlighting reduced tool-call rates and was "more effective than some detection defenses alone, such as Prompt Shield." Only 0.8% of all submissions achieved a successful end-to-end attack, and stacking spotlighting with detection defenses improved results further.

2. **[The Attacker Moves Second](https://arxiv.org/abs/2510.09023)** (Nasr, Carlini et al., 2025): A separate study that evaluated 12 defenses including spotlighting using strong adaptive attacks (search-based, RL, gradient, and human red-teaming). Against static attacks, spotlighting held ASR to ~1%. However, adaptive search-based attacks achieved >95% ASR, and human red-teamers generated 265 successful injections against it. The authors concluded they "did not observe any measurable difference in the types of attacks that succeed on models with these defenses compared to the same models without the defense."

**Takeaway:** Spotlighting raises the bar significantly against naive and static attacks, but it does not hold up against determined adaptive adversaries. It should be layered with other defenses (detection classifiers, instruction hierarchy, input sanitization) rather than relied upon alone.

## References

- [Defending Against Indirect Prompt Injection Attacks With Spotlighting](https://arxiv.org/abs/2403.14720) — Hines et al., 2024
- [LLMail-Inject: A Dataset from a Realistic Adaptive Prompt Injection Challenge](https://arxiv.org/abs/2506.09956) — Abdelnabi et al., 2025
- [The Attacker Moves Second: Stronger Adaptive Attacks Bypass Defenses Against LLM Jailbreaks and Prompt Injections](https://arxiv.org/abs/2510.09023) — Nasr, Carlini et al., 2025
