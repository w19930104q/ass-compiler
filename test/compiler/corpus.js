import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index.js';

// A fixed dialogue corpus covering tag scope across `\N`, `\r` resets,
// persisted drawing mode, `\t` transitions, unknown tags and empty blocks.
// The compiled object trees and their order are locked by this test.
const corpus = `[Script Info]
Title: corpus
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 640
PlayResY: 480

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1
Style: alt,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,3,2,2,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:04.00,0:00:05.00,Default,,0,0,0,,{\\p1}m 0 0 l 10 0 10 10{\\p0}done
Dialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,{\\b1}bold\\N{\\i1}both
Dialogue: 1,0:00:00.00,0:00:03.00,Default,,0,0,0,,{\\fr30}a{\\r}b{\\ralt}c
Dialogue: 0,0:00:02.00,0:00:04.00,alt,,0,0,0,,{\\t(0,500,\\frz90)}spin{\\foo}{\\pos(1,2)}
Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{}{\\unknown1}safe{}
`;

describe('dialogue corpus compiler', () => {
  const { dialogues } = compile(corpus);

  it('should compile dialogues in start/end order', () => {
    expect(dialogues.map(({ start, end, layer }) => [start, end, layer])).to.deep.equal([
      [0, 2, 0],
      [0, 3, 1],
      [1, 2, 0],
      [2, 4, 0],
      [4, 5, 0],
    ]);
  });

  it('should keep tag scope across \\N within a line', () => {
    expect(dialogues[0]).to.deep.equal({
      layer: 0,
      start: 0,
      end: 2,
      style: 'Default',
      name: '',
      margin: { left: 10, right: 10, vertical: 10 },
      effect: null,
      alignment: 2,
      slices: [
        {
          style: 'Default',
          fragments: [
            { tag: { b: 1 }, text: 'bold\\N', drawing: null },
            { tag: { b: 1, i: 1 }, text: 'both', drawing: null },
          ],
        },
      ],
      q: 0,
    });
  });

  it('should scope tags by the position of \\r', () => {
    expect(dialogues[1]).to.deep.equal({
      layer: 1,
      start: 0,
      end: 3,
      style: 'Default',
      name: '',
      margin: { left: 10, right: 10, vertical: 10 },
      effect: null,
      alignment: 2,
      slices: [
        {
          style: 'Default',
          fragments: [{ tag: { frz: 30 }, text: 'a', drawing: null }],
        },
        {
          style: 'Default',
          fragments: [{ tag: {}, text: 'b', drawing: null }],
        },
        {
          style: 'alt',
          fragments: [{ tag: {}, text: 'c', drawing: null }],
        },
      ],
      q: 0,
    });
  });

  it('should safely skip unknown tags and empty blocks', () => {
    expect(dialogues[2]).to.deep.equal({
      layer: 0,
      start: 1,
      end: 2,
      style: 'Default',
      name: '',
      margin: { left: 10, right: 10, vertical: 10 },
      effect: null,
      alignment: 2,
      slices: [
        {
          style: 'Default',
          fragments: [{ tag: {}, text: 'safe', drawing: null }],
        },
      ],
      q: 0,
    });
  });

  it('should compile \\t transitions and global tags', () => {
    expect(dialogues[3]).to.deep.equal({
      layer: 0,
      start: 2,
      end: 4,
      style: 'alt',
      name: '',
      margin: { left: 20, right: 20, vertical: 20 },
      effect: null,
      alignment: 2,
      slices: [
        {
          style: 'alt',
          fragments: [
            {
              tag: { t: [{ t1: 0, t2: 500, accel: 1, tag: { frz: 90 } }] },
              text: 'spin',
              drawing: null,
            },
          ],
        },
      ],
      q: 0,
      pos: { x: 1, y: 2 },
    });
  });

  it('should compile drawing followed by text', () => {
    expect(dialogues[4]).to.deep.equal({
      layer: 0,
      start: 4,
      end: 5,
      style: 'Default',
      name: '',
      margin: { left: 10, right: 10, vertical: 10 },
      effect: null,
      alignment: 2,
      slices: [
        {
          style: 'Default',
          fragments: [
            {
              tag: { p: 1 },
              text: '',
              drawing: {
                instructions: [
                  { type: 'M', points: [{ x: 0, y: 0 }] },
                  { type: 'L', points: [{ x: 10, y: 0 }, { x: 10, y: 10 }] },
                ],
                d: 'M0,0L10,0,10,10',
                minX: 0,
                minY: 0,
                width: 10,
                height: 10,
              },
            },
            { tag: { p: 0 }, text: 'done', drawing: null },
          ],
        },
      ],
      q: 0,
    });
  });
});
