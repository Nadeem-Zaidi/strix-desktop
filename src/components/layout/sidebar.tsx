import "../../global/chat.css"

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faPenToSquare,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { useDispatch, useSelector } from 'react-redux'
import { toggleSideBar } from '../../state_mngmt/slices/toggle_sidebar'
import { useEffect } from "react"
import { fetchMessages, fetchSessions, setCurrentSession } from "../../state_mngmt/slices/message_slice"
import { useAppDispatch, useAppSelector } from "../../state_mngmt/store"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../firebase/firebase_config"
import { changeChatMode } from "../../state_mngmt/slices/chat_mode_slice"
import { useNavigate } from "react-router-dom"
import { loadSessions, newSession, switchSession } from "../../state_mngmt/slices/session_slice"
import { SessionTitle } from "./session_title"
import { IngestPanel } from "../ingest"

export const SideDrawer = () => {
  const navigate = useNavigate();
  const showSideBar = useSelector((state: any) => state.sideBar.showSideBar)
  const dispatch = useAppDispatch()
  const appDispatch = useAppDispatch()
  const { sessions, activeSessionId } = useAppSelector(state => state.session)

  const toggleSideBarFunc = () => {
    dispatch(toggleSideBar())
  }

  const handleClick = (s: string) => {
    appDispatch(setCurrentSession(s));
    dispatch(changeChatMode(true));
  }

  const newChat=()=>{
    dispatch(newSession())
    dispatch(changeChatMode(false));
  }

  useEffect(() => { 
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        appDispatch((loadSessions()))
      }
    })
    return () => unsubscribe()
  }, [appDispatch])

  return (
    <div className={showSideBar ? "sidebar" : "sidebar collapsed"}>
      <div className="sidebar_topsection">
        {showSideBar && <h2 className="sidebar_brand">Strix</h2>}
        <button className="toggle_btn" onClick={toggleSideBarFunc}>
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      <ul className="menu">
        <li className="menu_item" onClick={newChat}>
          <FontAwesomeIcon icon={faPenToSquare} className="menu_icon" />
          <span>New chat</span>
        </li>
        <li className="menu_item">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="menu_icon" />
          <span>Search chats</span>
        </li>
    
          {/* <span onClick={()=>navigate("/file_explorer")}>Create RAG</span> */}
          <IngestPanel/>
    
      </ul>

      {/* ─── Chat History ────────────────────────────── */}
      {showSideBar && <div className="sidebar_chat_section">
        {showSideBar && <div className="chat_section_label">Recents</div>}
        {sessions?.map((session) => (
          <div
            key={session.id}
            className={`chat_history_item ${session.id === activeSessionId ? "chat_history_active" : ""}`}
            onClick={() => handleClick(session.id)}
          >
            <span className="chat_history_title" onClick={()=>{dispatch(switchSession(session.id))}}>{session.title || "New Chat"}</span>
            {/* <SessionTitle id={session.id} title={session.title ?? "New Chat"}/> */}
          </div>
        ))}
      </div>}

      {/* ─── Bottom ──────────────────────────────────── */}
      <div className="sidebar_bottom_section">
        {showSideBar && (
          <div className="sidebar_user_profile">
            <div className="user_avatar">
              {auth.currentUser?.displayName
                ?.split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </div>
            <div className="user_info">
              <span className="user_name">{auth.currentUser?.displayName}</span>
              <span className="user_plan">Free plan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
