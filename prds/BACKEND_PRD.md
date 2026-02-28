# Koda Cricket — Backend PRD
**Version:** 1.0.0  
**Last Updated:** 2024  
**Stack:** Next.js 14 (App Router) + Prisma ORM + MySQL 8 + BullMQ + Redis + Python MediaPipe Worker  
**Runtime:** Node.js 20 LTS  
**Deployment (MVP):** Docker Compose (local), target GCP Cloud Run / Vercel (production)

---

## 1. Overview

The Koda Cricket backend provides a REST + WebSocket API consumed by the React frontend. It orchestrates a multi-service pipeline: video ingestion and storage, pose estimation via a Python MediaPipe microservice, shot classification, LLM orchestration (Gemini Pro, OpenAI, Claude), LangFuse prompt tracking, and a safeguarding/consent management layer. The backend enforces GDPR, COPPA, and ECB safeguarding compliance at the API level.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js API Layer                         │
│  /app/api/...  (Route Handlers, App Router)                     │
│  - Auth middleware (JWT verification, RBAC)                     │
│  - Request validation (Zod)                                     │
│  - Rate limiting (Upstash Redis)                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
   ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
   │   MySQL 8   │ │  Redis  │ │  MinIO/S3   │
   │  (Prisma)   │ │ (BullMQ │ │  (Videos,   │
   │             │ │  Cache) │ │   Assets)   │
   └─────────────┘ └────┬────┘ └─────────────┘
                        │
              ┌─────────▼──────────┐
              │   BullMQ Workers   │
              │  - videoWorker     │
              │  - analysisWorker  │
              │  - emailWorker     │
              │  - reportWorker    │
              └─────────┬──────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
  ┌──────▼──────┐ ┌────▼────┐  ┌──────▼──────┐
  │  MediaPipe  │ │ Gemini  │  │  OpenAI /   │
  │  Python     │ │  Pro    │  │  Claude API │
  │  Service    │ │  v3     │  │  (LangFuse) │
  └─────────────┘ └─────────┘  └─────────────┘
