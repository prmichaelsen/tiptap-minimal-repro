/**
 * Utility functions for handling clipboard operations with images
 */

/**
 * Convert a File object to a data URL
 */
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Convert a data URL to a Blob
 */
export const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Check if clipboard contains image files
 */
export const hasImageInClipboard = (clipboardData: DataTransfer): boolean => {
  if (!clipboardData || !clipboardData.files) return false;

  for (let i = 0; i < clipboardData.files.length; i++) {
    const file = clipboardData.files[i];
    if (file.type.startsWith("image/")) {
      return true;
    }
  }
  return false;
};

/**
 * Get the first image file from clipboard
 */
export const getImageFromClipboard = (
  clipboardData: DataTransfer
): File | null => {
  if (!clipboardData || !clipboardData.files) return null;

  for (let i = 0; i < clipboardData.files.length; i++) {
    const file = clipboardData.files[i];
    if (file.type.startsWith("image/")) {
      return file;
    }
  }
  return null;
};

/**
 * Copy an image to clipboard
 */
export const copyImageToClipboard = async (
  imageUrl: string
): Promise<boolean> => {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Check if the browser supports clipboard API
    if (!navigator.clipboard || !navigator.clipboard.write) {
      // Fallback: try to copy the image URL as text
      await navigator.clipboard.writeText(imageUrl);
      return true;
    }

    // Create clipboard item
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob,
    });

    // Write to clipboard
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.error("Failed to copy image to clipboard:", error);

    // Fallback: try to copy the image URL as text
    try {
      await navigator.clipboard.writeText(imageUrl);
      return true;
    } catch (fallbackError) {
      console.error("Failed to copy image URL to clipboard:", fallbackError);
      return false;
    }
  }
};

/**
 * Check if the browser supports clipboard image operations
 */
export const supportsClipboardImages = (): boolean => {
  return !!(
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    navigator.clipboard.read
  );
};

/**
 * Read image from clipboard
 */
export const readImageFromClipboard = async (): Promise<string | null> => {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      return null;
    }

    const clipboardItems = await navigator.clipboard.read();

    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith("image/")) {
          const blob = await clipboardItem.getType(type);
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to read image from clipboard:", error);
    return null;
  }
};
