import { useEffect, useState } from "react"
import { FileAttachment, LLMFileUploadResponse } from "../../types_and_interfaces/types"

type FileComponentProps = {
    file: FileAttachment,
    upload: boolean,
    index: number
    fileIdAccumulator: (uploadResponse:LLMFileUploadResponse) => void,
    removeFile: (index: number) => void
}
type UploadState = "idle" | "uploading" | "done" | "error"

const CircularProgress = ({ progress = 75, size = 28 }: { progress?: number; size?: number }) => {
    const radius = (size - 4) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (progress / 100) * circumference

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border-tertiary)"
                strokeWidth={2.5}
            />
            {/* Progress arc */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
        </svg>
    )
}

const FileIcon = ({ extension }: { extension: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
)

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)



export const FileComponent = ({ file, upload, index, fileIdAccumulator, removeFile }: FileComponentProps) => {
    const [uploadState, setUploadState] = useState<UploadState>("idle")
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string>("")

    const getFileId = async () => {
        try {
            setUploadState("uploading")
            setProgress(0)
            const ticker = setInterval(() => {
                setProgress(prev => (prev < 85 ? prev + Math.random() * 12 : prev))
            }, 300)

            const fileId = await window.electronAPI.uploadFile(file.path)

            clearInterval(ticker)
            setProgress(100)
            setUploadState("done")
            fileIdAccumulator({name:file.name,extension:file.extension,fileId:fileId,isImage:file.isImage})
        } catch (err: any) {
            setError(err?.message ?? "Upload failed")
            setUploadState("error")
        }
    }

    useEffect(() => {
        if (!upload) return
        getFileId()
    }, [upload])

    return (
        <div key={`file-${index}`} className="pasted_content">
            <div className="pasted_content_icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: 32, height: 32 }}>
                {uploadState === "idle" && <FileIcon extension={file.extension} />}

                {uploadState === "uploading" && (
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress progress={progress} size={28} />
                        <span style={{
                            position: "absolute",
                            fontSize: 7,
                            fontWeight: 600,
                            color: "#3b82f6",
                            letterSpacing: "-0.3px"
                        }}>
                            {Math.round(progress)}
                        </span>
                    </div>
                )}

                {uploadState === "done" && (
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CircularProgress progress={100} size={28} />
                        <CheckIcon />
                    </div>
                )}

                {uploadState === "error" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                )}
            </div>

            <div className="pasted_content_meta iconclass">
                <p className="pasted_content_text">{file.name}</p>
                <span className="pasted_content_type" style={{ color: uploadState === "error" ? "#ef4444" : undefined }}>
                    {uploadState === "error" ? error : file.extension}
                </span>
            </div>

            {uploadState !== "uploading" && (
                <button className="pasted_content_remove" onClick={() => removeFile(index)}>×</button>
            )}
        </div>
    )
}