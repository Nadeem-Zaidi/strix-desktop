

interface FileListRow {
    className?: string
    name: string,
    datemodified: string,
    type: string
    size: string,

}

interface FileIconProps {
    ext: string;
    size?: number;
}

export const FileIcon = ({
    ext,
    size = 20,
}: FileIconProps) => {
    const extension = ext.replace(".", "").toLowerCase();

    const colors: Record<string, string> = {
        pdf: "#E53935",

        png: "#8E24AA",
        jpg: "#8E24AA",
        jpeg: "#8E24AA",
        gif: "#8E24AA",
        webp: "#8E24AA",

        json: "#F9A825",

        ts: "#1565C0",
        tsx: "#1565C0",

        js: "#F57F17",
        jsx: "#F57F17",

        md: "#00897B",
        txt: "#546E7A",
        csv: "#2E7D32",

        zip: "#6D4C41",
        rar: "#6D4C41",

        doc: "#2563EB",
        docx: "#2563EB",

        xls: "#2E7D32",
        xlsx: "#2E7D32",
    };

    const color = colors[extension] ?? "#64748B";

    const label =
        extension.length > 3
            ? extension.slice(0, 3).toUpperCase()
            : extension.toUpperCase();

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
        >
            {/* file body */}
            <path
                d="M6 2H14L20 8V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V3C4 2.44772 4.44772 2 5 2H6Z"
                fill="white"
                stroke={color}
                strokeWidth="1.4"
            />

            {/* folded corner */}
            <path
                d="M14 2L20 8H14V2Z"
                fill={color}
                opacity="0.2"
            />

            {/* badge */}
            <rect
                x="5"
                y="14"
                width="14"
                height="5"
                rx="2"
                fill={color}
            />

            <text
                x="12"
                y="17.6"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="4"
                fontWeight="700"
                fill="white"
            >
                {label}
            </text>
        </svg>
    );
};


const FormatText = ({ ext }: { ext: string }) => {
    const formats: Record<string, string> = {
        ".pdf": "PDF Document",
        ".docx": "Word Document",
        ".txt": "Text Document",
        ".md": "Markdown Document",
        ".json": "JSON File",
        ".csv": "CSV File",
        ".jpg":"JPG File",
        ".jpeg":"JPEG File",
        ".png" :"PNG File",
        ".webp":"WEBP File",
        ".ts" :"TypeScript File",
        ".js":"JavaScript File",
        ".py":"Python File",
        ".java":"Java File",
        ".c":"C File",
        ".exe":"Executable File"
    };

    return <p>{formats[ext] ?? "Unknown File"}</p>;
};


export const FileListRow = ({ className, name, datemodified, type, size }: FileListRow) => {
    return (
        <>
            <div className={className}>{name}</div>
            <div className={className}>{datemodified}</div>
            <div className={className}><FormatText ext={`.${name.split(".")[1]}`} /></div>
            <div className={className}>{size}</div>
        </>
    )

}