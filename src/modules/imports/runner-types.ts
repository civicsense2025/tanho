import type { ImportJobStatus } from "./schema";

/** The result of advancing a job by one tick (shared by runner + its phase modules). */
export type StepResult = {
  done: boolean;
  status: ImportJobStatus;
  rowsDone: number;
  rowsTotal: number;
};
