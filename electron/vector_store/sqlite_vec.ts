import * as sqliteVec from "sqlite-vec";
import { Chunk } from "../llm/llm_types_and_interfaces/types";
import { SQLLiteAdapter } from "../database/adapters/sqllite_adapter";

const VECTOR_SIZE = 1536;

export class VectorStore {
    private db: ReturnType<SQLLiteAdapter["getRawDb"]>;

    constructor(adapter: SQLLiteAdapter) {
        this.db = adapter.getRawDb();
        sqliteVec.load(this.db);
        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chunks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT NOT NULL,
                heading     TEXT,
                level       INTEGER,
                content     TEXT,
                code_blocks TEXT,
                tables_data TEXT
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
                embedding float[${VECTOR_SIZE}]
            );
        `);
    }

    insertChunkBatch(chunks: Chunk[], embeddings: number[][]): void {
        const metaStmt = this.db.prepare(`
        INSERT INTO chunks (source_file, heading, level, content, code_blocks, tables_data)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
        const vecStmt = this.db.prepare(`
        INSERT INTO chunks_vec (rowid, embedding) VALUES (?, ?)
    `);

        const insertAll = this.db.transaction(() => {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const result = metaStmt.run(
                    chunk.sourceFile,
                    chunk.heading,
                    chunk.level,
                    chunk.content,
                    JSON.stringify(chunk.codeBlocks),
                    JSON.stringify(chunk.tables)
                );
                vecStmt.run(
                    BigInt(result.lastInsertRowid),  // ← force BigInt
                    new Float32Array(embeddings[i])
                );
            }
        });

        insertAll();
    }

    insertChunk(chunk: Chunk, embedding: number[]): number {
        const insert = this.db.transaction(() => {
            const metaStmt = this.db.prepare(`
            INSERT INTO chunks (source_file, heading, level, content, code_blocks, tables_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
            const result = metaStmt.run(
                chunk.sourceFile,
                chunk.heading,
                chunk.level,
                chunk.content,
                JSON.stringify(chunk.codeBlocks),
                JSON.stringify(chunk.tables)
            );

            const chunkId = BigInt(result.lastInsertRowid);  // ← force BigInt

            this.db.prepare(`
            INSERT INTO chunks_vec (rowid, embedding) VALUES (?, ?)
        `).run(chunkId, new Float32Array(embedding));

            return Number(chunkId);
        });

        return insert() as number;
    }

    search(queryEmbedding: number[], topK = 5): (Chunk & { id: number; distance: number })[] {
        const rows = this.db.prepare(`
            SELECT
                c.id,
                c.source_file,
                c.heading,
                c.level,
                c.content,
                c.code_blocks,
                c.tables_data,
                v.distance
            FROM chunks_vec v
            JOIN chunks c ON c.id = v.rowid
            WHERE v.embedding MATCH ?
              AND k = ?
            ORDER BY v.distance
        `).all(new Float32Array(queryEmbedding), topK) as any[];

        return rows.map(row => ({
            id: row.id,
            sourceFile: row.source_file,
            heading: row.heading ?? "",
            level: row.level ?? 0,
            content: row.content ?? "",
            codeBlocks: JSON.parse(row.code_blocks ?? "[]"),
            tables: JSON.parse(row.tables_data ?? "[]"),
            distance: row.distance,
        }));
    }
}