```

---

## 3. Database Schema

### 3.1 Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── Enums ────────────────────────────────────────────────────────

enum Role {
  PLAYER
  PARENT
  COACH
  ADMIN
}

enum AgeGroup {
  UNDER_10
  UNDER_12
  UNDER_14
  UNDER_16
  UNDER_18
  SENIOR
}

enum ConsentStatus {
  PENDING
  APPROVED
  REJECTED
  NOT_REQUIRED
}

enum AnalysisStatus {
  QUEUED
  EXTRACTING_FRAMES
  POSE_ANALYSIS
  SHOT_CLASSIFICATION
  GENERATING_FEEDBACK
  COMPLETE
  FAILED
}

enum ShotType {
  COVER_DRIVE
  OFF_DRIVE
  STRAIGHT_DRIVE
  ON_DRIVE
  SWEEP
  REVERSE_SWEEP
  PULL
  HOOK
  CUT
  GLANCE
  DEFENSIVE
  LATE_CUT
  FLICK
  SCOOP
  UNKNOWN
}

enum MessageVisibility {
  STANDARD
  PARENT_VISIBLE
  COACH_ONLY
}

// ─── Models ───────────────────────────────────────────────────────

model User {
  id                String          @id @default(cuid())
  email             String          @unique
  passwordHash      String?
  phoneNumber       String?
  displayName       String
  firstName         String?
  lastName          String?
  avatarUrl         String?
  role              Role
  dateOfBirth       DateTime?
  ageGroup          AgeGroup?
  clubOrSchool      String?
  primaryPosition   String?
  battingStyle      String?
  bowlingStyle      String?
  profileVisibility String          @default("COACHES_PARENTS")
  isActive          Boolean         @default(true)
  emailVerified     Boolean         @default(false)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  lastLoginAt       DateTime?

  // Relations
  consentRecord      ConsentRecord?
  privacyPreferences PrivacyPreferences?
  videos             Video[]
  sessions           Session[]           @relation("PlayerSessions")
  coachSessions      Session[]           @relation("CoachSessions")
  squadMemberships   SquadMember[]
  coachSquads        Squad[]
  parentLinks        GuardianLink[]      @relation("ParentLinks")
  childLinks         GuardianLink[]      @relation("ChildLinks")
  sentMessages       Message[]           @relation("SentMessages")
  notifications      Notification[]
  achievements       UserAchievement[]
  auditLogs          AuditLog[]
  oauthAccounts      OAuthAccount[]
}

model OAuthAccount {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // 'google' | 'apple'
  providerAccountId String
  accessToken  String?  @db.Text
  refreshToken String?  @db.Text
  expiresAt    DateTime?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model GuardianLink {
  id           String        @id @default(cuid())
  parentId     String
  childId      String
  relationship String        // 'mother' | 'father' | 'guardian' | 'other'
  isVerified   Boolean       @default(false)
  createdAt    DateTime      @default(now())

  parent User @relation("ParentLinks", fields: [parentId], references: [id])
  child  User @relation("ChildLinks", fields: [childId], references: [id])

  @@unique([parentId, childId])
}

model ConsentRecord {
  id                   String        @id @default(cuid())
  userId               String        @unique
  guardianName         String?
  guardianEmail        String?
  guardianRelationship String?
  consentStatus        ConsentStatus @default(PENDING)
  verificationToken    String?       @unique
  tokenExpiresAt       DateTime?
  approvedAt           DateTime?
  rejectedAt           DateTime?
  ipAddress            String?
  userAgent            String?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PrivacyPreferences {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  performanceAnalytics    Boolean  @default(true)
  marketingCommunications Boolean  @default(false)
  coachParentComms        Boolean  @default(true)
  profileVisibility       String   @default("COACHES_PARENTS")
  consentVersion          String   @default("1.0")
  consentedAt             DateTime @default(now())
  updatedAt               DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Video {
  id             String         @id @default(cuid())
  userId         String
  filename       String
  originalFormat String
  storagePath    String
  cdnUrl         String?
  fileSizeBytes  BigInt
  durationSeconds Float?
  resolutionWidth Int?
  resolutionHeight Int?
  uploadedAt     DateTime       @default(now())
  isDeleted      Boolean        @default(false)
  deletedAt      DateTime?

  user     User      @relation(fields: [userId], references: [id])
  analysis Analysis?
  tags     VideoTag[]

  @@index([userId])
}

model Analysis {
  id               String         @id @default(cuid())
  videoId          String         @unique
  status           AnalysisStatus @default(QUEUED)
  shotType         ShotType?
  shotConfidence   Float?
  gradeOverall     Float?
  gradeLetter      String?
  scoreBacklift    Float?
  scoreWeightTransfer Float?
  scoreHeadPosition Float?
  scoreFollowThrough Float?
  scoreTiming      Float?
  scoreBalance     Float?
  scoreFootwork    Float?
  scoreShotSelection Float?
  poseDataPath     String?        // path to stored pose keypoints JSON
  skeletonOverlayPath String?
  coachingTips     Json?          // array of {tip, category, priority, ageGroup}
  rawGeminiResponse Json?
  rawOpenAiResponse Json?
  analysisVersion  String         @default("1.0")
  processingMs     Int?
  errorMessage     String?        @db.Text
  startedAt        DateTime?
  completedAt      DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  video       Video        @relation(fields: [videoId], references: [id])
  annotations Annotation[]
  tags        VideoTag[]

  @@index([status])
}

model VideoTag {
  id         String   @id @default(cuid())
  videoId    String
  analysisId String?
  tag        String
  category   String   // 'shot_type' | 'strength' | 'improvement' | 'neutral'
  confidence Float?
  createdAt  DateTime @default(now())

  video    Video     @relation(fields: [videoId], references: [id])
  analysis Analysis? @relation(fields: [analysisId], references: [id])

  @@index([videoId])
}

model Annotation {
  id           String   @id @default(cuid())
  analysisId   String
  authorId     String
  timestampMs  Int      // video timestamp in milliseconds
  content      String   @db.Text
  isPrivate    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  analysis Analysis @relation(fields: [analysisId], references: [id])
}

model Squad {
  id          String        @id @default(cuid())
  name        String
  coachId     String
  ageGroup    AgeGroup?
  clubName    String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  coach       User          @relation(fields: [coachId], references: [id])
  members     SquadMember[]
  sessions    Session[]
  trainingPlans SquadTrainingPlan[]

  @@index([coachId])
}

model SquadMember {
  id       String   @id @default(cuid())
  squadId  String
  userId   String
  joinedAt DateTime @default(now())

  squad Squad @relation(fields: [squadId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([squadId, userId])
}

model Session {
  id          String   @id @default(cuid())
  coachId     String
  squadId     String?
  title       String
  description String?  @db.Text
  scheduledAt DateTime
  endsAt      DateTime
  startedAt   DateTime?
  completedAt DateTime?
  attendees   Int?
  notes       String?  @db.Text
  createdAt   DateTime @default(now())

  coach  User   @relation("CoachSessions", fields: [coachId], references: [id])
  players User[] @relation("PlayerSessions")
  squad  Squad? @relation(fields: [squadId], references: [id])
}

model TrainingPlan {
  id            String    @id @default(cuid())
  createdById   String
  title         String
  description   String?   @db.Text
  ageGroup      AgeGroup?
  skillFocus    String?
  equipment     String?
  durationMins  Int?
  minPlayers    Int?
  maxPlayers    Int?
  status        String    @default("DRAFT") // DRAFT | ACTIVE | ARCHIVED
  drills        Json?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  assignments   SquadTrainingPlan[]
}

model SquadTrainingPlan {
  id             String   @id @default(cuid())
  squadId        String
  trainingPlanId String
  assignedAt     DateTime @default(now())

  squad        Squad        @relation(fields: [squadId], references: [id])
  trainingPlan TrainingPlan @relation(fields: [trainingPlanId], references: [id])

  @@unique([squadId, trainingPlanId])
}

model Conversation {
  id          String    @id @default(cuid())
  subject     String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String   @id @default(cuid())
  conversationId String
  userId         String
  joinedAt       DateTime @default(now())
  lastReadAt     DateTime?

  conversation Conversation @relation(fields: [conversationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
}

model Message {
  id             String            @id @default(cuid())
  conversationId String
  senderId       String
  content        String            @db.Text
  visibility     MessageVisibility @default(STANDARD)
  attachmentUrl  String?
  attachmentType String?
  isDeleted      Boolean           @default(false)
  sentAt         DateTime          @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])
  sender       User         @relation("SentMessages", fields: [senderId], references: [id])

  @@index([conversationId, sentAt])
}

model Achievement {
  id          String   @id @default(cuid())
  key         String   @unique // 'perfect_session', '7_day_streak', etc.
  name        String
  description String
  iconUrl     String?
  criteria    Json     // rule definition
  createdAt   DateTime @default(now())

  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id])
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@unique([userId, achievementId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 'analysis_complete' | 'new_message' | 'consent_approved' | 'session_reminder'
  title     String
  body      String
  data      Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String   // 'video_uploaded' | 'analysis_viewed' | 'data_exported' | 'account_deleted'
  entityType String?
  entityId   String?
  metadata   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
}

model LlmUsageLog {
  id           String   @id @default(cuid())
  provider     String   // 'gemini' | 'openai' | 'claude'
  model        String
  promptTokens Int
  completionTokens Int
  totalTokens  Int
  costUsd      Float?
  latencyMs    Int?
  langfuseTraceId String?
  userId       String?
  analysisId   String?
  createdAt    DateTime @default(now())

  @@index([provider, createdAt])
}
```

