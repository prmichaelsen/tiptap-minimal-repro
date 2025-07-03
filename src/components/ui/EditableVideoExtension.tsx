import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

const EditableVideoComponent = ({ node, getPos, editor }: NodeViewProps) => {
  const { src, isUploading, blobUrl } = node.attrs;
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
    setIsDraggingPosition(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingPosition(false);
  }, []);

  const handleMarginClick = (position: "top" | "bottom") => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    if (position === "top") {
      const nodeBefore = editor.state.doc.resolve(pos).nodeBefore;
      if (nodeBefore && nodeBefore.type.name === "paragraph" && nodeBefore.content.size === 0) {
        // Focus empty paragraph before
        editor.chain().focus(pos - 1).run();
      } else if (nodeBefore && nodeBefore.type.name === "paragraph" && nodeBefore.content.size > 0) {
        // Focus non-empty paragraph before
        editor.chain().focus(pos - 1).run();
      } else {
        // Insert new paragraph before
        editor.chain().insertContentAt(pos, { type: "paragraph" }).focus(pos).run();
      }
    } else {
      const nodeAfterPos = pos + node.nodeSize;
      const nodeAfter = editor.state.doc.nodeAt(nodeAfterPos);
      if (nodeAfter && nodeAfter.type.name === "paragraph" && nodeAfter.content.size === 0) {
        // Focus empty paragraph after
        editor.chain().focus(nodeAfterPos + 1).run();
      } else if (nodeAfter && nodeAfter.type.name === "paragraph" && nodeAfter.content.size > 0) {
        // Focus non-empty paragraph after
        editor.chain().focus(nodeAfterPos + 1).run();
      } else {
        // Insert new paragraph after
        editor.chain().insertContentAt(nodeAfterPos, { type: "paragraph" }).focus(nodeAfterPos + 1).run();
      }
    }
  };

  return (
    <NodeViewWrapper
      className={`relative my-8 unselectable-image ${isDraggingPosition ? "opacity-75" : ""}`}
      data-drag-handle
    >
      <div
        className="absolute -top-8 left-0 w-full h-8 cursor-pointer"
        onClick={() => handleMarginClick("top")}
      />
      <div className="relative">
        <video
          src={isUploading ? blobUrl : src}
          controls
          playsInline
          className="w-full"
          onClick={() => editor.chain().blur().run()}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggable={!isUploading}
        />
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        )}
      </div>
      <div
        className="absolute -bottom-8 left-0 w-full h-8 cursor-pointer"
        onClick={() => handleMarginClick("bottom")}
      />
    </NodeViewWrapper>
  );
};

export const EditableVideoExtension = Node.create({
  name: "editableVideo",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      isUploading: {
        default: false,
      },
      blobUrl: {
        default: null,
      },
      uploadId: {
        default: null,
        renderHTML: () => null,
        parseHTML: () => null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes, { controls: "true", playsinline: "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditableVideoComponent);
  },
});
