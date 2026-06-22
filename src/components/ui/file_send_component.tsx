import { ListTile } from "./list_tile"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf,
    faFileWord,
    faFileExcel,
    faFileImage,
    faFileVideo,
    faFileAudio,
    faFileCode,
    faFileZipper,
    faFile,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const fileIconMap: Record<string, IconDefinition> = {
    // documents
    pdf: faFilePdf,
    doc: faFileWord,
    docx: faFileWord,
    xls: faFileExcel,
    xlsx: faFileExcel,
    // images
    png: faFileImage,
    jpg: faFileImage,
    jpeg: faFileImage,
    gif: faFileImage,
    webp: faFileImage,
    // video
    mp4: faFileVideo,
    mov: faFileVideo,
    avi: faFileVideo,
    // audio
    mp3: faFileAudio,
    wav: faFileAudio,
    // code
    ts: faFileCode,
    tsx: faFileCode,
    js: faFileCode,
    jsx: faFileCode,
    json: faFileCode,
    // archives
    zip: faFileZipper,
    rar: faFileZipper,
};

const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const icon = fileIconMap[ext] ?? faFile; // faFile as fallback
    return () => <FontAwesomeIcon icon={icon} />;
};

type SendFileAttachment = {
    fileName: string,
}

export const SendFileAttachment = ({ fileName }: SendFileAttachment) => {
    return (
        <ListTile
            leading={getFileIcon(fileName)}
            heading={fileName}
            width={400}
            height={64}
        />
    );

}