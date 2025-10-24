import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // O seu CSS (Tailwind)
import { BrowserRouter } from "react-router-dom";

// --- IMPORTAÇÕES DE CSS DE BIBLIOTECAS EXTERNAS ---


// Importa o CSS do react-datepicker (que estamos a usar no AppointmentScheduler)
import 'react-datepicker/dist/react-datepicker.css'; 




ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
