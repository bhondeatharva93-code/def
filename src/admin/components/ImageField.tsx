import React, { useRef, useState } from 'react';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../../config/images';

interface ImageFieldProps {
  img: string;
  images: string[];
  error?: string;
  onChange: (nextImg: string, nextImages: string[]) => void;
}

export function ImageField({ img, images, error, onChange }: ImageFieldProps) {
  const cloudinaryReady = isCloudinaryConfigured();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const mainFileRef = useRef<HTMLInputElement | null>(null);
  const extraFileRef = useRef<HTMLInputElement | null>(null);

  const extraUrlsText = images.filter((u) => u && u !== img).join('\n');

  const handleMainUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadImageToCloudinary(file);
      const nextExtra = [url, ...images.filter((u) => u !== url)];
      onChange(url, nextExtra);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleExtraUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadImageToCloudinary(file);
      const next = Array.from(new Set([...(img ? [img] : []), ...images, url])).filter(Boolean);
      onChange(img || url, next);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cg-field cg-field--full">
      <label htmlFor="cg-field-img">Main image URL</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          id="cg-field-img"
          type="url"
          className="cg-input"
          style={{ flex: '1 1 16rem' }}
          placeholder="https://... or /src/assets/images/..."
          value={img}
          onChange={(e) => {
            const val = e.target.value;
            const others = images.filter((u) => u !== img && u !== val);
            onChange(val, val.trim() ? [val.trim(), ...others] : others);
          }}
        />
        {cloudinaryReady && (
          <>
            <input
              ref={mainFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleMainUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="cg-btn"
              disabled={uploading}
              onClick={() => mainFileRef.current?.click()}
            >
              {uploading ? 'Compressing & uploading...' : 'Upload image'}
            </button>
          </>
        )}
      </div>

      {!cloudinaryReady && (
        <span className="cg-field-hint">
          Paste any hosted or store image URL above. To enable direct browser uploads (auto-resized to 1200px WebP), add your Cloudinary cloud name and unsigned preset in <code>src/config/images.ts</code>.
        </span>
      )}

      {error && <span className="cg-field-err">{error}</span>}
      {uploadError && <span className="cg-field-err">{uploadError}</span>}

      <div className="cg-field" style={{ marginTop: '0.5rem' }}>
        <label htmlFor="cg-field-images">Extra gallery image URLs (one per line)</label>
        <textarea
          id="cg-field-images"
          className="cg-textarea"
          style={{ minHeight: '4rem' }}
          placeholder="Optional extra angles, one URL per line"
          value={extraUrlsText}
          onChange={(e) => {
            const extras = e.target.value
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean);
            const combined = Array.from(new Set([...(img.trim() ? [img.trim()] : []), ...extras]));
            onChange(img, combined);
          }}
        />
        {cloudinaryReady && (
          <div>
            <input
              ref={extraFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleExtraUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="cg-btn cg-btn--sm"
              disabled={uploading}
              onClick={() => extraFileRef.current?.click()}
            >
              Upload extra gallery image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
