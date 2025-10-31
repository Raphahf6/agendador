import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // O seu CSS (Tailwind)
import { BrowserRouter } from "react-router-dom";
import { setupAxiosInterceptor } from './utils/axiosInterceptor.js';
import 'react-datepicker/dist/react-datepicker.css'; 
setupAxiosInterceptor();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> 
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
