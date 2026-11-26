/* Cloudinary unsigned image upload configuration.
   Leave empty to use URL inputs only; fill both with your Cloudinary unsigned upload settings
   when ready to enable direct browser uploads (never commit API secrets here). */
export const CLOUDINARY_CLOUD_NAME = '';
export const CLOUDINARY_UPLOAD_PRESET = '';

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME.trim() && CLOUDINARY_UPLOAD_PRESET.trim());
}

/**
 * Resize and compress an image File in the browser to max 1200px (longest side) WebP.
 */
export async function compressImageToWebp(file: File, maxDimension = 1200, quality = 0.84): Promise<Blob> {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/webp', quality);
    });
    return blob || file;
  } finally {
    bitmap.close();
  }
}

/**
 * Upload an image file to Cloudinary using unsigned preset after resizing to <= 1200px WebP.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary upload is not configured. Enter an image URL instead.');
  }

  const processed = await compressImageToWebp(file, 1200, 0.84);
  const form = new FormData();
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product';
  form.append('file', processed, `${baseName}.webp`);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET.trim());

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME.trim())}/image/upload`;
  const response = await fetch(endpoint, { method: 'POST', body: form });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Image upload failed (${response.status}): ${errText || 'Check Cloudinary preset.'}`);
  }
  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error('Cloudinary did not return an image URL.');
  }
  return payload.secure_url;
}
