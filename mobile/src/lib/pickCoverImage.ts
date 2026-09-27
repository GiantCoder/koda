import * as ImagePicker from "expo-image-picker";

const MAX_BYTES = 2 * 1024 * 1024;

export async function pickCoverImage(): Promise<{ fileName: string; dataUrl: string } | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library access is needed to choose a background.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error("File size must be 2MB or less.");
  }
  if (!asset.base64) {
    throw new Error("Unable to read selected file.");
  }

  const mime = asset.mimeType ?? "image/jpeg";
  return {
    fileName: asset.fileName ?? "background.jpg",
    dataUrl: `data:${mime};base64,${asset.base64}`,
  };
}
