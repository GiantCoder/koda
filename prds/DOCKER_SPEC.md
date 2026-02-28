# Koda Cricket — Docker Compose MVP Spec
**Version:** 1.0.0  
**Environment:** Local Development  
**Target:** Docker Desktop (Mac/Windows) or Docker Engine (Linux)

---

## 1. Services Overview

| Service | Image | Port(s) | Description |
|---|---|---|---|
| `app` | Custom (Next.js) | 3000 | Next.js 14 App Router (API + SSR) |
| `worker` | Custom (Node.js) | — | BullMQ worker process |
| `mediapipe` | Custom (Python/FastAPI) | 8001 | MediaPipe pose estimation service |
| `mysql` | mysql:8.0 | 3306 | Primary database |
| `redis` | redis:7-alpine | 6379 | BullMQ queues + session cache |
| `minio` | minio/minio | 9000, 9001 | S3-compatible object storage |
| `langfuse` | langfuse/langfuse | 3100 | LLM prompt tracking UI |
| `langfuse-db` | postgres:15 | 5433 | LangFuse's own Postgres |
| `mailpit` | axllent/mailpit | 8025, 1025 | Local SMTP + email preview UI |
| `bullboard` | — | 3001 | BullMQ queue monitor (built into worker) |

---

## 2. docker-compose.yml

```yaml
version: '3.9'

services:

  # ─── Application ──────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: koda_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://koda:secret@mysql:3306/kodacricket
      - REDIS_URL=redis://redis:6379
      - STORAGE_ENDPOINT=http://minio:9000
      - STORAGE_ACCESS_KEY=minioadmin
      - STORAGE_SECRET_KEY=minioadmin
      - STORAGE_BUCKET_VIDEOS=koda-videos
      - STORAGE_BUCKET_ASSETS=koda-assets
      - STORAGE_PUBLIC_URL=http://localhost:9000
      - MEDIAPIPE_SERVICE_URL=http://mediapipe:8001
      - SMTP_HOST=mailpit
      - SMTP_PORT=1025
      - LANGFUSE_HOST=http://langfuse:3100
    env_file:
      - .env.local
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - koda_network
    command: npm run dev

  # ─── BullMQ Worker ────────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    container_name: koda_worker
    ports:
      - "3001:3001"       # BullBoard UI
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://koda:secret@mysql:3306/kodacricket
      - REDIS_URL=redis://redis:6379
      - STORAGE_ENDPOINT=http://minio:9000
      - STORAGE_ACCESS_KEY=minioadmin
      - STORAGE_SECRET_KEY=minioadmin
      - MEDIAPIPE_SERVICE_URL=http://mediapipe:8001
      - SMTP_HOST=mailpit
      - SMTP_PORT=1025
    env_file:
      - .env.local
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - koda_network
    command: npm run worker:dev

  # ─── MediaPipe Python Service ──────────────────────────────────
  mediapipe:
    build:
      context: ./services/mediapipe
      dockerfile: Dockerfile
    container_name: koda_mediapipe
    ports:
      - "8001:8001"
    environment:
      - PYTHONUNBUFFERED=1
      - MODEL_COMPLEXITY=1       # 0=lite, 1=full, 2=heavy
      - ENABLE_SEGMENTATION=false
      - MIN_DETECTION_CONFIDENCE=0.5
      - MIN_TRACKING_CONFIDENCE=0.5
    volumes:
      - ./services/mediapipe:/app
      - mediapipe_models:/app/models   # cache downloaded models
    networks:
      - koda_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s   # allow time for model download

  # ─── MySQL ────────────────────────────────────────────────────
  mysql:
    image: mysql:8.0
    container_name: koda_mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootsecret
      MYSQL_DATABASE: kodacricket
      MYSQL_USER: koda
      MYSQL_PASSWORD: secret
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - koda_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "koda", "-psecret"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --default-authentication-plugin=mysql_native_password

  # ─── Redis ────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: koda_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - koda_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

  # ─── MinIO (S3-compatible storage) ────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: koda_minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console UI
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    networks:
      - koda_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 10
    command: server /data --console-address ":9001"

  # ─── MinIO Init (create buckets) ──────────────────────────────
  minio-init:
    image: minio/mc:latest
    container_name: koda_minio_init
    depends_on:
      minio:
        condition: service_healthy
    networks:
      - koda_network
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/koda-videos;
      mc mb --ignore-existing local/koda-assets;
      mc mb --ignore-existing local/koda-exports;
      mc anonymous set download local/koda-assets;
      echo 'MinIO buckets initialised';
      "

  # ─── LangFuse (LLM observability) ─────────────────────────────
  langfuse:
    image: langfuse/langfuse:latest
    container_name: koda_langfuse
    ports:
      - "3100:3000"
    environment:
      DATABASE_URL: postgresql://langfuse:langfuse@langfuse-db:5432/langfuse
      NEXTAUTH_SECRET: langfuse-dev-secret-change-in-prod
      NEXTAUTH_URL: http://localhost:3100
      SALT: langfuse-salt-change-in-prod
      TELEMETRY_ENABLED: "false"
    depends_on:
      langfuse-db:
        condition: service_healthy
    networks:
      - koda_network

  langfuse-db:
    image: postgres:15-alpine
    container_name: koda_langfuse_db
    environment:
      POSTGRES_USER: langfuse
      POSTGRES_PASSWORD: langfuse
      POSTGRES_DB: langfuse
    volumes:
      - langfuse_db_data:/var/lib/postgresql/data
    networks:
      - koda_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U langfuse"]
      interval: 10s
      timeout: 5s
      retries: 10

  # ─── Mailpit (local email preview) ────────────────────────────
  mailpit:
    image: axllent/mailpit:latest
    container_name: koda_mailpit
    ports:
      - "8025:8025"   # Web UI
      - "1025:1025"   # SMTP
    networks:
      - koda_network

# ─── Networks ───────────────────────────────────────────────────
networks:
  koda_network:
    driver: bridge

# ─── Volumes ────────────────────────────────────────────────────
volumes:
  mysql_data:
  redis_data:
  minio_data:
  langfuse_db_data:
  mediapipe_models:
```

