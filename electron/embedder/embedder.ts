
import path from "path";
import OpenAI from "openai";
import { Chunk } from "../llm/llm_types_and_interfaces/types";

const EMBEDDING_MODEL = "text-embedding-3-small";
const VECTOR_SIZE = 1536;
const QDRANT_URL = "http://localhost:6333";
const COLLECTION_NAME = "my_wiki";

const PIPELINE_BATCH = 20;


export class Embedder {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = EMBEDDING_MODEL) {
        if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async embed(chunk: Chunk): Promise<number[]> {
        const text = this.chunkToText(chunk);
        const res = await this.client.embeddings.create({
            model: this.model,
            input: text,
        });
        return res.data[0].embedding;
    }
    async embedBatch(chunks: Chunk[]): Promise<number[][]> {
        const inputs = chunks.map(c => this.chunkToText(c));
        const res = await this.client.embeddings.create({
            model: this.model,
            input: inputs,
        });
        return res.data.map((d:any) => d.embedding);
    }


    private chunkToText(chunk: Chunk): string {
        let text = "";

        if (chunk.heading) {
            text += `Section: ${chunk.heading}\n`;
        }

        text += chunk.content;

        for (const cb of chunk.codeBlocks) {
            text += `\nCode (${cb.lang}):\n${cb.value}\n`;
        }

        return text.trim();
    }

    async embedText(text: string): Promise<number[]> {
        const res = await this.client.embeddings.create({
            model: this.model,
            input: text,
        });
        return res.data[0].embedding;
    }
}

