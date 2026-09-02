import React, { useMemo } from 'react';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/mantine/style.css';

interface NoteEditorProps {
  initialContent: any[] | string;
  onChange: (content: any[]) => void;
  theme?: 'light' | 'dark';
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  initialContent,
  onChange,
  theme = 'light',
}) => {
  // Parse initial content correctly
  const initialBlocks = useMemo<PartialBlock[] | undefined>(() => {
    if (Array.isArray(initialContent)) {
      return initialContent.length > 0 ? (initialContent as PartialBlock[]) : undefined;
    }
    if (typeof initialContent === 'string' && initialContent.trim() !== '') {
      // If it's a raw string (from previous textarea), map it to a simple paragraph block
      return [
        {
          type: 'paragraph',
          content: initialContent,
        },
      ];
    }
    return undefined;
  }, [initialContent]);

  // Create the editor instance
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      onChange={() => {
        onChange(editor.document);
      }}
      className="note-editor-wrapper"
    />
  );
};
