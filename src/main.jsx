// frontend/src/main.jsx (Com BrowserRouter)
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from "react-router-dom"; // <<< NOVO IMPORT
import 'react-datepicker/dist/react-datepicker.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)