declare module 'node:sqlite' {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;

  export interface StatementResultingChanges {
    lastInsertRowid: number | bigint;
    changes: number | bigint;
  }

  export interface StatementSync {
    run(...params: SQLInputValue[]): StatementResultingChanges;
    get(...params: SQLInputValue[]): unknown;
    all(...params: SQLInputValue[]): unknown[];
  }

  export class DatabaseSync {
    constructor(location: string);
    exec(source: string): void;
    prepare(source: string): StatementSync;
    close(): void;
  }
}
