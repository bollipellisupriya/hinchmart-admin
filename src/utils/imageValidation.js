const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Image file validation helper
 * Validates image format (JPEG, PNG, WebP, GIF, SVG) and max 15MB file size
 */
export const validateImageFile = (file) => new Promise((resolve) => {
  if (!file) {
    resolve("Please select a valid image file.");
    return;
  }

  // Accept standard image formats
  if (!file.type.startsWith("image/")) {
    resolve("Please select a valid image file (JPEG, PNG, WebP, etc.).");
    return;
  }

  // Enforce 15 MB maximum file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    resolve("Image size exceeds the maximum allowed limit of 15 MB.");
    return;
  }

  resolve("");
});
