import { IDatabaseAdapter, QueryResult, SQLiteConfig } from "../idatabase";
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

type BetterSQLite = InstanceType<typeof Database>;

export class SQLLiteAdapter implements IDatabaseAdapter {

    private db: BetterSQLite | null = null;
    private connected: boolean = false;
    private config: SQLiteConfig;
    private inTransaction: boolean = false;

    constructor(config: SQLiteConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        try {
            this.db = new Database(this.config.database);
            this.db.pragma('journal_mode = WAL');
            this.connected = true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.db?.close();
        this.db = null;
        this.connected = false;
    }
    getRawDb(): BetterSQLite {
        if (!this.db) throw new Error("Not connected");
        return this.db;
    }

    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        if (!this.db) throw new Error("Not connected");
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith("SELECT")) {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(params ?? []) as T[];
            return {
                rows,
                rowCount: rows.length,
                fields: rows.length ? Object.keys(rows[0] as any) : []
            };
        } else {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(params ?? []);
            return {
                rows: [],
                rowCount: result.changes
            };
        }
    }

    async beginTransaction(): Promise<void> {
        if (!this.db) throw new Error('Not connected');
        this.db.prepare('BEGIN').run();
        this.inTransaction = true;
    }

    async commit(): Promise<void> {
        if (!this.db) throw new Error('Not connected');
        this.db.prepare('COMMIT').run();
        this.inTransaction = false;
    }

    async rollback(): Promise<void> {
        if (!this.db) throw new Error('Not connected');
        this.db.prepare('ROLLBACK').run();
        this.inTransaction = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    getType(): string {
        return 'sqllite';
    }
}