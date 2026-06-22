import './global/file_exp.css'
import { Route, Routes } from 'react-router-dom'

import {ChatPage } from './pages/chat_page'


function App() {
  return (
    <>
    <Routes>

      <Route path="/" element={<ChatPage />} />
    </Routes>
    {/* <UsersFileExplorer/> */}
    </>
  )
}

export default App
 