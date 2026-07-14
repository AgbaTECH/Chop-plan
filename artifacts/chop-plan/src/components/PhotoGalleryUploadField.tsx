import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Images, Camera, X, Loader2 } from "lucide-react";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { useToast } from "@/hooks/use-toast";

interface PhotoGalleryUploadFieldProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  testIdPrefix: string;
}

/**
 * Multi-photo upload control for the vendor's kitchen photo gallery. Reuses
 * the same presigned-URL upload flow as PhotoUploadField, but appends each
 * newly uploaded photo to a list instead of replacing a single value.
 */
export function PhotoGalleryUploadField({ photos, onChange, testIdPrefix }: PhotoGalleryUploadFieldProps) {
  const { toast } = useToast();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, error } = usePhotoUpload({
    onSuccess: (url) => onChange([...photos, url]),
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadFile(file);
    if (!url) {
      toast({ title: "Upload failed", description: "Please try a different photo.", variant: "destructive" });
    }
  };

  const removeAt = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div key={`${url}-${i}`} className="relative aspect-square bg-muted rounded-md overflow-hidden border border-border">
            <img src={url} alt={`Kitchen photo ${i + 1}`} className="w-full h-full object-cover" data-testid={`img-${testIdPrefix}-${i}`} />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => removeAt(i)}
              data-testid={`button-remove-${testIdPrefix}-${i}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {isUploading && (
          <div className="aspect-square rounded-md border border-dashed border-border flex items-center justify-center bg-muted/40">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="font-mono" disabled={isUploading} onClick={() => galleryInputRef.current?.click()} data-testid={`button-gallery-${testIdPrefix}`}>
          <Images className="w-3.5 h-3.5 mr-1.5" /> Choose from Gallery
        </Button>
        <Button type="button" variant="outline" size="sm" className="font-mono" disabled={isUploading} onClick={() => cameraInputRef.current?.click()} data-testid={`button-camera-${testIdPrefix}`}>
          <Camera className="w-3.5 h-3.5 mr-1.5" /> Take Photo
        </Button>
      </div>

      {error && <p className="text-xs text-destructive" data-testid={`text-error-${testIdPrefix}`}>{error}</p>}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
