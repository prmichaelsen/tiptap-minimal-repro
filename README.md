# TipTap Minimal Reproduction

A minimal Next.js application demonstrating TipTap editor functionality, specifically focusing on the custom mark handling behavior and editor service architecture.

## Features

This minimal reproduction includes:

- **TipTap Editor Integration**: Full-featured rich text editor with TipTap
- **Custom Mark Handling**: Special behavior for formatting marks (bold, italic, underline) without text selection
- **Image/Video Support**: Drag & drop and paste functionality for media files
- **Keyboard Shortcuts**: Standard formatting shortcuts (Cmd/Ctrl+B, I, U)
- **Editor Service**: Centralized editor management with event handling
- **Server-Side Rendering**: Proper SSR handling for the editor

## Key Components

### Editor Service (`src/lib/editorService.ts`)
- Centralized editor management
- Custom mark handling for empty selections
- Event-driven architecture
- Client-side only initialization to avoid SSR issues

### Markdown Editor (`src/components/ui/MarkdownEditor.tsx`)
- React component wrapper for TipTap
- Handles client-side rendering
- Upload state management
- Proper null checks for SSR compatibility

### Custom Extensions
- `EditableImageExtension`: Custom image handling with upload states
- `EditableVideoExtension`: Custom video handling with upload states
- `clipboard-utils`: Utilities for handling clipboard operations

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing the Reproduction

The application includes comprehensive test instructions on the main page:

- Try typing and using formatting buttons
- Test keyboard shortcuts: Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic), Cmd/Ctrl+U (underline)
- Paste images from clipboard
- Drag and drop image/video files
- Create lists and use indent/outdent
- Test the custom mark handling behavior (toggle formatting without selection)
- Try the link functionality

## Key Implementation Details

### Custom Mark Handling
The editor service implements special behavior for formatting marks when there's no text selection. This allows users to toggle formatting states (like bold or italic) and have them apply to subsequent typing, with visual feedback in the toolbar.

### SSR Compatibility
The editor is initialized only on the client side to avoid server-side rendering issues with DOM-dependent TipTap functionality.

### Event-Driven Architecture
The editor service uses EventEmitter to communicate state changes to React components, enabling reactive UI updates.

## Dependencies

- Next.js 14.2.30
- TipTap 3.0.0 (React integration)
- React 18.3.1
- TypeScript
- Tailwind CSS
- UUID for unique identifiers

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/ui/
│   ├── MarkdownEditor.tsx  # Main editor component
│   ├── EditableImageExtension.tsx
│   ├── EditableVideoExtension.tsx
│   └── LoadingSpinner.tsx
└── lib/
    ├── editorService.ts    # Centralized editor management
    └── clipboard-utils.ts  # Clipboard handling utilities
```

This minimal reproduction maintains all the core TipTap functionality while removing application-specific logic, making it ideal for debugging and testing TipTap-related issues.
