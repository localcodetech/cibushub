import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { QUEUE_NAMES, getQueue } from "../../jobs/queues.js";

// Where the dashboard lives; it needs its full address to load its own pages and files
export const QUEUE_DASHBOARD_PATH = "/api/v1/super-admin/queues";

// Built on the first visit, not when the app starts: opening the queues means Redis
// connections, which tests and most requests never need
let boardRouter = null;

const buildBoard = () => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(QUEUE_DASHBOARD_PATH);
  createBullBoard({
    // Read-only: see every queue and job (failed ones with their error), but no retry,
    // delete or clean buttons, because those would change data outside the audit log.
    // Refund retries have their own audited button on the admin Payments page.
    queues: Object.values(QUEUE_NAMES).map(
      (name) => new BullMQAdapter(getQueue(name), { readOnlyMode: true }),
    ),
    serverAdapter,
    options: { uiConfig: { boardTitle: "CibusHub queues" } },
  });
  return serverAdapter.getRouter();
};

// The Bull Board queue dashboard, super admins only [AC-JOB-05]
const queueDashboard = (req, res, next) => {
  if (!boardRouter) {
    boardRouter = buildBoard();
  }
  return boardRouter(req, res, next);
};

export default queueDashboard;
