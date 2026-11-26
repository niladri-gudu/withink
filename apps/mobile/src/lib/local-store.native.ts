import * as SQLite from "expo-sqlite";

import { createSqliteLocalStore, type SqlDriver } from "./sqlite-store";

/**
 * Native local store: encrypted journal records live in SQLite.
 *
 * The database opens lazily on the first operation, so importing this module
 * never blocks app startup or the router.
 */
const database = SQLite.openDatabaseAsync("withink.db");

const driver: SqlDriver = {
  async exec(sql) {
    const db = await database;
    await db.execAsync(sql);
  },
  async run(sql, params = []) {
    const db = await database;
    await db.runAsync(sql, params as SQLite.SQLiteBindParams);
  },
  async getAll<T>(sql: string, params: unknown[] = []) {
    const db = await database;
    return await db.getAllAsync<T>(sql, params as SQLite.SQLiteBindParams);
  },
  async getFirst<T>(sql: string, params: unknown[] = []) {
    const db = await database;
    return await db.getFirstAsync<T>(sql, params as SQLite.SQLiteBindParams);
  },
};

export const mobileLocalStore = createSqliteLocalStore(driver);
