declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path?: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
  export class StatementSync {
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
}
