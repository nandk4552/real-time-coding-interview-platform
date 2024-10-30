import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history } from "@codemirror/commands";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { foldGutter, foldKeymap } from "@codemirror/language";
import "./CodeEditor.css";

const CodeEditor = forwardRef(({ value, onChange }, codeMirrorRef) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);

  useImperativeHandle(codeMirrorRef, () => ({
    getCode: () => viewRef.current?.state.doc.toString() || "",
  }));

  // Memoize the change handler to prevent it from being recreated
  const handleEditorChange = useCallback(
    (update) => {
      if (update.docChanged) {
        const code = update.state.doc.toString();
        if (code !== value) onChange && onChange(code);
      }
    },
    [onChange, value]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: value || "// Start coding here!",
      extensions: [
        javascript(),
        lineNumbers(),
        oneDark,
        history(),
        keymap.of([...defaultKeymap, ...foldKeymap]),
        foldGutter(),
        autocompletion(),
        closeBrackets(),
        EditorView.lineWrapping,
        EditorView.updateListener.of(handleEditorChange),
      ],
    });

    if (!viewRef.current) {
      viewRef.current = new EditorView({
        state: startState,
        parent: editorRef.current,
      });
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [handleEditorChange]);

  useEffect(() => {
    const currentDoc = viewRef.current?.state.doc.toString();
    if (viewRef.current && value !== currentDoc) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={editorRef} className="border border-gray-200 h-full"></div>;
});

export default CodeEditor;