---

## 3. Dockerfiles

### 3.1 Next.js App & Worker Dockerfile

```dockerfile
# Dockerfile (project root)

# ─── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat curl
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ─── Development ──────────────────────────────────────────────
FROM base AS development
COPY . .
EXPOSE 3000 3001
# CMD set per service in docker-compose

# ─── Builder ──────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN npm run build

# ─── Production Runner ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3.2 MediaPipe Python Dockerfile

```dockerfile
# services/mediapipe/Dockerfile

FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
```

### 3.3 MediaPipe requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
mediapipe==0.10.9
opencv-python-headless==4.9.0.80
numpy==1.26.3
Pillow==10.2.0
python-multipart==0.0.9
httpx==0.26.0
pydantic==2.5.3
```

---

## 4. MediaPipe FastAPI Service

```python
# services/mediapipe/main.py

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
    frames: List[str]           # base64-encoded JPEG frames
    frameCount: int
    videoMetadata: VideoMetadata

class Keypoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: float

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
    """
    Simple heuristic: detect largest person-like contour in frame.
    In production, replace with a proper person detector (e.g. YOLOv8).
    """
    h, w = frame.shape[:2]
    # Placeholder: assume batsman is in centre-right of frame
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
                
                # Detect and crop to batsman region
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
                        results_list.append(FrameLandmarks(
                            frameIndex=idx,
                            timestamp=round(idx / request.videoMetadata.fps, 3),
                            keypoints=keypoints,
                            poseConfidence=round(avg_confidence, 3)
                        ))
            except Exception as e:
                # Skip problematic frames
                continue
    
    processing_ms = int((time.time() - start_time) * 1000)
    
    if not results_list:
        raise HTTPException(status_code=422, detail="No valid pose data extracted from frames")
    
    return PoseResponse(
        landmarks=results_list,
        batsman_bbox=batsman_bbox,
        processingMs=processing_ms
    )
```

---

## 5. Project File Structure

