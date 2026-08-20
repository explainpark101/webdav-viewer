// ref: CodeEditPage.jsx line14:19
// TODO: Implement new Plugin to better handle bold, italic, underline, strike-through for unicode characters wrapped inside.
// Currently, `**안녕(하세요)**` is rendered as `**안녕(하세요)**`, but should be rendered as `<b>안녕(하세요)</b>`.
// Similarly, `*안녕(하세요)*` is rendered as `*안녕(하세요)*`, but should be rendered as `<i>안녕(하세요)</i>`.
// `~~안녕(하세요)~~` is rendered as `~~안녕(하세요)~~`, but should be rendered as `<s>안녕(하세요)</s>`.
// `_안녕(하세요)_` is rendered as `_안녕(하세요)_`, but should be rendered as `<u>안녕(하세요)</u>`.
// `~~안녕(하세요)~~` is rendered as `~~안녕(하세요)~~`, but should be rendered as `<s>안녕(하세요)</s>`.

import { MarkdownIt } from "markdown-it";
import type { StateInline } from "markdown-it";

const betterStrong = (
  state: StateInline,
  silent: boolean,
): boolean => {
  const pos = state.pos;
  const src = state.src;

  if (src.charCodeAt(pos) !== 0x2a) {
    return false;
  }

  if (src.charCodeAt(pos + 1) !== 0x2a) {
    return false;
  }

  const end = src.indexOf("**", pos + 2);

  if (end === -1) {
    return false;
  }

  if (silent) {
    return true;
  }

  const tokenOpen = state.push("strong_open", "strong", 1);
  tokenOpen.markup = "**";

  const tokenText = state.push("text", "", 0);
  tokenText.content = src.slice(pos + 2, end);

  const tokenClose = state.push("strong_close", "strong", -1);
  tokenClose.markup = "**";

  state.pos = end + 2;

  return true;
};

const betterMd = (md: MarkdownIt): void => {
    md.inline.ruler.before(
        "emphasis",
        "better_strong",
        betterStrong,
    );
    
    md.renderer.rules.strong_open = () => "<b>";
    md.renderer.rules.strong_close = () => "</b>";
};

export default betterMd;