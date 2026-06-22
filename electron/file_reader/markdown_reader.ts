
import path from "path";
import { Chunk } from "../llm/llm_types_and_interfaces/types";
import { AsyncQueue } from "./async_queue";
import { readdir, readFile } from "fs/promises";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkParse from "remark-parse";


const TXT_BUFFER_HIGH_WATERMARK = 64;
const MD_QUEUE_HIGH_WATERMARK = 32;
class PointerQueue<T> {
    private items: (T | undefined)[] = [];
    private head = 0;

    enqueue(item: T): void {
        this.items.push(item);
    }

    dequeue(): T | undefined {
        if (this.head >= this.items.length) return undefined;
        const item = this.items[this.head];
        this.items[this.head] = undefined; // release reference
        this.head++;
        if (this.head > 1024 && this.head > this.items.length >> 1) {
            this.items = this.items.slice(this.head);
            this.head = 0;
        }
        return item;
    }

    get size(): number {
        return this.items.length - this.head;
    }

    get empty(): boolean {
        return this.head >= this.items.length;
    }
}

export class MarkdownReader {
    signal: AbortSignal;
    constructor(signal: AbortSignal) {
        this.signal = signal
    }
    async listFile(dir: string): Promise<string[]> {
        const entries = await readdir(dir, {
            withFileTypes: true
        });

        const files = await Promise.all(
            entries.map((entry) => {
                const fullPath = path.join(dir, entry.name);

                return entry.isDirectory()
                    ? this.listFile(fullPath)
                    : [fullPath];
            })
        );

        return files.flat();
    }
    async *read_md_files(dir: string, workerCount = 4): AsyncGenerator<Chunk> {
        const fileQueue = new PointerQueue<any>()
        let listDone = false;

        const files = await this.listFile(dir);
        for (const file of files) {
            if (file.endsWith(".md")) {
                fileQueue.enqueue(file);
            }
        }


        const queue = new AsyncQueue<Chunk>(MD_QUEUE_HIGH_WATERMARK);
        let workerError: unknown = null;

        const mdWorker = async (): Promise<void> => {
            while (true) {
                const file = fileQueue.dequeue();
                if (!file) {
                    break;
                }
                if (this.signal?.aborted || queue.closed) break;
                await this.parseAndPush(file, queue);
            }
        };

        const pipeline = Promise.all(Array.from({ length: workerCount }, () => mdWorker()))
            .then(() => queue.close())
            .catch((err) => {
                workerError = err;
                queue.close();
            });

        for await (const chunk of queue) {
            if (this.signal?.aborted) break;
            yield chunk;
        }

        await pipeline;
        if (workerError) throw workerError;
    }


    private async parseAndPush(
        filePath: string,
        queue: AsyncQueue<Chunk>
    ): Promise<number> {

        const content = await readFile(filePath, "utf8");

        const tree = unified().use(remarkParse).use(remarkGfm).parse(content);

        let chunkCount = 0;

        for (const chunk of this.buildChunks(tree, filePath)) {
            if (this.signal?.aborted || queue.closed) {
                break;
            }

            await queue.enqueue(chunk);
            chunkCount++;
        }

        return chunkCount;
    }

    private *buildChunks(tree: any, sourceFile: string): Generator<Chunk> {
        let current: Chunk = this.emptyChunk(sourceFile);
        let contentParts: string[] = [];
        const flushContent = () => {
            current.content = contentParts.join("");
            contentParts = [];
        };

        for (const node of tree.children) {
            switch (node.type) {
                case "heading": {
                    flushContent();
                    const flushed = this.flush(current);
                    if (flushed) yield flushed;
                    current = this.emptyChunk(sourceFile);
                    contentParts = [];
                    current.heading = this.extractNode(node);
                    current.level = node.depth;
                    break;
                }
                case "paragraph":
                    contentParts.push(this.extractNode(node), "\n");
                    break;
                case "code":
                    current.codeBlocks.push({ lang: node.lang ?? "", value: node.value });
                    break;
                case "list":
                    contentParts.push(this.extractList(node), "\n");
                    break;
                case "table": {
                    const parsed = this.extractTable(node);
                    current.tables.push(parsed);
                    const headerLine = parsed.headers.join(" | ");
                    const rowLines = parsed.rows.map((r) => r.join(" | ")).join("\n");
                    contentParts.push(`Table: ${headerLine}\n${rowLines}\n`);
                    break;
                }
                case "blockquote": {
                    const quoteText = (node.children as any[])
                        .map((c) => this.extractNode(c))
                        .join(" ");
                    contentParts.push(`> ${quoteText}\n`);
                    break;
                }
                case "html":
                    contentParts.push(node.value.replace(/<[^>]+>/g, "").trim(), "\n");
                    break;
                case "thematicBreak": {
                    flushContent();
                    const flushed = this.flush(current);
                    if (flushed) yield flushed;
                    current = this.emptyChunk(sourceFile);
                    contentParts = [];
                    break;
                }
                case "definition":
                case "footnoteDefinition":
                case "yaml":
                    break;
                default:
                    console.warn(`[buildChunks] unhandled node type: "${node.type}"`);
            }
        }

        flushContent();
        const last = this.flush(current);
        if (last) yield last;
    }

    private emptyChunk(sourceFile: string): Chunk {
        return { heading: "", level: 0, content: "", codeBlocks: [], tables: [], sourceFile };
    }

    private flush(current: Chunk): Chunk | null {
        return current.content.trim() ||
            current.codeBlocks.length > 0 ||
            current.tables.length > 0
            ? { ...current }
            : null;
    }

    private extractNode(node: any): string {
        if (node.type === "text" || node.type === "inlineCode") return node.value as string;
        if (["strong", "emphasis", "delete"].includes(node.type)) {
            return (node.children as any[])?.map((c) => this.extractNode(c)).join("") ?? "";
        }
        if (node.type === "link") {
            const text = (node.children as any[])?.map((c) => this.extractNode(c)).join("") ?? "";
            return node.url ? `${text} (${node.url})` : text;
        }
        if (!node.children) return "";
        return (node.children as any[]).map((c) => this.extractNode(c)).join("");
    }

    private extractTable(node: any): { headers: string[]; rows: string[][] } {
        const [headerRow, ...dataRows] = node.children as any[];
        const headers: string[] = headerRow.children.map((cell: any) =>
            (cell.children as any[])?.map((c) => this.extractNode(c)).join("").trim() ?? ""
        );
        const rows: string[][] = dataRows.map((row: any) =>
            (row.children as any[]).map((cell: any) =>
                (cell.children as any[])?.map((c) => this.extractNode(c)).join("").trim() ?? ""
            )
        );
        return { headers, rows };
    }

    private extractList(node: any, depth = 0): string {
        const parts: string[] = [];
        const indent = "  ".repeat(depth);
        for (const item of node.children as any[]) {
            for (const child of item.children as any[]) {
                if (child.type === "paragraph") {
                    parts.push(`${indent}- ${this.extractNode(child)}\n`);
                } else if (child.type === "list") {
                    parts.push(this.extractList(child, depth + 1));
                }
            }
        }
        return parts.join("");
    }
}