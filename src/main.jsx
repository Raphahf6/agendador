import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // O seu CSS (Tailwind)
import { BrowserRouter } from "react-router-dom";
import { setupAxiosInterceptor } from './utils/axiosInterceptor.js';
import 'react-datepicker/dist/react-datepicker.css'; 
setupAxiosInterceptor();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registrado com sucesso:', registration.scope);
      })
      .catch((err) => {
        console.log('Falha no SW:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
