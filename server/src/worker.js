// Sentry first, so it is running before anything else can crash
import "./config/sentry.js";
import { Worker } from "bullmq";
import logger from "./config/logger.js";
import sequelize from "./config/database.js";
import redis from "./config/redis.js";
import { createQueueConnection } from "./config/queueConnection.js";
import { QUEUE_NAMES, closeQueues } from "./jobs/queues.js";
import { runJob } from "./jobs/processors.js";
import { registerSchedules } from "./jobs/schedules.js";
import { flushErrors, reportError } from "./config/sentry.js";

// ─────────────────────────────────────────────
// The worker: a separate process that runs background jobs, so the API stays fast
// ─────────────────────────────────────────────
const WORKED_QUEUES = [
  QUEUE_NAMES.payments,
  QUEUE_NAMES.maintenance,
  QUEUE_NAMES.assignment,
  QUEUE_NAMES.notifications,
];

const workers = WORKED_QUEUES.map((queueName) => {
  const worker = new Worker(queueName, runJob, {
    connection: createQueueConnection(),
    concurrency: 5,
  });

  worker.on("completed", (job, result) => {
    logger.info({ queue: queueName, job: job.name, jobId: job.id, result }, "Job done");
  });

  // Every failure is logged with the error [AC-JOB-04]. Sentry hears only about the last try:
  // a job that fails once and works on its retry is not a problem worth an alert.
  worker.on("failed", (job, error) => {
    logger.error(
      { err: error, queue: queueName, job: job?.name, jobId: job?.id, attempt: job?.attemptsMade },
      "Job failed",
    );

    const isLastTry = !job || job.attemptsMade >= (job.opts.attempts || 1);
    if (isLastTry) {
      reportError(error, {
        tags: { queue: queueName, job: job?.name },
        extra: { jobId: job?.id, attempts: job?.attemptsMade },
      });
    }
  });

  return worker;
});

await registerSchedules();
logger.info({ queues: WORKED_QUEUES }, "CibusHub worker is running");

// ─────────────────────────────────────────────
// Graceful shutdown: let running jobs finish, then close everything
// ─────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received, worker shutting down`);

  const forceExit = setTimeout(() => {
    logger.error("Forced worker shutdown after timeout");
    process.exit(1);
  }, 20000);
  forceExit.unref();

  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueues();
  await sequelize.close();
  await redis.quit();
  await flushErrors();

  logger.info("Worker stopped");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
