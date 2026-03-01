import { Worker, type Job } from "bullmq";
import { Resend } from "resend";

interface EmailJobData {
  type: string;
  to: string;
  payload: Record<string, unknown>;
}

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.EMAIL_FROM ?? "noreply@koda.local";

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job: Job<EmailJobData>) => {
    const subjectByType: Record<string, string> = {
      welcome: "Welcome to Koda Cricket",
      consent_request: "Parental consent request",
      consent_approved: "Consent approved",
      analysis_complete: "Your analysis is ready",
    };

    if (!process.env.RESEND_API_KEY) {
      // eslint-disable-next-line no-console
      console.log("[emailWorker] RESEND_API_KEY missing, skipping send", job.data.type, job.data.to);
      return;
    }

    await resend.emails.send({
      from,
      to: job.data.to,
      subject: subjectByType[job.data.type] ?? "Koda Cricket notification",
      text: JSON.stringify(job.data.payload),
    });
  },
  { connection, concurrency: 10 }
);
