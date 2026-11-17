import { addTaskWithId } from '../firebaseLazy';
import { nextAttemptTask } from './tasks';

/**
 * After a «لم يرد»: creates the next call as a task (up to the third try) under a fixed id, so a retry or a second
 * device writes the same one. Resolves the task ({ id, task }), or null when the tries are used up or it was not saved.
 */
export async function scheduleNextAttempt(lead, attempts, me) {
  const next = nextAttemptTask({ lead, attempts, me });
  if (!next) return null;
  try {
    return (await addTaskWithId(next.id, next.task)) ? next : null;
  } catch {
    return null;
  }
}