```
koda-cricket/
├── docker-compose.yml
├── Dockerfile
├── .env.local.example
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (onboarding)/
│   │   ├── layout.tsx
│   │   ├── role/page.tsx
│   │   ├── verify/page.tsx
│   │   ├── consent/page.tsx
│   │   ├── verify-consent/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── profile/page.tsx
│   ├── dashboard/page.tsx
│   ├── upload/page.tsx
│   ├── analysis/
│   │   ├── [videoId]/page.tsx
│   │   └── [videoId]/processing/page.tsx
│   ├── progress/page.tsx
│   ├── team/page.tsx
│   ├── training/page.tsx
│   ├── messages/
│   │   └── [[...conversationId]]/page.tsx
│   └── settings/page.tsx
├── app/api/                      # API Route Handlers
│   ├── auth/
│   │   ├── register/route.ts
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── refresh/route.ts
│   │   └── oauth/
│   │       ├── google/route.ts
│   │       └── apple/route.ts
│   ├── onboarding/
│   │   ├── consent/route.ts
│   │   └── privacy/route.ts
│   ├── videos/
│   │   ├── route.ts
│   │   ├── upload/
│   │   │   └── init/route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── stream/route.ts
│   ├── analysis/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       ├── stream/route.ts
│   │       ├── annotations/route.ts
│   │       └── report/route.ts
│   ├── users/
│   │   └── me/route.ts
│   ├── conversations/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── messages/route.ts
│   │       └── read/route.ts
│   ├── progress/
│   │   └── [userId]/route.ts
│   ├── squads/route.ts
│   ├── sessions/route.ts
│   └── health/route.ts
├── src/
│   ├── components/               # React components (see Frontend PRD)
│   ├── store/                    # Redux store
│   ├── hooks/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── storage.ts
│   │   ├── auth.ts
│   │   ├── llm/
│   │   │   ├── router.ts
│   │   │   ├── gemini.ts
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   └── prompts/
│   │   └── email/
│   └── types/
├── workers/
│   ├── index.ts                  # BullBoard + worker bootstrap
│   ├── videoWorker.ts
│   ├── analysisWorker.ts
│   ├── emailWorker.ts
│   └── reportWorker.ts
├── docker/
│   └── mysql/
│       └── init.sql
└── services/
    └── mediapipe/
        ├── Dockerfile
        ├── requirements.txt
        └── main.py
```

---

## 6. Makefile / Scripts

```makefile
# Makefile

.PHONY: up down build logs shell db-migrate db-seed db-reset test

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

shell:
	docker compose exec app sh

db-migrate:
	docker compose exec app npx prisma migrate dev

db-seed:
	docker compose exec app npx prisma db seed

db-reset:
	docker compose exec app npx prisma migrate reset --force

db-studio:
	docker compose exec app npx prisma studio

test:
	docker compose exec app npm test

test-coverage:
	docker compose exec app npm run test:coverage

install:
	docker compose exec app npm install

generate-prisma:
	docker compose exec app npx prisma generate

open-langfuse:
	open http://localhost:3100

open-mailpit:
	open http://localhost:8025

open-minio:
	open http://localhost:9001

open-bullboard:
	open http://localhost:3001

status:
	docker compose ps
```

---

## 7. Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/koda-cricket.git
cd koda-cricket

# 2. Copy env file
cp .env.local.example .env.local
# Edit .env.local and add your API keys (Gemini, OpenAI, Anthropic, etc.)

# 3. Start all services
make up

# 4. Wait for services to be healthy (first run downloads MediaPipe models ~2 min)
docker compose ps

# 5. Run database migrations
make db-migrate

# 6. Seed database with test data
make db-seed

# 7. Open the app
open http://localhost:3000

# Service URLs:
# App:          http://localhost:3000
# BullBoard:    http://localhost:3001
# MinIO UI:     http://localhost:9001  (minioadmin / minioadmin)
# LangFuse:     http://localhost:3100
# Mailpit:      http://localhost:8025
# MediaPipe:    http://localhost:8001/health
```

---

## 8. Seed Data (`prisma/seed.ts`)

The seed creates the following test accounts (all passwords: `Test1234!`):

| Email | Role | Details |
|---|---|---|
| `coach@test.com` | COACH | Sarah Johnson, Head Coach, U14 + U16 squads |
| `player@test.com` | PLAYER | Alex Johnson, 16yo, Cover Drive specialist |
| `parent@test.com` | PARENT | Michael Thompson, linked to U14 player |
| `junior@test.com` | PLAYER | Jake Thompson, 12yo, needs parental consent |
| `admin@test.com` | ADMIN | Platform administrator |

Seed also creates 2 squads, 5 training plans, 10 sample analysis results, and 20 sample messages.
