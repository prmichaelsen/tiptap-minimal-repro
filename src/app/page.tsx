"use client";

import { useState } from "react";
import MarkdownEditor from "@/components/ui/MarkdownEditor";
import { editorService } from "@/lib/editorService";

export default function Home() {
  const [content, setContent] = useState("");
  const [showHTML, setShowHTML] = useState(false);

  const handleToggleBold = () => {
    editorService.toggleMark('bold');
  };

  const handleToggleItalic = () => {
    editorService.toggleMark('italic');
  };

  const handleToggleUnderline = () => {
    editorService.toggleMark('underline');
  };

  const handleToggleStrike = () => {
    editorService.toggleMark('strike');
  };

  const handleToggleCode = () => {
    editorService.toggleMark('code');
  };

  const handleIndent = () => {
    editorService.indent();
  };

  const handleOutdent = () => {
    editorService.outdent();
  };

  const isBoldActive = editorService.isMarkActive('bold');
  const isItalicActive = editorService.isMarkActive('italic');
  const isUnderlineActive = editorService.isMarkActive('underline');
  const isStrikeActive = editorService.isMarkActive('strike');
  const isCodeActive = editorService.isMarkActive('code');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 text-white px-6 py-4">
            <h1 className="text-2xl font-bold">TipTap Minimal Reproduction</h1>
            <p className="text-gray-300 mt-1">
              A minimal Next.js app demonstrating TipTap editor functionality
            </p>
          </div>

          {/* Toolbar */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleToggleBold}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isBoldActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Bold
              </button>
              <button
                onClick={handleToggleItalic}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isItalicActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Italic
              </button>
              <button
                onClick={handleToggleUnderline}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isUnderlineActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Underline
              </button>
              <button
                onClick={handleToggleStrike}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isStrikeActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Strike
              </button>
              <button
                onClick={handleToggleCode}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isCodeActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Code
              </button>
              <div className="border-l border-gray-300 mx-2"></div>
              <button
                onClick={handleOutdent}
                className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Outdent
              </button>
              <button
                onClick={handleIndent}
                className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Indent
              </button>
              <div className="border-l border-gray-300 mx-2"></div>
              <button
                onClick={() => setShowHTML(!showHTML)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  showHTML
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {showHTML ? "Hide HTML" : "Show HTML"}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="p-6">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="min-h-[400px] p-4">
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Start typing... Try pasting images, using keyboard shortcuts (Cmd/Ctrl+B, I, U), or drag and drop files!"
                  minHeight="350px"
                />
              </div>
            </div>
          </div>

          {/* HTML Output */}
          {showHTML && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">HTML Output:</h3>
              <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
                {content || "<p></p>"}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-blue-50">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">
              Test Instructions:
            </h3>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Try typing and using formatting buttons</li>
              <li>• Test keyboard shortcuts: Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Cmd/Ctrl+U (underline)</li>
              <li>• Paste images from clipboard</li>
              <li>• Drag and drop image/video files</li>
              <li>• Create lists and use indent/outdent</li>
              <li>• Test the custom mark handling behavior (toggle formatting without selection)</li>
              <li>• Try the link functionality (type text, select it, then add a link)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
