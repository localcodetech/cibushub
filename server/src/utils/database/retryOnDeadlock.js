const MAX_ATTEMPTS = 3;

// MySQL's names for "two transactions blocked each other" and "waited too long for a lock"
const RETRYABLE_MYSQL_ERRORS = ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"];

const isRetryable = (error) => {
  const mysqlCode = error.parent?.code || error.original?.code;
  return RETRYABLE_MYSQL_ERRORS.includes(mysqlCode);
};

// Runs work(); if MySQL killed it over locks, runs it again, up to 3 times in total.
// The transaction inside work() was rolled back, so a retry starts clean. [plan review C6]
export const retryOnDeadlock = async (work) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) {
        throw error;
      }
    }
  }
};
