import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Images, Camera, X, Loader2 } from "lucide-react";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { useToast } from "@/hooks/use-toast";

interface PhotoUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  testIdPrefix: string;
  emptyHint?: string;
  aspect?: "square" | "wide";
}

/**
 * A single-photo upload control that offers both "Choose from Gallery" and
 * "Take Photo" on mobile browsers, backed by one presigned-URL upload flow.
 * Two separate <input type="file"> elements are used because a single input
 * can only carry one `capture` behavior — the gallery input omits `capture`
 * so the OS shows the normal file/photo picker, the camera input sets
 * `capture="environment"` so mobile browsers open the camera directly.
 */
export function PhotoUploadField({ value, onChange, label, testIdPrefix, emptyHint, aspect = "wide" }: PhotoUploadFieldProps) {
  const { toast } = useToast();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, error } = usePhotoUpload({
    onSuccess: (url) => onChange(url),
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadFile(file);
    if (!url) {
      toast({ title: "Upload failed", description: "Please try a different photo.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className={`relative w-full ${aspect === "square" ? "aspect-square max-w-[160px]" : "aspect-video"} bg-muted rounded-md overflow-hidden border border-border flex items-center justify-center`}>
        {value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-cover" data-testid={`img-${testIdPrefix}`} />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => onChange(null)}
              data-testid={`button-remove-${testIdPrefix}`}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center px-4">{emptyHint ?? "No photo yet"}</p>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-mono text-muted-foreground">Uploading…</span>
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
