import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { GameRoom } from './pages/GameRoom';
import './App.css'

function App() {

  return (
   <Routes>

    <Route path='/' element={<Home />}></Route>
    <Route path='/room/:roomId' element={<GameRoom />}></Route>

   </Routes>
  )
}

export default App
