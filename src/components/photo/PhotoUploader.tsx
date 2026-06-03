import { useState, useRef } from 'react';
import { Camera, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PhotoUploaderProps {
  /** Sub-folder under user-id, e.g. "food" / "workout" / "recipe". */
  scope: string;
  /** Current photo URL (if editing) — shows existing image, allows replace/remove. */
  value?: string | null;
  /** Called with the public URL after successful upload, or null on remove. */
  onChange: (url: string | null) => void;
  className?: string;
}

const MAX_DIMENSION = 1080; // resize so the long edge is at most 1080 px
const JPEG_QUALITY = 0.85;

/**
 * Photo uploader for the photos bucket. Resizes the file in-browser before upload
 * (canvas → JPEG @ q=0.85, max long-edge 1080 px) so we don't waste Storage quota
 * on 12MP iPhone photos. Files are stored under `<auth.uid()>/<scope>/<random>.jpg`
 * which the storage RLS policy uses to scope writes.
 */
export function PhotoUploader({ scope, value, onChange, className }: PhotoUploaderProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    if (!user) {
      setError('Sign in required.');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(10);

    try {
      // 1. Resize and re-encode.
      const resized = await resizeImage(file, MAX_DIMENSION, JPEG_QUALITY);
      setProgress(50);

      // 2. Build a path that the RLS policy will accept.
      const ext = 'jpg';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${scope}/${filename}`;

      // 3. Upload to the photos bucket with cacheControl and content-type.
      const { error: uploadErr } = await supabase.storage
        .from('photos')
        .upload(path, resized, {
          cacheControl: '31536000', // 1 year
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadErr) {
        // Surface a friendly message for the most common failure mode.
        if (uploadErr.message?.toLowerCase().includes('row-level security')) {
          throw new Error('Upload blocked by storage policy. Tell the developer the photos RLS isn\'t set up.');
        }
        throw uploadErr;
      }
      setProgress(90);

      // 4. Resolve to public URL.
      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      setProgress(100);
      onChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className={className ?? ''}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          // Reset so picking the same file twice still triggers onChange.
          e.target.value = '';
        }}
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className="h-32 w-32 rounded-lg object-cover border border-border"
            loading="lazy"
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove photo"
            className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-md hover:opacity-90"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-card text-muted-foreground hover:bg-secondary/30 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{progress}%</span>
            </>
          ) : (
            <>
              <Camera className="h-6 w-6" />
              <span className="text-xs">Add photo</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-2 max-w-[18rem] text-xs text-destructive flex items-start gap-1">
          <ImageIcon className="h-3 w-3 mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/**
 * Resize an image File to a Blob whose long edge is at most `maxDim`, encoded as JPEG at
 * `quality`. Returns the original file unchanged if it's already small enough.
 *
 * Implementation notes: uses ImageBitmap for fast decoding when supported, falling back
 * to <img> + canvas. EXIF orientation is preserved on Safari via createImageBitmap's
 * `imageOrientation: 'from-image'` — older browsers may sideways-rotate iPhone photos.
 */
async function resizeImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  // Decode the image.
  const bitmap = await (async () => {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        /* fall through to <img> path */
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  })();

  const srcW = 'width' in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const srcH = 'height' in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;

  // If already within limit and small enough on disk, return as-is.
  if (srcW <= maxDim && srcH <= maxDim && file.size < 500 * 1024 && file.type === 'image/jpeg') {
    return file;
  }

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, dstW, dstH);
  } finally {
    // Free GPU/canvas memory held by the ImageBitmap. <img> elements GC themselves so we
    // only need this branch when we got a real ImageBitmap from createImageBitmap().
    if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
      (bitmap as ImageBitmap).close();
    }
  }

  // toBlob returns null if encoding fails — wrap for typed safety.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode resized image.'))),
      'image/jpeg',
      quality,
    );
  });
}
