import type { Clock } from '../../src/player';

interface FakeTask {
  readonly id: number;
  readonly at: number;
  readonly callback: () => void;
}

export interface FakeClock extends Clock {
  advance: (ms: number) => void;
  readonly pending: number;
}

function byDueTime(a: FakeTask, b: FakeTask): number {
  return a.at - b.at || a.id - b.id;
}

export function createFakeClock(): FakeClock {
  let time = 0;
  let nextId = 1;
  let tasks: readonly FakeTask[] = [];

  const takeNextDue = (limit: number): FakeTask | undefined => {
    const [first] = tasks.filter((task) => task.at <= limit).sort(byDueTime);
    if (first) tasks = tasks.filter((task) => task.id !== first.id);
    return first;
  };

  return {
    now: () => time,
    schedule: (callback, ms) => {
      const id = nextId;
      nextId += 1;
      tasks = [...tasks, { id, at: time + ms, callback }];
      return id;
    },
    cancel: (handle) => {
      tasks = tasks.filter((task) => task.id !== handle);
    },
    advance: (ms) => {
      const target = time + ms;
      for (let task = takeNextDue(target); task; task = takeNextDue(target)) {
        time = task.at;
        task.callback();
      }
      time = target;
    },
    get pending() {
      return tasks.length;
    },
  };
}