---

## 4. API Specification

All routes prefixed with `/api/`. Authentication via JWT Bearer token in `Authorization` header. Validation via Zod schemas.

### 4.1 Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Email/password login |
| POST | `/api/auth/logout` | JWT | Invalidate session |
| POST | `/api/auth/refresh` | Refresh token | Refresh JWT |
| GET | `/api/auth/oauth/google` | None | Initiate Google OAuth |
| GET | `/api/auth/oauth/google/callback` | None | Google OAuth callback |
| GET | `/api/auth/oauth/apple` | None | Initiate Apple OAuth |
| GET | `/api/auth/oauth/apple/callback` | None | Apple OAuth callback |
| POST | `/api/auth/forgot-password` | None | Send password reset email |
| POST | `/api/auth/reset-password` | Reset token | Reset password |
| POST | `/api/auth/verify-email` | Verify token | Verify email address |

**POST /api/auth/register — Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "phoneNumber": "string?",
  "displayName": "string",
  "role": "PLAYER | PARENT | COACH",
  "dateOfBirth": "ISO8601 string",
  "agreedToTerms": true,
  "privacyPreferences": {
    "performanceAnalytics": true,
    "marketingCommunications": false,
    "coachParentComms": true
  }
}
```

**Business Logic:**
- If user is under 13: create account with `consentStatus: PENDING`, block access until consent approved.
- If user is 13–17: create account with lighter GDPR teen consent; parents notified but not blocking.
- If user is 18+: `consentStatus: NOT_REQUIRED`.
- Hash password using `bcrypt` (cost factor 12).
- Send email verification link.

---

### 4.2 Onboarding / Consent

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/onboarding/consent/request` | JWT | Submit guardian info, send consent email |
| GET | `/api/onboarding/consent/status` | JWT | Check consent status |
| POST | `/api/onboarding/consent/verify` | Token param | Guardian clicks link to approve |
| POST | `/api/onboarding/consent/resend` | JWT | Resend verification email |
| PUT | `/api/onboarding/privacy` | JWT | Save privacy preferences |
| PUT | `/api/onboarding/profile` | JWT | Complete profile (step 4) |

