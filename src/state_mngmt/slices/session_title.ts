import { createSlice, PayloadAction } from "@reduxjs/toolkit";


interface SessionTitleState{
    id?:string | null;
    title?:string | null,
}

const initialState:SessionTitleState={
    id:null,
    title:null
}

const sessionTitleSlice=createSlice({
    name:"sessionTitle",
    initialState,
    reducers:{
        updateSession(state,action:PayloadAction<Record<string,string>>){
            state.id=action.payload.id;
            state.title=action.payload.id;
        }
    }
})

export const {updateSession}=sessionTitleSlice.actions;
export default sessionTitleSlice.reducer
