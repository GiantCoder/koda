from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import mediapipe as mp
import cv2
import numpy as np
import base64
import time

app = FastAPI(title="Koda Cricket MediaPipe Service", version="1.0.0")

mp_pose = mp.solutions.pose


class VideoMetadata(BaseModel):
    width: int
    height: int
    fps: float
    cameraDistance: Optional[str] = "17-22m"
    cameraAngle: Optional[str] = "behind_stumps"


class PoseRequest(BaseModel):
    frames: List[str]
    frameCount: int
    videoMetadata: VideoMetadata


class FrameLandmarks(BaseModel):
    frameIndex: int
    timestamp: float
    keypoints: dict
    poseConfidence: float


class PoseResponse(BaseModel):
    landmarks: List[FrameLandmarks]
    batsman_bbox: Optional[dict]
    processingMs: int


POSE_LANDMARK_NAMES = [
    "nose", "leftEyeInner", "leftEye", "leftEyeOuter",
    "rightEyeInner", "rightEye", "rightEyeOuter",
    "leftEar", "rightEar", "mouthLeft", "mouthRight",
    "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
    "leftWrist", "rightWrist", "leftPinky", "rightPinky",
    "leftIndex", "rightIndex", "leftThumb", "rightThumb",
    "leftHip", "rightHip", "leftKnee", "rightKnee",
    "leftAnkle", "rightAnkle", "leftHeel", "rightHeel",
    "leftFootIndex", "rightFootIndex"
]


def decode_frame(b64_string: str) -> np.ndarray:
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def detect_batsman_bbox(frame: np.ndarray) -> Optional[dict]:
    h, w = frame.shape[:2]
    return {"x": int(w * 0.35), "y": int(h * 0.05), "w": int(w * 0.35), "h": int(h * 0.90)}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mediapipe"}


@app.post("/pose", response_model=PoseResponse)
async def estimate_pose(request: PoseRequest):
    start_time = time.time()
    results_list = []
    batsman_bbox = None

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:
        for idx, b64_frame in enumerate(request.frames):
            try:
                frame = decode_frame(b64_frame)

                if idx == 0 or batsman_bbox is None:
                    batsman_bbox = detect_batsman_bbox(frame)

                if batsman_bbox:
                    x, y, w, h = batsman_bbox["x"], batsman_bbox["y"], batsman_bbox["w"], batsman_bbox["h"]
                    cropped = frame[y:y+h, x:x+w]
                else:
                    cropped = frame

                rgb_frame = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb_frame)

                if result.pose_landmarks:
                    keypoints = {}
                    visibility_sum = 0
                    for i, landmark in enumerate(result.pose_landmarks.landmark):
                        name = POSE_LANDMARK_NAMES[i] if i < len(POSE_LANDMARK_NAMES) else f"point_{i}"
                        keypoints[name] = {
                            "x": round(landmark.x, 4),
                            "y": round(landmark.y, 4),
                            "z": round(landmark.z, 4),
                            "visibility": round(landmark.visibility, 4)
                        }
                        visibility_sum += landmark.visibility

                    avg_confidence = visibility_sum / len(result.pose_landmarks.landmark)
                    if avg_confidence >= 0.5:
                        results_list.append(
                            FrameLandmarks(
                                frameIndex=idx,
                                timestamp=round(idx / request.videoMetadata.fps, 3),
                                keypoints=keypoints,
                                poseConfidence=round(avg_confidence, 3)
                            )
                        )
            except Exception:
                continue

    processing_ms = int((time.time() - start_time) * 1000)
    if not results_list:
        raise HTTPException(status_code=422, detail="No valid pose data extracted from frames")

    return PoseResponse(
        landmarks=results_list,
        batsman_bbox=batsman_bbox,
        processingMs=processing_ms
    )
