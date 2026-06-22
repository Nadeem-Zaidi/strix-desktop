import path from "path";
import fs from "fs";
import { app } from "electron";
import { DatabaseManager } from "../database/database_manager";
import { DatabaseType } from "../llm/llm_types_and_interfaces/types";
import { MigrationManager } from "../migration_manager/migration_manager";
import { migrations } from "../migration_manager/migration";
import { SQLLiteAdapter } from "../database/adapters/sqllite_adapter";
import { VectorStore } from "../vector_store/sqlite_vec";

let _vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
    if (!_vectorStore) throw new Error("VectorStore not initialized");
    return _vectorStore;
}

export async function initializeDatabase() {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "strix.db");
    const uploadsPath = path.join(userDataPath, "files");

    fs.mkdirSync(uploadsPath, { recursive: true });

    const dbManager = DatabaseManager.getinstance();

    await dbManager.addConnection("sqllite",DatabaseType.SQLLite,{database: dbPath,connectionTimeout: 3000}
    );

    const db = dbManager.getConnection("sqllite");

    const migrationManager = new MigrationManager(db);
    await migrationManager.migrateUp(migrations);

    // Initialize VectorStore on the same connection
    _vectorStore = new VectorStore(db as SQLLiteAdapter);
}