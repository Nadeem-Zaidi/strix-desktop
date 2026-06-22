import { Migration } from "../llm/llm_types_and_interfaces/types";

export const migration_20260607120000: Migration = {
    version: "20260607120000",
    description: "Create sessions and chat_messages tables",

    up: [
        `CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Chat',
            model TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT,
            type TEXT,
            content TEXT,
            metadata TEXT,
            name TEXT,
            arguments TEXT,
            tool_call_id TEXT,
            output TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )`,

        `CREATE INDEX idx_chat_messages_session_id
            ON chat_messages(session_id)`,

        `CREATE INDEX idx_chat_messages_role
            ON chat_messages(role)`,

        `CREATE INDEX idx_chat_messages_type
            ON chat_messages(type)`,

        `CREATE INDEX idx_chat_messages_created_at
            ON chat_messages(created_at)`
    ],

    down: [
        `DROP TABLE IF EXISTS chat_messages`,
        `DROP TABLE IF EXISTS sessions`
    ]
};

const migration_20260607120001: Migration = {
    version: "20260607120001",       // ← fixed version
    description: "Keep track of the chat mode",
    up: [
        `CREATE TABLE chat_mode (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_mode INTEGER NOT NULL DEFAULT 0,
            sessionid TEXT NOT NULL,  -- ← fixed missing comma
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ],
    down: [
        `DROP TABLE IF EXISTS chat_mode`
    ]
};

export const migrations: Migration[] = [
    migration_20260607120000,
    migration_20260607120001
];