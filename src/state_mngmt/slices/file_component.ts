import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";


type FileComponentState = {
    inProgress: boolean,
    file: File | null,
    upload: boolean,
    content: Array<Record<string, any>>
}

const initialState: FileComponentState = {
    inProgress: false,
    file: null,
    upload: false,
    content: []
}

const uploadFileToLLM = createAsyncThunk<string, string>(
    "filecomponent/upload_to_llm",
    async (filePath) => {
        return await window.electronAPI.uploadFile(filePath)
    }
);

const fileComponentSlice = createSlice({
    name: "filecomponent",
    initialState: initialState,
    reducers: {
        setFile(state, action: PayloadAction<{ file: File, upload: boolean }>) {
            state.file = action.payload.file
            state.upload = action.payload.upload
        },
        startUploading(state, payload) {

        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(uploadFileToLLM.pending, (state) => {
 
            })
    }

})