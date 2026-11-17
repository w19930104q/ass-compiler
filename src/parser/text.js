import { parseDrawing } from './drawing.js';
import { parseTags } from './tags.js';

export function parseText(text) {
  const pairs = text.split(/{(.*?)}/);
  const parsed = [];
  if (pairs[0].length) {
    parsed.push({ tags: [], text: pairs[0], drawing: [] });
  }
  // Drawing mode is a line-level state: `\p1` enables it and it stays
  // active across override blocks until `\p0` or a `\r` reset, so that
  // the parser agrees with the tag inheritance done by the compiler.
  let isDrawing = false;
  for (let i = 1; i < pairs.length; i += 2) {
    const tags = parseTags(pairs[i]);
    for (let j = 0; j < tags.length; j++) {
      const tag = tags[j];
      if (tag.r !== undefined) isDrawing = false;
      if (tag.p !== undefined) isDrawing = !!tag.p;
    }
    parsed.push({
      tags,
      text: isDrawing ? '' : pairs[i + 1],
      drawing: isDrawing ? parseDrawing(pairs[i + 1]) : [],
    });
  }
  return {
    raw: text,
    combined: parsed.map((frag) => frag.text).join(''),
    parsed,
  };
}
