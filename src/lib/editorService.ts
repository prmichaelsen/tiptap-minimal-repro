import { Editor, Extension } from "@tiptap/react";
import { EventEmitter } from "events";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Blockquote from "@tiptap/extension-blockquote";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Dropcursor from "@tiptap/extension-dropcursor";
import { EditableImageExtension } from "../components/ui/EditableImageExtension";
import { EditableVideoExtension } from "../components/ui/EditableVideoExtension";
import {
  getImageFromClipboard,
  hasImageInClipboard,
} from "./clipboard-utils";
import { v4 as uuidv4 } from "uuid";

// Mock upload handler for minimal repro
const mockUploadHandler = (file: File, uploadId: string) => {
  // Simulate upload delay
  setTimeout(() => {
    // In a real app, this would dispatch to Redux store
    // For minimal repro, we'll just log
    console.log(`Mock upload completed for ${uploadId}:`, file.name);
  }, 2000);
};

type EditorManagerEvents = {
  "active-editor-change": (editor: Editor | null) => void;
  "mark-state-change": (pendingMarks: Record<string, boolean>) => void;
};

class EditorManager extends EventEmitter {
  private editor: Editor | null = null;
  private pendingMarks: Record<string, boolean> = {}; // Track marks that are toggled but not yet applied

  constructor() {
    super();
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeEditor();
    }
  }

  private initializeEditor() {
    this.editor = new Editor({
      onUpdate: ({ editor }) => {
        // Clear pending marks when content changes (typing occurs)
        if (Object.values(this.pendingMarks).some(value => value)) {
          this.pendingMarks = {};
          this.emit('mark-state-change', { ...this.pendingMarks });
        }
      },
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Underline,
        Code,
        CodeBlock,
        Heading.configure({
          levels: [2, 3, 4, 5, 6],
        }),
        BulletList.configure({
          keepMarks: true,
          keepAttributes: true,
        }),
        OrderedList.configure({
          keepMarks: true,
          keepAttributes: true,
        }),
        Blockquote.configure({
          HTMLAttributes: {
            class: "border-l-4 border-blue-500 pl-4 italic my-4",
          },
        }),
        HardBreak.configure({
          keepMarks: true,
        }),
        ListItem,
        History,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-500 underline hover:text-blue-600",
          },
        }),
        Placeholder.configure({
          placeholder: "Write something...",
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right"],
          defaultAlignment: "left",
        }),
        Dropcursor.configure({
          color: "#3b82f6",
          width: 2,
        }),
        EditableImageExtension,
        EditableVideoExtension,
      ],
      content: "",
      editorProps: {
        // Enable storedMarks for the editor to maintain active marks without selection
        attributes: {
          class: `prose prose-sm max-w-none focus:outline-none dark:prose-invert [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_p]:my-1 [&_p]:leading-tight [&_*]:leading-tight`,
          style: "font-size: 16px;",
        },
        handleKeyDown: (view, event) => {
          if (this.editor) {
            this.editor.chain().scrollIntoView().run();
          }
          
          // Handle keyboard shortcuts for formatting
          const isMac = /Mac/.test(navigator.platform);
          const modKey = isMac ? event.metaKey : event.ctrlKey;
          
          // Check for formatting shortcuts (Cmd/Ctrl + key)
          if (modKey) {
            const { state } = view;
            const { selection } = state;
            const { empty } = selection;
            
            // Only handle empty selections for our custom pending marks behavior
            if (empty) {
              // Bold: Cmd/Ctrl + B
              if (event.key === 'b' || event.key === 'B') {
                this.toggleMark('bold');
                return true; // Prevent default behavior
              }
              
              // Italic: Cmd/Ctrl + I
              if (event.key === 'i' || event.key === 'I') {
                this.toggleMark('italic');
                return true; // Prevent default behavior
              }
              
              // Underline: Cmd/Ctrl + U
              if (event.key === 'u' || event.key === 'U') {
                this.toggleMark('underline');
                return true; // Prevent default behavior
              }
            }
          }
          
          // Ensure marks are preserved when typing after toggling a mark
          const { state } = view;
          const { selection, storedMarks } = state;
          const { empty } = selection;
          
          // If we have stored marks and the selection is empty, make sure they're applied
          if (empty && storedMarks) {
            return false;
          }
          // Exit link mode when user types two spaces after a link
          if (event.key === " ") {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;

            // Check if we're currently in a link
            const linkMark = state.schema.marks.link;
            const hasLinkMark =
              linkMark && $from.marks().some((mark) => mark.type === linkMark);

            if (hasLinkMark) {
              // Check if the previous character is also a space
              const prevChar = state.doc.textBetween($from.pos - 1, $from.pos);
              if (prevChar === " ") {
                // Two spaces detected: remove the previous space from the link and add one space outside
                const tr = state.tr
                  .delete($from.pos - 1, $from.pos) // Remove the previous space that's part of the link
                  .removeStoredMark(linkMark) // Remove link mark for future typing
                  .insertText(" "); // Insert a space outside the link
                view.dispatch(tr);
                return true; // Prevent default behavior since we handled it
              }
            }
          }
          return false;
        },
        handlePaste: (view, event, slice) => {
          // Handle image paste
          const clipboardData = event.clipboardData;
          if (clipboardData && hasImageInClipboard(clipboardData)) {
            event.preventDefault();

            const imageFile = getImageFromClipboard(clipboardData);
            if (imageFile && this.editor) {
              const uploadId = uuidv4();
              const blobUrl = URL.createObjectURL(imageFile);
              const { state } = this.editor.view;
              const { tr } = state;
              const pos = state.selection.from;

              if (imageFile.type.startsWith("image/")) {
                const img = new Image();
                img.onload = () => {
                  if (!this.editor) return;
                  const { naturalWidth, naturalHeight } = img;
                  const editorView = this.editor.view.dom;
                  const editorWidth = editorView.clientWidth;
                  const maxWidth = editorWidth > 0 ? editorWidth : 600;
                  const maxHeight = 400;
                  let displayWidth = naturalWidth;
                  let displayHeight = naturalHeight;

                  if (naturalWidth > maxWidth) {
                    const ratio = maxWidth / naturalWidth;
                    displayWidth = maxWidth;
                    displayHeight = naturalHeight * ratio;
                  }

                  if (displayHeight > maxHeight) {
                    const ratio = maxHeight / displayHeight;
                    displayWidth *= ratio;
                    displayHeight = maxHeight;
                  }

                  const node = this.editor.schema.nodes.editableImage.create({
                    isUploading: true,
                    blobUrl,
                    uploadId,
                    alt: imageFile.name || "Pasted image",
                    width: displayWidth,
                    height: displayHeight,
                    alignment: "center",
                    cropX: 0,
                    cropY: 0,
                    cropWidth: displayWidth,
                    cropHeight: displayHeight,
                  });
                  tr.insert(pos, node);
                  this.editor.view.dispatch(tr);

                  mockUploadHandler(imageFile, uploadId);
                };
                img.src = blobUrl;
              } else if (imageFile.type.startsWith("video/")) {
                const node = this.editor.schema.nodes.editableVideo.create({
                  isUploading: true,
                  blobUrl,
                  uploadId,
                });
                tr.insert(pos, node);
                this.editor.view.dispatch(tr);

                mockUploadHandler(imageFile, uploadId);
              }
            }

            return true; // Prevent default paste behavior
          }

          return false; // Allow default paste behavior for non-images
        },
        handleDrop: (view, event, slice, moved) => {
          // Handle file drops (images)
          const files = Array.from(event.dataTransfer?.files || []);
          const mediaFiles = files.filter(
            (file) =>
              file.type.startsWith("image/") || file.type.startsWith("video/")
          );

          if (mediaFiles.length > 0) {
            event.preventDefault();

            mediaFiles.forEach((file) => {
              const uploadId = uuidv4();
              const blobUrl = URL.createObjectURL(file);
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });

              if (coordinates && this.editor) {
                const pos = coordinates.pos;
                const { state } = this.editor.view;
                const { tr } = state;

                if (file.type.startsWith("image/")) {
                  const img = new Image();
                  img.onload = () => {
                    if (!this.editor) return;
                    const { naturalWidth, naturalHeight } = img;
                    const editorView = this.editor.view.dom;
                    const editorWidth = editorView.clientWidth;
                    const maxWidth = editorWidth > 0 ? editorWidth : 600;
                    const maxHeight = 400;
                    let displayWidth = naturalWidth;
                    let displayHeight = naturalHeight;

                    if (naturalWidth > maxWidth) {
                      const ratio = maxWidth / naturalWidth;
                      displayWidth = maxWidth;
                      displayHeight = naturalHeight * ratio;
                    }

                    if (displayHeight > maxHeight) {
                      const ratio = maxHeight / displayHeight;
                      displayWidth *= ratio;
                      displayHeight = maxHeight;
                    }

                    const node = this.editor.schema.nodes.editableImage.create({
                      isUploading: true,
                      blobUrl,
                      uploadId,
                      alt: file.name || "Dropped image",
                      width: displayWidth,
                      height: displayHeight,
                      alignment: "center",
                      cropX: 0,
                      cropY: 0,
                      cropWidth: displayWidth,
                      cropHeight: displayHeight,
                    });
                    tr.insert(pos, node);
                    this.editor.view.dispatch(tr);

                    mockUploadHandler(file, uploadId);
                  };
                  img.src = blobUrl;
                } else if (file.type.startsWith("video/")) {
                  const node = this.editor.schema.nodes.editableVideo.create({
                    isUploading: true,
                    blobUrl,
                    uploadId,
                  });
                  tr.insert(pos, node);
                  this.editor.view.dispatch(tr);

                  mockUploadHandler(file, uploadId);
                }
              }
            });

            return true; // Prevent default drop behavior
          }

          return false; // Allow default drop behavior for non-images
        },
      },
    });
  }

  public getEditor(): Editor | null {
    return this.editor;
  }
  
  /**
   * Indents the current selection or block
   */
  public indent(): void {
    const editor = this.getEditor();
    if (!editor || !editor.isEditable) return;
    
    editor.chain().focus().sinkListItem('listItem').run();
  }
  
  /**
   * Outdents (reduces indentation) of the current selection or block
   */
  public outdent(): void {
    const editor = this.getEditor();
    if (!editor || !editor.isEditable) return;
    
    editor.chain().focus().liftListItem('listItem').run();
  }
  
  /**
   * Checks if a mark is currently active in the editor
   * This will return true even if there's no selection but the mark is stored
   * @param name The name of the mark to check
   * @returns True if the mark is active, false otherwise
   */
  public isMarkActive(name: string): boolean {
    const editor = this.getEditor();
    if (!editor) return false;
    
    // Check both the editor's active state and our pending marks
    return editor.isActive(name) || !!this.pendingMarks[name];
  }
  
  /**
   * Toggles a mark in the editor and ensures it's stored for next input
   * This makes the formatting button appear active even without selection
   * @param name The name of the mark to toggle (e.g., 'bold', 'italic')
   */
  public toggleMark(name: string): void {
    const editor = this.getEditor();
    if (!editor || !editor.isEditable) return;
    
    // Focus the editor to ensure stored marks work
    editor.chain().focus();
    
    // Get the current ProseMirror state
    const { state, dispatch } = editor.view;
    const { selection } = state;
    const { empty } = selection;
    
    // If the selection is empty, we need to ensure the mark is stored
    // This is what makes the button appear active even without selection
    if (empty) {
      // Check if the mark is currently active
      const isActive = editor.isActive(name);
      
      // Toggle the pending mark state - explicitly set to true or false
      // If it's currently active, set to false (turning it off)
      // If it's currently inactive, set to true (turning it on)
      this.pendingMarks[name] = !isActive;
      
      // Also toggle the mark in the editor (for when typing begins)
      switch (name) {
        case 'bold':
          editor.commands.toggleMark('bold');
          break;
        case 'italic':
          editor.commands.toggleMark('italic');
          break;
        case 'strike':
          editor.commands.toggleMark('strike');
          break;
        case 'underline':
          editor.commands.toggleMark('underline');
          break;
        case 'code':
          editor.commands.toggleMark('code');
          break;
        default:
          break;
      }
      
      // Emit an event so UI can update
      this.emit('mark-state-change', { ...this.pendingMarks });
    } else {
      // If there is a selection, use the standard toggle commands
      switch (name) {
        case 'bold':
          editor.chain().toggleBold().run();
          break;
        case 'italic':
          editor.chain().toggleItalic().run();
          break;
        case 'strike':
          editor.chain().toggleStrike().run();
          break;
        case 'underline':
          editor.chain().toggleUnderline().run();
          break;
        case 'code':
          editor.chain().toggleCode().run();
          break;
        default:
          break;
      }
    }
  }

  // Type-safe on method
  public on<E extends keyof EditorManagerEvents>(
    event: E,
    listener: EditorManagerEvents[E]
  ): this {
    return super.on(event, listener);
  }

  // Type-safe off method
  public off<E extends keyof EditorManagerEvents>(
    event: E,
    listener: EditorManagerEvents[E]
  ): this {
    return super.off(event, listener);
  }

  // Type-safe emit method
  public emit<E extends keyof EditorManagerEvents>(
    event: E,
    ...args: Parameters<EditorManagerEvents[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

export const editorService = new EditorManager();