---

### 4.3 Videos

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/videos/upload/init` | JWT | Initialise tus chunked upload session |
| PATCH | `/api/videos/upload/:uploadId` | JWT | Upload chunk (tus protocol) |
| HEAD | `/api/videos/upload/:uploadId` | JWT | Get upload offset (tus protocol) |
| GET | `/api/videos` | JWT | List user's videos |
| GET | `/api/videos/:id` | JWT | Get video metadata |
| DELETE | `/api/videos/:id` | JWT | Soft-delete video |
| GET | `/api/videos/:id/stream` | JWT + Signed URL | Stream video via signed CDN URL |

**Tus Upload Flow:**
1. Client calls `POST /api/videos/upload/init` with metadata (filename, filesize, userId).
2. Server reserves storage slot, creates `Video` record with `status: uploading`, returns upload URL.
3. Client uploads chunks to tus endpoint.
4. On completion, server enqueues `videoProcessingQueue` BullMQ job.
5. Worker: FFmpeg transcodes to H.264 MP4, extracts thumbnail, updates `Video` record.
6. Worker enqueues `analysisQueue` job.

---

### 4.4 Analysis

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/analysis` | JWT | Trigger analysis for a video |
| GET | `/api/analysis/:id` | JWT | Get analysis result |
| GET | `/api/analysis/:id/stream` | JWT | SSE stream for analysis progress |
| GET | `/api/analysis/video/:videoId` | JWT | Get analysis by video |
| POST | `/api/analysis/:id/annotations` | JWT + Coach | Add timestamped annotation |
| GET | `/api/analysis/:id/annotations` | JWT | Get annotations |
| GET | `/api/analysis/:id/report` | JWT | Generate/download PDF report |

**SSE Stream Events:**
```
event: stage
data: {"stage": "EXTRACTING_FRAMES", "progress": 15, "message": "Extracting key frames..."}

event: stage
data: {"stage": "POSE_ANALYSIS", "progress": 45, "message": "Analysing body position..."}

event: stage
data: {"stage": "SHOT_CLASSIFICATION", "progress": 70, "message": "Classifying shot type..."}

event: stage
data: {"stage": "GENERATING_FEEDBACK", "progress": 85, "message": "Generating coaching tips..."}

event: complete
data: {"analysisId": "...", "redirectUrl": "/analysis/..."}

event: error
data: {"message": "...", "code": "ANALYSIS_FAILED"}
```

---

### 4.5 Users & Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | JWT | Get current user profile |
| PUT | `/api/users/me` | JWT | Update profile |
| PUT | `/api/users/me/avatar` | JWT | Upload avatar |
| GET | `/api/users/:id` | JWT + RBAC | Get user profile (coach/admin) |
| POST | `/api/users/me/export` | JWT | Request GDPR data export |
| DELETE | `/api/users/me` | JWT | Request account deletion |
| GET | `/api/users/me/children` | JWT + Parent | List linked children |
| POST | `/api/users/me/children` | JWT + Parent | Link a child account |

---

### 4.6 Squads & Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/squads` | JWT + Coach | List coach's squads |
| POST | `/api/squads` | JWT + Coach | Create squad |
| PUT | `/api/squads/:id` | JWT + Coach | Update squad |
| POST | `/api/squads/:id/members` | JWT + Coach | Add member to squad |
| DELETE | `/api/squads/:id/members/:userId` | JWT + Coach | Remove member |
| GET | `/api/sessions` | JWT | List upcoming sessions |
| POST | `/api/sessions` | JWT + Coach | Create session |
| PUT | `/api/sessions/:id` | JWT + Coach | Update session |
| GET | `/api/sessions/:id/attendance` | JWT + Coach | Get attendance |
| POST | `/api/sessions/:id/attendance` | JWT + Coach | Record attendance |

