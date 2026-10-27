import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Use a JPEG, PNG or WEBP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller.';
  return null;
}

/**
 * Image picker with drag & drop and preview. It only selects a file; the parent uploads it.
 * `value` is the currently saved image URL; `file` is a newly picked file waiting to be uploaded.
 */
export const ImageUploader: React.FC<{
  value: string | null;
  file: File | null;
  removed: boolean;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ value, file, removed, onFileChange, onRemove, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = validateImageFile(f);
    setError(problem);
    if (!problem) onFileChange(f);
  };

  const shown = preview ?? (removed ? null : value);

  return (
    <div className="field">
      <span className="field-label">Product image</span>
      <div
        className={`image-drop ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) pick(e.dataTransfer.files[0]);
        }}
      >
        <div className="image-preview">{shown ? <img src={shown} alt="Product preview" /> : <ImagePlus size={28} />}</div>
        <div className="stack-sm grow">
          <div style={{ fontSize: 13.5 }}>
            {file ? (
              <>
                <strong>{file.name}</strong> <span className="muted">· {(file.size / 1024).toFixed(0)} KB, uploads when you save</span>
              </>
            ) : removed && value ? (
              <span className="muted">Image will be removed when you save.</span>
            ) : (
              <span className="muted">Drag an image here, or choose a file. JPEG, PNG or WEBP up to 5 MB.</span>
            )}
          </div>
          <div className="row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
              <Upload /> {shown ? 'Replace' : 'Choose image'}
            </button>
            {shown && (
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  if (file) onFileChange(null);
                  else onRemove();
                }}
              >
                <Trash2 /> Remove
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
};
