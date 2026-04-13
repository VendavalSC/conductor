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
} from "@codemirror/language";
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorState } from "@codemirror/state";

// ─── Conductor dark theme ─────────────────────────────────────────────────────

const conductorEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#06060b",
      color: "#c9c9d6",
      height: "100%",
      fontSize: "12px",
    },
    ".cm-scroller": {
      fontFamily: "\"JetBrains Mono\", \"Fira Code\", ui-monospace, Consolas, monospace",
      lineHeight: "1.7",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: "#00bfff",
      minHeight: "100%",
    },
    ".cm-line": {
      padding: "0 20px 0 0",
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
      outline: "1px solid #00bfff18",
    },
    // Active line
    ".cm-activeLine": {
      backgroundColor: "#0e0e1860",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#0e0e1860",
      color: "#727289",
    },
    // Gutters
    ".cm-gutters": {
      backgroundColor: "#06060b",
      borderRight: "1px solid #1a1a2e",
      color: "#2a2a42",
      minWidth: "46px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 10px 0 8px",
      minWidth: "38px",
      textAlign: "right",
      userSelect: "none",
    },
    ".cm-foldGutter .cm-gutterElement": {
      padding: "0 4px",
      color: "#3a3a55",
      cursor: "pointer",
    },
    ".cm-foldGutter .cm-gutterElement:hover": {
      color: "#727289",
    },
    // Bracket matching
    ".cm-matchingBracket": {
      backgroundColor: "#00bfff14",
      outline: "1px solid #00bfff28",
      borderRadius: "2px",
    },
    ".cm-nonmatchingBracket": {
      backgroundColor: "#ff525214",
      color: "#ff5252",
    },
    // Fold placeholder
    ".cm-foldPlaceholder": {
      backgroundColor: "#1a1a2e",
      border: "1px solid #2a2a42",
      color: "#727289",
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
      fontFamily: "ui-monospace, monospace",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#00bfff18",
      color: "#c9c9d6",
    },
    // Search match highlight (Ctrl+F via CM)
    ".cm-searchMatch": {
      backgroundColor: "#ffab0028",
      outline: "1px solid #ffab0040",
      borderRadius: "2px",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#ffab0050",
    },
    // Scrollbar
    ".cm-scroller::-webkit-scrollbar": {
      width: "6px",
      height: "6px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "transparent",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#1c1c2e",
      borderRadius: "3px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: "#2a2a42",
    },
  },
  { dark: true }
);

// ─── YAML syntax highlighting ─────────────────────────────────────────────────

const conductorHighlightStyle = HighlightStyle.define([
  // Comments — muted purple
  { tag: t.comment, color: "#3a3a55", fontStyle: "italic" },

  // Keys / property names — accent cyan
  { tag: t.propertyName, color: "#00bfff" },
  { tag: t.attributeName, color: "#00bfff" },

  // Strings — emerald green
  { tag: t.string, color: "#00e676" },
  { tag: t.attributeValue, color: "#00e676" },

  // Numbers — amber
  { tag: t.number, color: "#ffab00" },
  { tag: t.integer, color: "#ffab00" },
  { tag: t.float, color: "#ffab00" },

  // Booleans / null — pink/magenta
  { tag: t.bool, color: "#ec4899" },
  { tag: t.null, color: "#ec4899" },

  // Keywords (true/false/null in some parsers) — pink
  { tag: t.keyword, color: "#ec4899" },

  // Operators and punctuation — muted
  { tag: t.operator, color: "#727289" },
  { tag: t.punctuation, color: "#727289" },
  { tag: t.separator, color: "#727289" },
  { tag: t.bracket, color: "#727289" },

  // YAML-specific: anchors & aliases — purple
  { tag: t.meta, color: "#a855f7" },
  { tag: t.tagName, color: "#a855f7" },
  { tag: t.typeName, color: "#a855f7" },

  // Plain scalars / identifiers — text
  { tag: t.name, color: "#c9c9d6" },

  // Invalid
  { tag: t.invalid, color: "#ff5252", textDecoration: "underline wavy #ff525280" },
]);

// ─── Extensions bundle ────────────────────────────────────────────────────────

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
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  syntaxHighlighting(conductorHighlightStyle),
  conductorEditorTheme,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
  yaml(),
  EditorView.lineWrapping,
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

  // Ctrl+S / Cmd+S → save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!readOnly) onSave();
      }
    },
    [onSave, readOnly]
  );

  // Focus editor on mount
  useEffect(() => {
    editorRef.current?.view?.focus();
  }, []);

  return (
    <div
      className="flex-1 min-h-0 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
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
