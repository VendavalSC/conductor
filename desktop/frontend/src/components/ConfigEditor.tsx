import React, { useCallback, useEffect, useRef } from "react";
import ReactCodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  keymap,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
  Decoration,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";
import { EditorState } from "@codemirror/state";

// ─── Theme ───────────────────────────────────────────────────────────────────
// Styles the editor chrome: background, gutter, cursor, selection, etc.

const conductorEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#06060b",
      color: "#c9c9d6",
      height: "100%",
      fontSize: "12px",
    },
    ".cm-scroller": {
      fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Consolas, monospace',
      lineHeight: "1.75",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: "#00bfff",
      minHeight: "100%",
    },
    // Left gap between gutter divider and first character
    ".cm-line": {
      padding: "0 20px 0 14px",
    },
    // Cursor
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#00bfff",
      borderLeftWidth: "2px",
    },
    // Selection
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#00bfff1a",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#00bfff10",
      outline: "1px solid #00bfff1a",
    },
    // Active line
    ".cm-activeLine": { backgroundColor: "#0e0e1855" },
    ".cm-activeLineGutter": {
      backgroundColor: "#0e0e1855",
      color: "#5a5a7a",
    },
    // Gutter
    ".cm-gutters": {
      backgroundColor: "#06060b",
      borderRight: "1px solid #16162a",
      color: "#28284a",
      minWidth: "46px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 10px 0 8px",
      minWidth: "38px",
      textAlign: "right",
      userSelect: "none",
      letterSpacing: "0.02em",
    },
    ".cm-foldGutter .cm-gutterElement": {
      padding: "0 4px",
      color: "#28284a",
      cursor: "pointer",
    },
    ".cm-foldGutter .cm-gutterElement:hover": { color: "#727289" },
    // Bracket matching
    ".cm-matchingBracket": {
      backgroundColor: "#00bfff14",
      outline: "1px solid #00bfff28",
      borderRadius: "2px",
    },
    ".cm-nonmatchingBracket": { color: "#ff5252" },
    // Fold placeholder
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "1px solid #2a2a42",
      color: "#4a4a65",
      borderRadius: "4px",
      padding: "0 6px",
      fontSize: "10px",
      cursor: "pointer",
    },
    // Tooltip / autocomplete
    ".cm-tooltip": {
      backgroundColor: "#0e0e18",
      border: "1px solid #1c1c2e",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    },
    ".cm-tooltip-autocomplete ul li": {
      padding: "3px 10px",
      fontSize: "11px",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#00bfff18",
      color: "#c9c9d6",
    },
    // Scrollbar
    ".cm-scroller::-webkit-scrollbar": { width: "6px", height: "6px" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#1c1c2e",
      borderRadius: "3px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": { background: "#2a2a42" },

    // ── Value-type decorations applied by the regex plugin below ──────────
    ".cm-yaml-bool":   { color: "#ec4899" },   // pink/magenta
    ".cm-yaml-number": { color: "#ffab00" },   // amber
    ".cm-yaml-null":   { color: "#a855f7" },   // violet
    ".cm-yaml-string": { color: "#00e676" },   // emerald (also via HighlightStyle)
  },
  { dark: true }
);

// ─── Syntax highlighting ──────────────────────────────────────────────────────
// Maps lezer YAML grammar tags to colors.
//
// Actual tags emitted by @lezer/yaml:
//   Key/Literal | Key/QuotedLiteral  → tags.definition(tags.propertyName)
//   QuotedLiteral                    → tags.string
//   Literal (all other plain scalars)→ tags.content
//   Comment                          → tags.lineComment
//   ": , -"                          → tags.separator
//   "[ ]"                            → tags.squareBracket
//   "{ }"                            → tags.brace
//   Anchor, Alias                    → tags.labelName
//   Tag                              → tags.typeName
//   DirectiveName                    → tags.keyword
//   DirectiveContent                 → tags.attributeValue
//   DirectiveEnd, DocEnd             → tags.meta

