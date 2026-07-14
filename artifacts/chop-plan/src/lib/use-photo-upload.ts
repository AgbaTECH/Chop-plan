import { useCallback, useState } from "react";
import { useRequestUploadUrl } from "@workspace/api-client-react";

// Keep this in sync with MAX_UPLOAD_BYTES in artifacts/api-server/src/routes/storage.ts —
// this is a UX nicety (fail fast, before spending a round trip), the server
// enforces the real limit.
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB

interface UsePhotoUploadOptions {
  onSuccess?: (servedUrl: string) => void;
}

/**
 * Uploads a single image file through the presigned-URL flow:
 * 1. POST /api/storage/uploads/request-url (via the generated, auth-aware client)
 * 2. PUT the file bytes directly to the returned presigned GCS URL
 *
 * Resolves to a fully-servable path (e.g. "/api/storage/objects/uploads/<uuid>")
 * that can be saved straight into a DB field and rendered with a plain <img src>.
 */
export function usePhotoUpload(options: UsePhotoUploadOptions = {}) {
  const requestUploadUrl = useRequestUploadUrl();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return null;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`That photo is too large. Max size is ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))}MB.`);
        return null;
      }

      setIsUploading(true);
      try {
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
        });

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!putRes.ok) {
          throw new Error("Failed to upload photo to storage");
        }

        const servedUrl = `/api/storage${objectPath}`;
        options.onSuccess?.(servedUrl);
        return servedUrl;
      } catch (err: any) {
        setError(err?.error ?? err?.message ?? "Upload failed. Please try again.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, options]
  );

  return { uploadFile, isUploading, error, setError };
}