---

### 4.7 Messaging

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/conversations` | JWT | List conversations |
| POST | `/api/conversations` | JWT | Create conversation |
| GET | `/api/conversations/:id/messages` | JWT | Get messages (paginated) |
| POST | `/api/conversations/:id/messages` | JWT | Send message |
| PUT | `/api/conversations/:id/read` | JWT | Mark as read |
| GET | `/api/messages/search` | JWT | Search messages |
| POST | `/api/messages/:id/attachments` | JWT | Upload attachment |

**Safeguarding Enforcement:**
- When creating a conversation with a user under 18, the API automatically:
  1. Sets `visibility: PARENT_VISIBLE` on all messages.
  2. Adds the player's verified guardian(s) as read-only participants.
  3. Logs creation to `AuditLog`.
- Direct messaging a player under 16 requires coach to have an active squad relationship with that player.

---

### 4.8 Progress & Statistics

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/progress/:userId` | JWT + RBAC | Get player progress stats |
| GET | `/api/progress/:userId/trend` | JWT + RBAC | Grade trend over time |
| GET | `/api/progress/:userId/shots` | JWT + RBAC | Shot distribution |
| GET | `/api/progress/:userId/achievements` | JWT + RBAC | Unlocked achievements |

**RBAC Rules:**
- Players can access their own progress.
- Parents can access linked children's progress.
- Coaches can access squad members' progress.

---

### 4.9 Training Plans

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/training-plans` | JWT + Coach | List training plans |
| POST | `/api/training-plans` | JWT + Coach | Create plan |
| GET | `/api/training-plans/:id` | JWT + Coach | Get plan detail |
| PUT | `/api/training-plans/:id` | JWT + Coach | Update plan |
| DELETE | `/api/training-plans/:id` | JWT + Coach | Archive plan |
| POST | `/api/training-plans/:id/assign` | JWT + Coach | Assign to squad(s) |

---

### 4.10 Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/:id/suspend` | Admin | Suspend user |
| GET | `/api/admin/audit-logs` | Admin | View audit logs |
| GET | `/api/admin/llm-usage` | Admin | LLM usage and cost report |
| GET | `/api/admin/analytics` | Admin | Platform analytics |

---

## 5. Background Workers (BullMQ)

### 5.1 Queues

| Queue | Concurrency | Description |
|---|---|---|
| `video-processing` | 3 | FFmpeg transcoding, thumbnail generation |
| `analysis` | 2 | MediaPipe → Gemini → OpenAI pipeline |
| `email` | 10 | Transactional emails (consent, reports, notifications) |
| `report-generation` | 2 | PDF report generation via Puppeteer |
| `data-export` | 1 | GDPR data export packages |
| `achievement-check` | 5 | Check and unlock achievements post-analysis |
| `cleanup` | 1 | Delete expired data, temp files |

### 5.2 Analysis Worker Pipeline

```
Job Input: { videoId, userId, analysisId }

Step 1 — Frame Extraction (FFmpeg)
  - Extract 1 frame per 0.1s for duration of batting shot
  - Store frames to tmp storage
  - Emit SSE: { stage: 'EXTRACTING_FRAMES', progress: 15 }

Step 2 — Pose Estimation (MediaPipe Python Service)
  - POST /mediapipe/pose with frame batch
  - Returns: { landmarks: [...], confidence: float } per frame
  - Store pose data JSON to object storage
  - Emit SSE: { stage: 'POSE_ANALYSIS', progress: 45 }

Step 3 — Shot Classification (Gemini Pro)
  - Send pose landmark sequences + video metadata
  - Prompt: classify shot type from {ShotType enum}
  - Returns: { shotType, confidence, keyFrameIndices }
  - Emit SSE: { stage: 'SHOT_CLASSIFICATION', progress: 70 }

Step 4 — Biometric Scoring (Gemini Pro RAG)
  - Send pose data + shot type + player age group
  - Returns: { scores: {backlift, weightTransfer, headPosition, followThrough, timing, balance, footwork, shotSelection} }
  - Calculate overall grade (weighted average)
  - Emit SSE: { stage: 'GENERATING_FEEDBACK', progress: 80 }

Step 5 — Coaching Tips (OpenAI or Claude)
  - Send scores + shot type + player age group + flagged weaknesses
  - Returns: { tips: [{ tip, category, priority }], drillRecommendations: [] }
  - Emit SSE: { stage: 'GENERATING_FEEDBACK', progress: 90 }

Step 6 — Tag Generation
  - Algorithmically generate tags from scores and shot type
  - Strength tags (score ≥ 85), improvement tags (score < 65), neutral tags
  - Persist all data to Analysis record

Step 7 — Completion
  - Update Analysis.status = COMPLETE
  - Enqueue achievement-check job
  - Send push notification to user
  - Emit SSE: { type: 'complete', analysisId, redirectUrl }

On Error at any step:
  - Update Analysis.status = FAILED, Analysis.errorMessage
  - Emit SSE: { type: 'error', message, code }
  - Alert admin if repeated failures
```

