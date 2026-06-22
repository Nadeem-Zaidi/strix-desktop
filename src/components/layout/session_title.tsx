import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react";
import { updateSession } from "../../state_mngmt/slices/session_title";

interface SessionTitleType{
    id:string;
    title:string;
}

export const SessionTitle=({id,title}:SessionTitleType)=>{
    const dispatch=useDispatch();

    useEffect(()=>{
        dispatch(updateSession({id:id,title:title}))
        
    },[id,title])

    return (
        <div className="session_title">
            <div className="session_title">{id}</div>
        </div>
    )

}