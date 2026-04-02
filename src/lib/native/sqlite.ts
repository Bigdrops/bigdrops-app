import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";

import { canUseNativeSqlite } from "./capacitor";

const DATABASE_NAME = "bigdrops_local";
const DATABASE_VERSION = 1;
const ENCRYPTED = false;
const MODE = "no-encryption";
const READONLY = false;

type SqlStatement = {
  statement: string;
  values?: unknown[];
};

const sqliteConnection = new SQLiteConnection(CapacitorSQLite);

let dbConnection: SQLiteDBConnection | null = null;
let initPromise: Promise<void> | null = null;

function assertNativeSqliteAvailable(): void {
  if (!canUseNativeSqlite()) {
    throw new Error(
      "Native SQLite is unavailable on this platform. Run this database layer inside a Capacitor native build.",
    );
  }
}

async function openDatabase(): Promise<SQLiteDBConnection> {
  assertNativeSqliteAvailable();

  const consistency = await sqliteConnection.checkConnectionsConsistency();
  const hasConsistentConnection = consistency.result
    ? await sqliteConnection.isConnection(DATABASE_NAME, READONLY)
    : { result: false };

  const db = hasConsistentConnection.result
    ? await sqliteConnection.retrieveConnection(DATABASE_NAME, READONLY)
    : await sqliteConnection.createConnection(
        DATABASE_NAME,
        ENCRYPTED,
        MODE,
        DATABASE_VERSION,
        READONLY,
      );

  const isOpen = await db.isDBOpen();
  if (!isOpen.result) {
    await db.open();
  }

  return db;
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (!dbConnection) {
    dbConnection = await openDatabase();
  }

  return dbConnection;
}

export async function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = getDb().then(() => undefined);
  }

  return initPromise;
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.run(sql, params);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  const result = await db.query(sql, params);

  return (result.values ?? []) as T[];
}

export async function executeSet(statements: SqlStatement[]): Promise<void> {
  if (statements.length === 0) {
    return;
  }

  const db = await getDb();
  await db.executeSet(statements);
}