### 5.3 Grading Algorithm

```typescript
interface ShotScores {
  backlift: number;       // 0–100
  weightTransfer: number; // 0–100
  headPosition: number;   // 0–100
  followThrough: number;  // 0–100
  timing: number;         // 0–100
  balance: number;        // 0–100
  footwork: number;       // 0–100
  shotSelection: number;  // 0–100
}

// Weights per shot type (examples)
const WEIGHTS: Record<ShotType, Partial<ShotScores>> = {
  COVER_DRIVE: {
    backlift: 0.15,
    weightTransfer: 0.20,
    headPosition: 0.15,
    followThrough: 0.20,
    timing: 0.15,
    balance: 0.10,
    footwork: 0.05,
  },
  SWEEP: {
    backlift: 0.10,
    weightTransfer: 0.15,
    headPosition: 0.20,
    followThrough: 0.15,
    timing: 0.20,
    balance: 0.10,
    footwork: 0.10,
  },
  // ... per shot type
};

function calculateGrade(scores: ShotScores, shotType: ShotType): { overall: number; letter: string } {
  const weights = WEIGHTS[shotType];
  const overall = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (scores[key as keyof ShotScores] * weight),
    0
  );
  const letter =
    overall >= 85 ? 'A' :
    overall >= 75 ? 'B+' :
    overall >= 65 ? 'B' :
    overall >= 55 ? 'C+' : 'C';
  return { overall: Math.round(overall * 10) / 10, letter };
}
```

---

## 6. LLM Orchestration

### 6.1 Provider Routing

```typescript
// lib/llm/router.ts

type LLMTask = 'shot_classification' | 'biometric_scoring' | 'coaching_tips' | 'general';

const PROVIDER_ROUTING: Record<LLMTask, 'gemini' | 'openai' | 'claude'> = {
  shot_classification: 'gemini',   // RAG-trained for cricket
  biometric_scoring: 'gemini',     // RAG-trained for cricket
  coaching_tips: 'openai',         // GPT-4o for structured tips
  general: 'claude',               // Claude for general queries
};
```

### 6.2 LangFuse Integration

All LLM calls are wrapped with LangFuse tracing:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

async function tracedLLMCall(params: {
  task: LLMTask;
  prompt: string;
  userId: string;
  analysisId: string;
}) {
  const trace = langfuse.trace({ name: params.task, userId: params.userId });
  const span = trace.span({ name: `llm_${params.task}` });
  // ... LLM call
  span.end({ output: result, usage: { promptTokens, completionTokens } });
  await langfuse.flushAsync();
}
```

LLM usage logged to `LlmUsageLog` table for cost attribution.

### 6.3 Prompt Templates

Stored in `/lib/llm/prompts/` as versioned TypeScript template functions.

**Shot Classification Prompt:**
```
You are an expert cricket coach and biomechanical analyst.
Analyse the following sequence of pose landmarks from a cricket batting video and identify:
1. The type of batting shot played (from this list: {SHOT_TYPE_ENUM})
2. Your confidence level (0.0–1.0)
3. The key frames that define the shot

Player age group: {AGE_GROUP}
Camera angle: Behind bowler's end stumps, approximately {DISTANCE}m from batsman
Pose landmark data: {POSE_JSON}

Respond in JSON format: { "shotType": "...", "confidence": 0.87, "keyFrames": [12, 18, 24] }
```

**Coaching Tips Prompt (age-differentiated):**
```
You are an ECB-qualified cricket coach providing feedback to a {AGE_GROUP} player.
{IF JUNIOR: Use encouraging, simple language suitable for a young athlete.}
{IF SENIOR: Use technical cricket terminology where appropriate.}

