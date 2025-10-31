// frontend/src/utils/axiosInterceptor.js
import axios from 'axios';
import { auth } from '../firebaseConfig'; // Importe seu objeto de autenticação

export const setupAxiosInterceptor = () => {
    // Adiciona um interceptor de requisição
    axios.interceptors.request.use(async (config) => {
        const user = auth.currentUser;
        
        // Verifica se existe um usuário logado
        if (user) {
            try {
                // Obtém o token atualizado do Firebase
                const token = await user.getIdToken();
                
                // Define o token no cabeçalho Authorization
                config.headers.Authorization = `Bearer ${token}`;
            } catch (error) {
                console.error("Erro ao obter o token Firebase:", error);
                // Permite a requisição falhar com 401/403 no backend
            }
        }
        
        return config;
    }, (error) => {
        return Promise.reject(error);
    });
};