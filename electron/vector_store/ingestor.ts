
import { Embedder } from "../embedder/embedder";
import { MarkdownReader } from "../file_reader/markdown_reader";
import { Chunk } from "../llm/llm_types_and_interfaces/types";
import { VectorStore } from "./sqlite_vec";

const BATCH_SIZE = 20;

export class Ingester {
    private reader: MarkdownReader;
    private embedder: Embedder;
    private vectorStore: VectorStore;

    constructor(
        vectorStore: VectorStore,
        apiKey: string,
        private abortController = new AbortController()
    ) {
        this.reader = new MarkdownReader(abortController.signal);
        this.embedder = new Embedder(apiKey);
        this.vectorStore = vectorStore;
    }

    async ingest(docsDir: string): Promise<{ total: number }> {
        let batch: Chunk[] = [];
        let total = 0;

        for await (const chunk of this.reader.read_md_files(docsDir)) {
            batch.push(chunk);

            if (batch.length >= BATCH_SIZE) {
                await this.flushBatch(batch);
                total += batch.length;
                batch = [];
            }
        }

        // flush remainder
        if (batch.length > 0) {
            await this.flushBatch(batch);
            total += batch.length;
        }

        return { total };
    }

    private async flushBatch(batch: Chunk[]): Promise<void> {
        const embeddings = await this.embedder.embedBatch(batch);
        this.vectorStore.insertChunkBatch(batch, embeddings);
    }

    abort(): void {
        this.abortController.abort();
    }
}