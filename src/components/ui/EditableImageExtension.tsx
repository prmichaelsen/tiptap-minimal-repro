"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface EditableImageAttributes {
  src: string;
  isUploading?: boolean;
  blobUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  alignment?: "left" | "center" | "right";
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

const EditableImageComponent = ({
  node,
  updateAttributes,
  selected,
  getPos,
  editor,
}: NodeViewProps) => {
  const {
    src,
    isUploading = false,
    blobUrl,
    alt = "",
    width = 400,
    height = 300,
    alignment = "center",
    cropX = 0,
    cropY = 0,
    cropWidth = 400,
    cropHeight = 300,
  } = node.attrs as EditableImageAttributes;

  const [isSelected, setIsSelected] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const [showAlignmentGuide, setShowAlignmentGuide] = useState(false);
  const [previewAlignment, setPreviewAlignment] = useState<
    "left" | "center" | "right" | null
  >(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [debugDeltas, setDebugDeltas] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Current state during interaction
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);
  const [currentCropX, setCurrentCropX] = useState(cropX);
  const [currentCropY, setCurrentCropY] = useState(cropY);
  const [currentCropWidth, setCurrentCropWidth] = useState(cropWidth);
  const [currentCropHeight, setCurrentCropHeight] = useState(cropHeight);

  useEffect(() => {
    setIsMobile("ontouchstart" in window);
  }, []);

  // Sync with TipTap's selection state for arrow key navigation
  useEffect(() => {
    setIsSelected(selected || false);
  }, [selected]);

  const selectImage = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        // Prevent click from firing after touch
        e.preventDefault();
        e.stopPropagation();
      }

      setIsSelected(true);
      if (editor && getPos) {
        const pos = getPos();
        if (typeof pos === "number") {
          editor.chain().setNodeSelection(pos).blur().run();
        }
      }
    },
    [editor, getPos]
  );

  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as HTMLElement)
    ) {
      setIsSelected(false);
      setShowAlignmentGuide(false);
      setPreviewAlignment(null);
    }
  }, []);

  useEffect(() => {
    if (isSelected) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isSelected, handleClickOutside]);

  // Get editor container width for boundary constraints
  const getEditorWidth = useCallback(() => {
    const editorElement = containerRef.current?.closest(".ProseMirror");
    if (editorElement) {
      const computedStyle = window.getComputedStyle(editorElement);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      return editorElement.clientWidth - paddingLeft - paddingRight;
    }
    return 800; // fallback width
  }, []);

  // Handle resize start (supports both mouse and touch)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: string) => {
      setLastEvent(`handleResizeStart: ${handle}`);
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeHandle(handle);

      // Get coordinates from either mouse or touch event
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;
      setDragStart({ x: clientX, y: clientY });
    },
    []
  );

  // Handle resize move with boundary constraints (supports both mouse and touch)
  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !resizeHandle) return;

      e.preventDefault();
      e.stopPropagation();

      // Get coordinates from either mouse or touch event
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      setDebugDeltas({ x: deltaX, y: deltaY });
      const editorWidth = getEditorWidth();

      let newWidth = currentWidth;
      let newHeight = currentHeight;
      let newCropX = currentCropX;
      let newCropY = currentCropY;
      let newCropWidth = currentCropWidth;
      let newCropHeight = currentCropHeight;

      // Calculate aspect ratio from current image dimensions
      const aspectRatio = currentWidth / currentHeight;

      switch (resizeHandle) {
        case "se": // Southeast - simple resize maintaining aspect ratio
          {
            // Use the larger absolute delta to determine scale direction
            let scale =
              Math.abs(deltaX) > Math.abs(deltaY)
                ? (currentWidth + deltaX) / currentWidth
                : (currentHeight + deltaY) / currentHeight;

            // Calculate the new crop width based on the scale
            let potentialCropWidth = currentCropWidth * scale;

            // If the new crop width exceeds the editor width, cap it and recalculate the scale
            if (potentialCropWidth > editorWidth) {
              potentialCropWidth = editorWidth;
              scale = potentialCropWidth / currentCropWidth;
            }

            // Allow resize without editor width constraints
            newWidth = Math.max(100, currentWidth * scale);
            newHeight = Math.max(75, newWidth / aspectRatio);

            // When scaling, the crop window should scale proportionally
            newCropX = currentCropX * scale;
            newCropY = currentCropY * scale;
            newCropWidth = currentCropWidth * scale;
            newCropHeight = currentCropHeight * scale;
          }
          break;
        case "w": // West - crop from left
          newCropWidth = Math.max(50, currentCropWidth - deltaX);
          newCropX = currentCropX + (currentCropWidth - newCropWidth);
          break;
        case "e": // East - crop from right
          newCropWidth = Math.max(
            50,
            Math.min(currentWidth - currentCropX, currentCropWidth + deltaX)
          );
          break;
        case "n": // North - crop from top
          newCropHeight = Math.max(50, currentCropHeight - deltaY);
          newCropY = currentCropY + (currentCropHeight - newCropHeight);
          break;
        case "s": // South - crop from bottom
          newCropHeight = Math.max(
            50,
            Math.min(currentHeight - currentCropY, currentCropHeight + deltaY)
          );
          break;
      }

      setCurrentWidth(newWidth);
      setCurrentHeight(newHeight);
      setCurrentCropX(newCropX);
      setCurrentCropY(newCropY);
      setCurrentCropWidth(newCropWidth);
      setCurrentCropHeight(newCropHeight);
      setDragStart({ x: clientX, y: clientY });
    },
    [
      isResizing,
      resizeHandle,
      dragStart,
      currentWidth,
      currentHeight,
      currentCropX,
      currentCropY,
      currentCropWidth,
      currentCropHeight,
      getEditorWidth,
    ]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      updateAttributes({
        width: currentWidth,
        height: currentHeight,
        cropX: currentCropX,
        cropY: currentCropY,
        cropWidth: currentCropWidth,
        cropHeight: currentCropHeight,
      });
    }
    setIsResizing(false);
    setResizeHandle(null);
  }, [
    isResizing,
    updateAttributes,
    currentWidth,
    currentHeight,
    currentCropX,
    currentCropY,
    currentCropWidth,
    currentCropHeight,
  ]);

  // Handle alignment change via keyboard shortcuts or UI
  const handleAlignmentChange = useCallback(
    (newAlignment: "left" | "center" | "right") => {
      updateAttributes({ alignment: newAlignment });
    },
    [updateAttributes]
  );

  // Handle drag start for TipTap's built-in drag and drop
  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Only allow dragging from the image itself, not the handles
    if ((e.target as HTMLElement).hasAttribute("data-resize-handle")) {
      e.preventDefault();
      return;
    }

    // Set drag data for TipTap
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");

    // Add visual feedback
    setIsDraggingPosition(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingPosition(false);
  }, []);

  const handleContainerTouchStart = (e: React.TouchEvent) => {
    setLastEvent("handleContainerTouchStart");
    // This handler is only for dragging the image itself, not the handles.
    if ((e.target as HTMLElement).hasAttribute("data-resize-handle")) {
      setLastEvent("handleContainerTouchStart -> returning, resize handle");
      return;
    }

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    // Don't set isDragging yet.
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    setLastEvent("handleContainerTouchMove");
    if (isResizing || !touchStartRef.current.time) return;

    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
    }
  };

  const handleContainerTouchEnd = (e: React.TouchEvent) => {
    setLastEvent("handleContainerTouchEnd");
    if (isResizing) return;

    const touchDuration = Date.now() - touchStartRef.current.time;
    const deltaX = Math.abs(
      e.changedTouches[0].clientX - touchStartRef.current.x
    );
    const deltaY = Math.abs(
      e.changedTouches[0].clientY - touchStartRef.current.y
    );

    if (touchDuration < 250 && deltaX < 10 && deltaY < 10) {
      selectImage(e);
    }

    setIsDragging(false);
    touchStartRef.current = { x: 0, y: 0, time: 0 };
  };

  const handleTouchDragMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !wrapperRef.current) return;

      const deltaX = e.touches[0].clientX - touchStart.x;
      const deltaY = e.touches[0].clientY - touchStart.y;

      wrapperRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    },
    [isDragging, touchStart]
  );

  const handleTouchDragEnd = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !wrapperRef.current) return;

      setIsDragging(false);
      wrapperRef.current.style.transform = "";

      // This is a simplified drag-and-drop. For a real implementation,
      // you would need to calculate the new position in the document
      // and update the editor state accordingly.
      // For now, we just reset the position.
    },
    [isDragging]
  );

  // Event listeners for both mouse and touch
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("touchmove", handleTouchDragMove);
      document.addEventListener("touchend", handleTouchDragEnd);
      return () => {
        document.removeEventListener("touchmove", handleTouchDragMove);
        document.removeEventListener("touchend", handleTouchDragEnd);
      };
    }
  }, [isDragging, handleTouchDragMove, handleTouchDragEnd]);

  useEffect(() => {
    if (isResizing) {
      const options = { capture: true };
      document.addEventListener("mousemove", handleResizeMove, options);
      document.addEventListener("mouseup", handleResizeEnd, options);
      document.addEventListener("touchmove", handleResizeMove, options);
      document.addEventListener("touchend", handleResizeEnd, options);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove, options);
        document.removeEventListener("mouseup", handleResizeEnd, options);
        document.removeEventListener("touchmove", handleResizeMove, options);
        document.removeEventListener("touchend", handleResizeEnd, options);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Background image style
  const backgroundImageStyle = {
    width: currentCropWidth,
    height: currentCropHeight,
    backgroundImage: `url(${isUploading ? blobUrl : src})`,
    backgroundSize: `${currentWidth}px ${currentHeight}px`,
    backgroundPosition: `${-currentCropX}px ${-currentCropY}px`,
    backgroundRepeat: "no-repeat",
  };

  // Get alignment classes and container classes
  const getAlignmentInfo = () => {
    const currentAlignment = previewAlignment || alignment;

    switch (currentAlignment) {
      case "left":
        return {
          containerClasses: "float-left mr-4 mb-2",
          imageClasses: "inline-block",
        };
      case "right":
        return {
          containerClasses: "float-right ml-4 mb-2",
          imageClasses: "inline-block",
        };
      case "center":
      default:
        return {
          containerClasses: "text-center",
          imageClasses: "inline-block",
        };
    }
  };

  const alignmentInfo = getAlignmentInfo();

  // Render the image using background-image approach
  const renderImage = () => (
    <div
      ref={containerRef}
      className={`relative ${alignmentInfo.imageClasses} ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${isDraggingPosition ? "cursor-grabbing" : "cursor-grab"}`}
      style={backgroundImageStyle}
      onClick={(e) => selectImage(e)}
      onTouchStart={handleContainerTouchStart}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleContainerTouchEnd}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={!isResizing}
      role="img"
      aria-label={alt}
    >
      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      )}
      {/* Resize handles when selected */}
      {isSelected && !isUploading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Single corner handle for image resizing with aspect ratio */}
          <div
            className="absolute -bottom-4 -right-4 w-8 h-8 pointer-events-auto flex items-center justify-center"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleResizeStart(e, "se")}
            onTouchStart={(e) => handleResizeStart(e, "se")}
          >
            <div
              data-resize-handle
              className="w-4 h-4 bg-white border-2 border-blue-500 cursor-se-resize rounded-full"
            />
          </div>

          {/* Edge handles for cropping */}
          <div
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-10 h-8 pointer-events-auto flex items-center justify-center"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleResizeStart(e, "n")}
            onTouchStart={(e) => handleResizeStart(e, "n")}
          >
            <div
              data-resize-handle
              className="w-6 h-3 bg-white border-2 border-blue-500 cursor-n-resize rounded-full"
            />
          </div>
          <div
            className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-10 h-8 pointer-events-auto flex items-center justify-center"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleResizeStart(e, "s")}
            onTouchStart={(e) => handleResizeStart(e, "s")}
          >
            <div
              data-resize-handle
              className="w-6 h-3 bg-white border-2 border-blue-500 cursor-s-resize rounded-full"
            />
          </div>
          <div
            className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-8 h-10 pointer-events-auto flex items-center justify-center"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleResizeStart(e, "w")}
            onTouchStart={(e) => handleResizeStart(e, "w")}
          >
            <div
              data-resize-handle
              className="w-3 h-6 bg-white border-2 border-blue-500 cursor-w-resize rounded-full"
            />
          </div>
          <div
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-8 h-10 pointer-events-auto flex items-center justify-center"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleResizeStart(e, "e")}
            onTouchStart={(e) => handleResizeStart(e, "e")}
          >
            <div
              data-resize-handle
              className="w-3 h-6 bg-white border-2 border-blue-500 cursor-e-resize rounded-full"
            />
          </div>
        </div>
      )}
    </div>
  );

  // Render with proper alignment
  const handleMarginClick = (position: "top" | "bottom") => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    if (position === "top") {
      const nodeBefore = editor.state.doc.resolve(pos).nodeBefore;
      if (nodeBefore && nodeBefore.type.name === "paragraph" && nodeBefore.content.size === 0) {
        // If there is an empty paragraph before, just focus it
        editor.chain().focus(pos - 1).run();
      } else if (nodeBefore && nodeBefore.type.name === "paragraph" && nodeBefore.content.size > 0) {
        // If there is a non-empty paragraph before, do nothing (or focus it)
        editor.chain().focus(pos - 1).run();
      }
      else {
        // Otherwise, insert a new paragraph
        editor.chain().insertContentAt(pos, { type: "paragraph" }).focus(pos).run();
      }
    } else {
      const nodeAfterPos = pos + node.nodeSize;
      const nodeAfter = editor.state.doc.nodeAt(nodeAfterPos);
      if (nodeAfter && nodeAfter.type.name === "paragraph" && nodeAfter.content.size === 0) {
        // If there is an empty paragraph after, just focus it
        editor.chain().focus(nodeAfterPos + 1).run();
      } else if (nodeAfter && nodeAfter.type.name === "paragraph" && nodeAfter.content.size > 0) {
        // If there is a non-empty paragraph after, do nothing (or focus it)
        editor.chain().focus(nodeAfterPos + 1).run();
      }
      else {
        // Otherwise, insert a new paragraph
        editor.chain().insertContentAt(nodeAfterPos, { type: "paragraph" }).focus(nodeAfterPos + 1).run();
      }
    }
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`relative my-8 ${isDraggingPosition ? "opacity-75" : ""} ${
        alignmentInfo.containerClasses
      } unselectable-image`}
      data-drag-handle
    >
      <div
        className="absolute -top-8 left-0 w-full h-8 cursor-pointer"
        onClick={() => handleMarginClick("top")}
      />
      {renderImage()}
      <div
        className="absolute -bottom-8 left-0 w-full h-8 cursor-pointer"
        onClick={() => handleMarginClick("bottom")}
      />
    </NodeViewWrapper>
  );
};