The player played a {SHOT_TYPE} with the following technical scores:
- Backlift: {score}/100
- Weight Transfer: {score}/100
- Head Position: {score}/100
- Follow-Through: {score}/100
- Timing: {score}/100
- Overall Grade: {LETTER} ({OVERALL}/100)

Generate exactly 5 coaching tips as a JSON array:
[{ "tip": "...", "category": "strength|improvement|neutral", "priority": 1-5 }]
Focus tips 1–2 on strengths to reinforce, tips 3–5 on areas to improve.
Reference ECB coaching fundamentals where relevant.
```

---

## 7. MediaPipe Python Microservice

### 7.1 Service Spec

- **Language:** Python 3.11
- **Framework:** FastAPI
- **Port:** 8001
- **Endpoint:** `POST /pose`

**Request:**
```json
{
  "frames": ["base64_encoded_frame_1", "..."],
  "frameCount": 120,
  "videoMetadata": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "cameraDistance": "17-22m",
    "cameraAngle": "behind_stumps"
  }
}
```

**Response:**
```json
{
  "landmarks": [
    {
      "frameIndex": 0,
      "timestamp": 0.033,
      "keypoints": {
        "nose": { "x": 0.52, "y": 0.21, "z": -0.01, "visibility": 0.99 },
        "leftShoulder": { "x": 0.45, "y": 0.35, "z": 0.02, "visibility": 0.95 }
        // ... 33 MediaPipe Pose landmarks
      },
      "poseConfidence": 0.91
    }
  ],
  "batsman_bbox": { "x": 820, "y": 120, "w": 240, "h": 480 },
  "processingMs": 4200
}
```

**Key MediaPipe considerations:**
- Use `MediaPipe Pose Landmarker` (not legacy Pose solution).
- Model complexity: `heavy` for production, `lite` for fast preview.
- Apply auto-zoom to batsman bounding box before pose estimation (to handle umpire-end camera distance).
- Batsman detection: first-pass object detection to identify player in frame, crop, then run pose on cropped region.
- If pose confidence < 0.5 for any frame, skip that frame in classification.

---

## 8. Authentication & Security

### 8.1 JWT Strategy

- **Access Token:** 15-minute expiry, signed with `RS256` private key
- **Refresh Token:** 7-day expiry, stored as `HttpOnly Secure SameSite=Strict` cookie
- **Rotation:** Refresh token rotated on each use (refresh token reuse detection)
- **Revocation:** Refresh tokens stored in Redis with TTL; revoked on logout

### 8.2 RBAC Middleware

```typescript
// middleware/rbac.ts
type Permission =
  | 'video:upload'
  | 'video:view:own'
  | 'video:view:squad'
  | 'analysis:view:own'
  | 'analysis:view:squad'
  | 'analysis:annotate'
  | 'message:send'
  | 'message:send:minor'
  | 'squad:manage'
  | 'training:manage'
  | 'admin:access';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PLAYER: ['video:upload', 'video:view:own', 'analysis:view:own', 'message:send'],
  PARENT: ['video:view:squad', 'analysis:view:squad', 'message:send'],
  COACH: [
    'video:view:squad', 'analysis:view:squad', 'analysis:annotate',
    'message:send', 'message:send:minor', 'squad:manage', 'training:manage'
  ],
  ADMIN: ['admin:access', /* all permissions */],
};
```

### 8.3 Rate Limiting

Using Upstash Redis rate limiter:

| Endpoint | Limit |
|---|---|
| `/api/auth/login` | 5 per minute per IP |
| `/api/auth/register` | 3 per minute per IP |
| `/api/videos/upload` | 10 per hour per user |
| `/api/analysis` | 20 per hour per user |
| `/api/conversations/:id/messages` | 60 per minute per user |
| General API | 300 per minute per user |

### 8.4 Security Headers (Next.js middleware)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' data: https://cdn.kodacricket.com; media-src 'self' blob: https://cdn.kodacricket.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 8.5 Data Encryption

- Passwords: bcrypt (cost 12)
- PII at rest: MySQL column-level encryption for `dateOfBirth`, `guardianEmail`, `phoneNumber` using AES-256-GCM
- Videos at rest: AES-256-SSE via MinIO/S3
- Videos in transit: TLS 1.3
- Tokens: RS256 signed JWTs

---

## 9. GDPR & Compliance

### 9.1 Data Subject Rights Implementation

| Right | Endpoint | Implementation |
|---|---|---|
| Access (Art. 15) | `GET /api/users/me/export` | Async job, email download link |
| Rectification (Art. 16) | `PUT /api/users/me` | Direct update |
| Erasure (Art. 17) | `DELETE /api/users/me` | 14-day grace period, then cascade delete |
| Portability (Art. 20) | `GET /api/users/me/export` | JSON export of all personal data |
| Restriction (Art. 18) | `PUT /api/users/me/restrict` | Flag account, suspend processing |
| Objection (Art. 21) | Via privacy preferences | Toggle analytics/comms |

### 9.2 Data Retention

| Data Type | Retention | Basis |
|---|---|---|
| Account data | Duration of account + 30 days | Contract |
| Videos | 2 years (configurable per user) | Consent |
| Analysis results | 2 years | Legitimate interest |
| Messages | 1 year | Legitimate interest |
| Audit logs | 7 years | Legal obligation |
| LLM usage logs | 2 years | Legitimate interest |
| Consent records | 6 years | Legal obligation |

Automated cleanup job runs nightly to delete data past retention dates.

### 9.3 Minor-specific Rules (COPPA / UK GDPR)

- Under 13: full parental consent required before account activation.
- Under 13: no marketing communications.
- Under 13: profile visibility locked to "Coaches & Parents Only" (cannot be changed by player).
- Under 18: all coach messages visible to linked parent/guardian.
- Under 18: no direct coach messaging without squad relationship.
- Under 16: coach cannot view video without active squad relationship logged in audit.
- Any under-18 data export or deletion request triggers notification to linked parent.

---

## 10. Email Service

Using **Resend** (or AWS SES) for transactional emails. Templates stored in `/emails/` using React Email.

| Template | Trigger |
|---|---|
| `welcome` | Registration |
| `verify-email` | Registration |
| `parental-consent-request` | Under-13 registration |
| `parental-consent-approved` | Guardian approves |
| `parental-consent-reminder` | 24h after request if not approved |
| `analysis-complete` | Analysis pipeline finishes |
| `new-message` | Unread message after 5 minutes |
| `session-reminder` | 2 hours before scheduled session |
| `data-export-ready` | GDPR export complete |
| `account-deletion-confirmation` | Account deletion requested |
| `password-reset` | Password reset request |

---

## 11. Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=mysql://koda:secret@mysql:3306/kodacricket

# Redis
REDIS_URL=redis://redis:6379

# Storage (MinIO in dev, S3 in prod)
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET_VIDEOS=koda-videos
STORAGE_BUCKET_ASSETS=koda-assets
STORAGE_PUBLIC_URL=http://localhost:9000

# JWT
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
REFRESH_TOKEN_SECRET=long-random-string

# LLM APIs
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# LangFuse
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_HOST=http://langfuse:3100

# Email
RESEND_API_KEY=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

# MediaPipe Service
MEDIAPIPE_SERVICE_URL=http://mediapipe:8001

# Rate Limiting
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Feature Flags
ENABLE_SKELETON_OVERLAY=true
ENABLE_COACH_ANNOTATIONS=true
```

