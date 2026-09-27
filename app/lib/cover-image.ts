export const COVER_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/jpg"];

export function getCoverSrc(entity: {
  bannerImageUrl?: string | null;
  bannerFileName?: string | null;
}): string | null {
  if (entity.bannerImageUrl) return entity.bannerImageUrl;
  if (entity.bannerFileName) return `/avatars/${entity.bannerFileName}`;
  return null;
}

export function validateCoverImage(file: File): string | null {
  if (!COVER_ACCEPTED_TYPES.includes(file.type)) {
    return "Only PNG, JPG/JPEG, or SVG files are supported.";
  }
  if (file.size > COVER_MAX_BYTES) {
    return "File size must be 2MB or less.";
  }
  return null;
}

export function readCoverImage(file: File): Promise<{ fileName: string; dataUrl: string }> {
  const validationError = validateCoverImage(file);
  if (validationError) return Promise.reject(new Error(validationError));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error("Unable to read selected file."));
        return;
      }
      resolve({ fileName: file.name, dataUrl });
    };
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}
