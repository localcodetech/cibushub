import { Queue } from "bullmq";
import { createQueueConnection } from "../config/queueConnection.js";

// One queue per kind of work [AC-JOB-01]
export const QUEUE_NAMES = {
  payments: "payments", // unpaid-order expiry, reconciliation, refunds
  notifications: "notifications", // SMS, email, push (notifications step)
  assignment: "assignment", // rider offers (riders step)
  maintenance: "maintenance", // sweepers and clean-up
};

// Every job: 5 tries, waiting longer each time (10 s, 20 s, 40 s...); failed jobs are KEPT
// so they can be inspected [AC-JOB-04]
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 10000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: false,
};

const openQueues = {};

// Queues are opened the first time they are used, and then reused
export const getQueue = (name) => {
  if (!openQueues[name]) {
    openQueues[name] = new Queue(name, {
      connection: createQueueConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return openQueues[name];
};

export const closeQueues = async () => {
  await Promise.all(Object.values(openQueues).map((queue) => queue.close()));
};