---

## 12. Testing Strategy

### 12.1 Unit Tests (Jest + ts-jest)
- All API route handlers (with mocked Prisma)
- All worker job logic
- Grading algorithm
- RBAC permission checks
- LLM prompt template rendering
- Validation schemas (Zod)
- Target: **≥ 80% coverage** reported to CodeCov

### 12.2 Integration Tests (Jest + Testcontainers)
- Database migrations and seeding
- Full upload → analysis pipeline (mock MediaPipe + LLMs)
- Auth flows (register, login, OAuth, token refresh)
- GDPR data export and deletion flows
- Consent flows for minors

### 12.3 API Tests (Supertest)
- All endpoints: happy path + error cases
- RBAC enforcement per endpoint
- Rate limiting behaviour
- Safeguarding enforcement in messaging

---

## 13. Monitoring & Observability

- **Logging:** Pino (structured JSON logs), log level configurable via `LOG_LEVEL` env
- **Error tracking:** Sentry (Next.js SDK)
- **APM:** OpenTelemetry traces exported to Grafana (production)
- **LLM observability:** LangFuse dashboard
- **Queue monitoring:** BullBoard UI at `/admin/queues` (admin-only)
- **Health check:** `GET /api/health` returns `{ status: 'ok', db: 'ok', redis: 'ok', mediapipe: 'ok' }`