export const EditableImageExtension = Node.create({
  name: "editableImage",

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
      alt: {
        default: null,
      },
      width: {
        default: 400,
      },
      height: {
        default: 300,
      },
      alignment: {
        default: "center",
      },
      cropX: {
        default: 0,
      },
      cropY: {
        default: 0,
      },
      cropWidth: {
        default: 400,
      },
      cropHeight: {
        default: 300,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditableImageComponent);
  },

  addKeyboardShortcuts() {
    return {
      ArrowLeft: () => {
        // Let TipTap handle arrow key navigation naturally
        return false;
      },
      ArrowRight: () => {
        // Let TipTap handle arrow key navigation naturally
        return false;
      },
      ArrowUp: ({ editor }) => {
        const { selection, doc } = editor.state;

        // Check if we have a NodeSelection (which means an atomic node like image is selected)
        if (selection instanceof NodeSelection) {
          const selectedNode = (selection as NodeSelection).node;

          // Check if the selected node is our editableImage
          if (selectedNode.type.name === "editableImage") {
            // Check if this image is at the very beginning of the document
            if (selection.from <= 1) {
              // Insert a paragraph at the beginning of the document
              const tr = editor.state.tr.insert(
                0,
                editor.state.schema.nodes.paragraph.create()
              );
              editor.view.dispatch(tr);
              // Move cursor to the new paragraph
              editor.commands.setTextSelection(1);
              return true;
            }
          }
        }

        // If not a NodeSelection on our image, let TipTap handle it naturally
        return false;
      },
      ArrowDown: () => {
        // Let TipTap handle arrow key navigation naturally
        return false;
      },
      Enter: ({ editor }) => {
        // Insert a new paragraph after the image
        const { selection, doc } = editor.state;
        const { $from } = selection;

        try {
          // Check if we're at the end of the document
          const nodePos = $from.before();
          const isLastNode =
            nodePos + $from.node().nodeSize >= doc.content.size;

          if (isLastNode) {
            // If this is the last node, append to the end of the document
            editor
              .chain()
              .focus()
              .insertContentAt(doc.content.size, { type: "paragraph" })
              .run();
          } else {
            // Find the position after the current node
            const after = $from.after();
            editor
              .chain()
              .focus()
              .insertContentAt(after, { type: "paragraph" })
              .run();
          }
        } catch (error) {
          // Fallback: just append to the end of the document
          editor
            .chain()
            .focus()
            .insertContentAt(doc.content.size, { type: "paragraph" })
            .run();
        }

        return true;
      },
    };
  },
});
