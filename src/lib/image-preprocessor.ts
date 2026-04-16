/**
 * Image preprocessing utilities for better OCR accuracy
 */

export interface PreprocessingOptions {
  autoRotate?: boolean;
  enhanceContrast?: boolean;
  adjustBrightness?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Convert File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocess image for better OCR accuracy
 */
export async function preprocessImage(
  file: File,
  options: PreprocessingOptions = {}
): Promise<string> {
  const {
    autoRotate = true,
    enhanceContrast = true,
    adjustBrightness = true,
    maxWidth = 1920,
    maxHeight = 1920,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Apply enhancements
        if (enhanceContrast || adjustBrightness) {
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            // Enhance contrast
            if (enhanceContrast) {
              const factor = 1.2;
              data[i] = ((data[i] - 128) * factor) + 128;     // R
              data[i + 1] = ((data[i + 1] - 128) * factor) + 128; // G
              data[i + 2] = ((data[i + 2] - 128) * factor) + 128; // B
            }

            // Adjust brightness
            if (adjustBrightness) {
              const brightness = 10;
              data[i] = Math.min(255, data[i] + brightness);     // R
              data[i + 1] = Math.min(255, data[i + 1] + brightness); // G
              data[i + 2] = Math.min(255, data[i + 2] + brightness); // B
            }

            // Clamp values
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
          }

          ctx.putImageData(imageData, 0, 0);
        }

        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.95);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Detect and correct image rotation
 */
export async function detectRotation(base64Image: string): Promise<number> {
  // Simple heuristic: assume text should be horizontal
  // This is a placeholder - could be enhanced with ML
  return 0;
}

/**
 * Crop image to relevant area
 */
export async function cropToContent(
  base64Image: string,
  padding: number = 20
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Find content boundaries
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

            // If pixel is not white (content detected)
            if (brightness < 250) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Add padding
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(canvas.width, maxX + padding);
        maxY = Math.min(canvas.height, maxY + padding);

        // Create cropped canvas
        const croppedWidth = maxX - minX;
        const croppedHeight = maxY - minY;
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        if (!croppedCtx) {
          resolve(base64Image); // Return original if cropping fails
          return;
        }

        croppedCanvas.width = croppedWidth;
        croppedCanvas.height = croppedHeight;
        croppedCtx.drawImage(
          canvas,
          minX, minY, croppedWidth, croppedHeight,
          0, 0, croppedWidth, croppedHeight
        );

        resolve(croppedCanvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        resolve(base64Image); // Return original on error
      }
    };

    img.onerror = () => resolve(base64Image);
    img.src = base64Image;
  });
}
