import { describe, it, expect } from 'vitest';
import { parseTags } from '../src/parser/tags.js';
import { parseText } from '../src/parser/text.js';
import { compileStyles } from '../src/compiler/styles.js';
import { compileText } from '../src/compiler/text.js';

const styles = compileStyles({
  info: { WrapStyle: 0 },
  style: [
    {
      Name: 'Default',
      Fontname: 'Arial',
      Fontsize: '20',
      PrimaryColour: '&H00FFFFFF',
      SecondaryColour: '&H000000FF',
      OutlineColour: '&H000000',
      BackColour: '&H00000000',
      Bold: '-1',
      Italic: '0',
      Underline: '0',
      StrikeOut: '0',
      ScaleX: '100',
      ScaleY: '100',
      Spacing: '0',
      Angle: '0',
      BorderStyle: '1',
      Outline: '2',
      Shadow: '2',
      Alignment: '2',
      MarginL: '10',
      MarginR: '10',
      MarginV: '10',
      Encoding: '0',
    },
  ],
});

const compileLine = (text) => compileText({
  styles,
  style: 'Default',
  parsed: parseText(text).parsed,
  start: 0,
  end: 1,
});

describe('stress: deeply nested tags', () => {
  it('should keep sibling tags after deep parentheses in unknown tags', () => {
    expect(parseTags('\\foo((((((1))))))\\b1')).to.deep.equal([{}, { b: 1 }]);
    const { slices } = compileLine('{\\foo((((((1))))))\\b1}x');
    expect(slices[0].fragments).to.deep.equal([
      { tag: { b: 1 }, text: 'x', drawing: null },
    ]);
  });

  it('should handle unbalanced parentheses safely', () => {
    expect(parseTags('\\foo(1))\\b1')).to.deep.equal([{}, { b: 1 }]);
    // an unclosed parenthesis swallows the rest without crashing
    expect(parseTags('\\foo(((\\b1')).to.deep.equal([]);
  });

  it('should compile clip and scale inside a transition', () => {
    const { slices } = compileLine('{\\t(0,1000,1,\\clip(0,0,10,10)\\fscx150)}x');
    expect(slices[0].fragments[0].tag).to.deep.equal({
      t: [
        {
          t1: 0,
          t2: 1000,
          accel: 1,
          tag: {
            clip: {
              inverse: false,
              scale: 1,
              drawing: null,
              dots: { x1: 0, y1: 0, x2: 10, y2: 10 },
            },
            fscx: 150,
          },
        },
      ],
    });
  });

  it('should drop nested transitions instead of crashing', () => {
    expect(() => parseTags('\\t(\\t(\\t(\\fs20)))')).to.not.throw();
    const { slices } = compileLine('{\\t(\\t(\\fs20))}x');
    const [t] = slices[0].fragments[0].tag.t;
    // a `\t` can never appear inside a compiled transition
    expect(t.tag.t).to.equal(undefined);
  });

  it('should compile a drawing nested in \\clip', () => {
    const { clip } = compileLine('{\\clip(m 0 0 l 10 0 10 10)}x');
    expect(clip.drawing.d).to.equal('M0,0L10,0,10,10');
  });
});

describe('stress: empty tags', () => {
  it('should parse empty tag blocks', () => {
    expect(parseTags('')).to.deep.equal([]);
    expect(parseTags('\\')).to.deep.equal([]);
    expect(parseText('{}{}{}').parsed).to.deep.equal([
      { tags: [], text: '', drawing: [] },
      { tags: [], text: '', drawing: [] },
      { tags: [], text: '', drawing: [] },
    ]);
    expect(parseText('{\\}{\\\\}{\\t()}x').parsed).to.deep.equal([
      { tags: [], text: '', drawing: [] },
      { tags: [], text: '', drawing: [] },
      { tags: [{}], text: 'x', drawing: [] },
    ]);
  });

  it('should compile empty tag blocks without disturbing tag scope', () => {
    const { slices } = compileLine('{}{\\b1}{}x');
    expect(slices[0].fragments).to.deep.equal([
      { tag: { b: 1 }, text: 'x', drawing: null },
    ]);
  });

  it('should ignore tags with empty values', () => {
    const { slices, pos, clip, fade } = compileLine('{\\pos()}{\\clip()}{\\fad()}x');
    expect(pos).to.equal(undefined);
    expect(clip).to.equal(undefined);
    expect(fade).to.equal(undefined);
    expect(slices[0].fragments).to.deep.equal([
      { tag: {}, text: 'x', drawing: null },
    ]);
  });

  it('should handle empty drawing blocks', () => {
    const { slices } = compileLine('{\\p1}{\\p0}x');
    expect(slices[0].fragments).to.deep.equal([
      { tag: { p: 0 }, text: 'x', drawing: null },
    ]);
  });

  it('should scope \\r across \\N', () => {
    const { slices } = compileLine('a\\N{\\r}b');
    expect(slices).to.deep.equal([
      {
        style: 'Default',
        fragments: [{ tag: {}, text: 'a\\N', drawing: null }],
      },
      {
        style: 'Default',
        fragments: [{ tag: {}, text: 'b', drawing: null }],
      },
    ]);
  });
});
