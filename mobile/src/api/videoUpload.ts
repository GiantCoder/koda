/**
 * Wraps POST /api/video/upload -- the real, working upload endpoint the web
 * dashboard's upload page uses (not /api/videos/upload/init, which sets up
 * a tus-style chunked session but has no handler for the actual chunk
 * upload -- dead/incomplete code on the backend, not used by any real
 * client). It creates the Video + Analysis rows and enqueues the
 * video-processing BullMQ job in one call.
 *
 * This needs its own request plumbing rather than apiFetch()/authFetch()
 * from ./client: it sends multipart/form-data (a video file), not JSON, and
 * upload progress needs XMLHttpRequest's `upload.onprogress` -- fetch() has
 * no equivalent. Mirrors the web upload page's own XHR-based approach.
 */
import { getAccessToken } from "./tokenStore";
import { refreshAccessToken, API_BASE_URL, ApiError } from "./client";

export interface VideoUploadResult {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  size: number;
  assignedUserId: string;
  analysisId: string;
  status: string;
}

export interface UploadVideoParams {
  /** file:// URI from expo-image-picker (camera or library). */
  fileUri: string;
  fileName: string;
  mimeType: string;
  /** Coach assigning to a squad player, or parent to a linked child. Omit
   * for a player uploading their own video, or a coach leaving it
   * unassigned (defaults to the coach themselves, same as web). */
  assigneeUserId?: string;
  onProgress?: (percent: number) => void;
}

function sendUpload(params: UploadVideoParams, accessToken: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/video/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-koda-client", "mobile");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !params.onProgress) return;
      params.onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Upload failed -- check your connection and try again."));

    const formData = new FormData();
    // React Native's FormData accepts this {uri,name,type} shape in place of
    // a Blob for file fields -- see https://reactnative.dev/docs/network#multipart-form-data
    formData.append("file", {
      uri: params.fileUri,
      name: params.fileName,
      type: params.mimeType,
    } as unknown as Blob);
    formData.append("title", params.fileName);
    if (params.assigneeUserId) {
      formData.append("assigneeUserId", params.assigneeUserId);
    }
    xhr.send(formData);
  });
}

export async function uploadVideo(params: UploadVideoParams): Promise<VideoUploadResult> {
  let accessToken = getAccessToken();
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) {
    throw new ApiError("You've been signed out. Please sign in again.", 401);
  }

  let result = await sendUpload(params, accessToken);

  if (result.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    result = await sendUpload(params, refreshed);
  }

  if (result.status < 200 || result.status >= 300) {
    let message = `Upload failed with status ${result.status}`;
    try {
      const parsed = JSON.parse(result.body) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // non-JSON error body -- keep the generic message
    }
    throw new ApiError(message, result.status);
  }

  return JSON.parse(result.body) as VideoUploadResult;
}
