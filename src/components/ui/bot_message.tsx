import ReactMarkdown from "react-markdown";
import { BotMessageProps } from "../types_and_interfaces/types";
import remarkGfm from "remark-gfm";
import { useState } from "react";
export function convertAsciiTableToMarkdown(text: string): string {
    const lines = text.split("\n");
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // detect ASCII table separator line: starts with + or |
        if (/^\s*\+[-+]+\+\s*$/.test(line)) {
            // skip separator lines, collect the data lines between them
            const tableLines: string[] = [];
            i++;

            while (i < lines.length) {
                const l = lines[i];
                if (/^\s*\+[-+]+\+\s*$/.test(l)) {
                    // separator — skip
                    i++;
                    continue;
                }
                if (/^\s*\|/.test(l)) {
                    // data row
                    tableLines.push(l);
                    i++;
                } else {
                    break;
                }
            }

            if (tableLines.length === 0) continue;

            // convert each row: "| val | val |" → "| val | val |"
            const mdRows = tableLines.map(l =>
                l.trim().replace(/\s*\|\s*/g, " | ").trim()
            );

            // insert markdown separator after header row
            if (mdRows.length >= 1) {
                const colCount = (mdRows[0].match(/\|/g) ?? []).length - 1;
                const separator = "| " + Array(colCount).fill("---").join(" | ") + " |";
                result.push(mdRows[0]);
                result.push(separator);
                result.push(...mdRows.slice(1));
            }

            result.push("");
            continue;
        }

        result.push(line);
        i++;
    }

    return result.join("\n");
}

export const BotMessage = ({ text, isStreaming, cancelled }: BotMessageProps) => {
    const processedText = convertAsciiTableToMarkdown(text)
    return <div className="message bot_message">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // ── Table ──────────────────────────────────────────
                table({ children }) {
                    return (
                        <div className="table_wrapper">
                            <table className="md_table">{children}</table>
                        </div>
                    );
                },
                thead({ children }) {
                    return <thead className="md_thead">{children}</thead>;
                },
                th({ children }) {
                    return <th className="md_th">{children}</th>;
                },
                td({ children }) {
                    return <td className="md_td">{children}</td>;
                },
                tr({ children }) {
                    return <tr className="md_tr">{children}</tr>;
                },

                // ── Code (existing) ────────────────────────────────
                code({ className, children, ...props }) {
                    const isBlock = className?.includes("language-");
                    const [copied, setCopied] = useState(false);
                    const handleCopy = () => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    };
                    return isBlock ? (
                        <div className="code_block_wrapper">
                            <div className="code_header">
                                <span className="code_lang">
                                    {className?.replace("language-", "") ?? "code"}
                                </span>
                                <button className="copy_btn" onClick={handleCopy}>
                                    {copied ? "✅ Copied" : "Copy"}
                                </button>
                            </div>
                            <pre><code className={className} {...props}>{children}</code></pre>
                        </div>
                    ) : (
                        <code className="inline_code" {...props}>{children}</code>
                    );
                },
                a({ children, href }) {
                    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                },
            }}
        >
            {text}
        </ReactMarkdown>
        {isStreaming && <span className="cursor">▋</span>}
        {cancelled && <span className="cancelled_label">⚠ Response stopped</span>}
    </div>
}