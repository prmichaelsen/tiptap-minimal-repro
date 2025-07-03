"use client";

import { EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import { editorService } from "@/lib/editorService";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  autoFocus?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your post...",
  className = "",
  minHeight = "120px",
  autoFocus = true,
}) => {
  const [isClient, setIsClient] = useState(false);
  const editor = editorService.getEditor();

  // Ensure we're on the client side before rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
    if (!editor) return;
    
    const onUpdate = () => {
      onChange(editor.getHTML());
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor, value, onChange]);

  // Mock upload state management (simplified version of Redux logic)
  const [uploads] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!editor) return;
  
    Object.values(uploads).forEach(upload => {
      if (upload.status === 'success' && upload.url) {
        const { state, view } = editor;
        let nodeToUpdate: { pos: number; node: any } | null = null;
  
        // Find the node by its uploadId
        state.doc.descendants((node, pos) => {
          if (node.attrs.uploadId === upload.id) {
            nodeToUpdate = { pos, node };
            return false; // Stop searching
          }
        });
  
        if (nodeToUpdate) {
          // Update the node with the final URL
          const transaction = state.tr.setNodeMarkup((nodeToUpdate as any).pos, undefined, {
            ...(nodeToUpdate as any).node.attrs, // Preserve existing attributes
            src: upload.url,
            isUploading: false,
          });
          view.dispatch(transaction);
        }
      }
    });
  }, [uploads, editor]);

  if (!isClient || !editor) {
    return (
      <div 
        className={`w-full h-full border-0 bg-transparent focus:outline-none ${className}`}
        style={{ minHeight }}
      >
        <div className="animate-pulse bg-gray-200 h-8 rounded mb-2"></div>
        <div className="animate-pulse bg-gray-200 h-4 rounded mb-2"></div>
        <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full overflow-y-auto border-0 bg-transparent focus:outline-none transition-all duration-200 ${className}`}
      style={{ 
        fontSize: "16px",
        overscrollBehavior: 'contain', // Prevent scroll chaining
      }}
    >
      {/* Editor Content */}
      <div
        className="bg-transparent"
        style={{ minHeight }}
      >
        <EditorContent
          editor={editor}
          className="markdown-editor focus:outline-none bg-transparent text-gray-900 dark:text-white"
          style={{ 
            fontSize: "16px",
            paddingBottom: "2px" // Add a small padding to ensure content doesn't sit flush with the bottom
          }}
        />
        {/* Invisible spacer to ensure scrollability even with minimal content */}
        <div 
          className="invisible" 
          style={{ 
            height: "1px", // Just 1px to ensure minimal scrollability
            pointerEvents: "none", // Don't interfere with editor interactions
            marginBottom: "1px", // Add a tiny bit of space at the bottom
            width: "100%"
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