const conductorHighlightStyle = HighlightStyle.define([
  // Comments — muted slate, italic
  { tag: [t.lineComment, t.blockComment, t.comment],
    color: "#3d3d60", fontStyle: "italic" },

  // Keys — accent cyan (matches definition(propertyName) and propertyName)
  { tag: [t.propertyName, t.definition(t.propertyName), t.attributeName],
    color: "#00bfff" },

  // Quoted string values — emerald green
  { tag: t.string,
    color: "#00e676" },

  // Plain scalar values (unquoted strings, numbers, booleans, null —
  // the lezer YAML parser does NOT distinguish their types, they all land
  // here as tags.content). The regex plugin below overrides specific patterns.
  { tag: t.content,
    color: "#c9c9d6" },

  // YAML separators: ":", ",", "-" list marker
  { tag: t.separator,
    color: "#4a4a65" },

  // Flow brackets: [ ] { }
  { tag: [t.squareBracket, t.bracket],
    color: "#4a4a65" },
  { tag: t.brace,
    color: "#4a4a65" },

  // Anchors (&name) and aliases (*name) — violet
  { tag: [t.labelName, t.meta],
    color: "#a855f7" },

  // YAML tags (!tag) — violet
  { tag: t.typeName,
    color: "#a855f7" },

  // Directive names (%YAML, %TAG) — pink
  { tag: t.keyword,
    color: "#ec4899" },

  // Directive content / attribute values — green
  { tag: t.attributeValue,
    color: "#00e676" },

  // --- marks, document separators (---  ...) — dim
  { tag: [t.processingInstruction, t.punctuation],
    color: "#4a4a65" },

  // Invalid / error tokens
  { tag: t.invalid,
    color: "#ff5252", textDecoration: "underline wavy #ff525260" },
]);

// ─── Regex decorator for booleans, numbers, null ──────────────────────────────
// The YAML lezer parser tags ALL plain scalars as `content`, with no semantic
// distinction between strings, numbers, or booleans. We use a ViewPlugin with
// MatchDecorator to re-colour specific patterns that appear as YAML values
// (i.e. after ": " or as sequence items starting with "- ").

const boolDeco   = Decoration.mark({ class: "cm-yaml-bool" });
const numDeco    = Decoration.mark({ class: "cm-yaml-number" });
const nullDeco   = Decoration.mark({ class: "cm-yaml-null" });

// Matches: <colon-space> or <dash-space> followed by a value token.
// Capture group 1 = the value itself.
const valueRe = /(?::\s+|- |^- )(\btrue\b|\bfalse\b|\byes\b|\bno\b|\bon\b|\boff\b|\bnull\b|~|-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(?:#.*)?$/gim;

const valueDecorator = new MatchDecorator({
  regexp: valueRe,
  decoration(match) {
    const val = match[1];
    if (!val) return null;
    const lower = val.toLowerCase();
    if (/^(true|false|yes|no|on|off)$/.test(lower)) return boolDeco;
    if (/^(null|~)$/.test(lower))                    return nullDeco;
    return numDeco; // numeric
  },
});

const yamlValuePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = valueDecorator.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = valueDecorator.updateDeco(update, this.decorations);
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── Extension bundle ─────────────────────────────────────────────────────────

const baseExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  autocompletion({ closeOnBlur: false }),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  conductorEditorTheme,
  syntaxHighlighting(conductorHighlightStyle),
  yaml(),
  yamlValuePlugin,
  EditorView.lineWrapping,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ConfigEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  readOnly?: boolean;
}

export function ConfigEditor({ value, onChange, onSave, readOnly = false }: ConfigEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!readOnly) onSave();
      }
    },
    [onSave, readOnly]
  );

  useEffect(() => {
    editorRef.current?.view?.focus();
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-hidden" onKeyDown={handleKeyDown}>
      <ReactCodeMirror
        ref={editorRef}
        value={value}
        onChange={onChange}
        extensions={baseExtensions}
        readOnly={readOnly}
        theme="none"
        basicSetup={false}
        style={{ height: "100%", overflow: "hidden" }}
        className="h-full"
      />
    </div>
  );
}
