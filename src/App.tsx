import './global/file_exp.css'
import { Route, Routes } from 'react-router-dom'
import { AuthMain } from './authentication/authentication_main'
import {ChatPage } from './pages/chat_page'
import { FE } from './components/fe'
import { FileExplorerPage } from './pages/file_explorer_page'


function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route path="/chathome" element={<ChatPage />} />
    </Routes>
    {/* <UsersFileExplorer/> */}
    </>
  )
}

export default App
 