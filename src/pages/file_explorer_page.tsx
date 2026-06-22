import { FileListRow } from "../components/filelist_row";
import "../style/file_explorer_page.css";


export const FileExplorerPage = () => {
    return (
        <div className="file_exp_page">
            <div className="file_exp_content">
                <FileListRow className="file_exp_cell header" name="FileName" datemodified="Date Modified" type="Type" size="Size"/> 

           
                <FileListRow className="file_exp_cell" name="Nadeem File 1.md" datemodified="17th August" type=".md" size="56lb"/>
                <FileListRow className="file_exp_cell" name="Nadeem File 2.docx" datemodified="17th August" type=".docx" size="56lb"/>


             
            </div>


        </div>
    )
}