import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/firebaseConfig'; // Supondo que você exporte 'auth' aqui
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

function ResetarSenhaPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Captura o código 'code' que foi passado pelo HandleAuthActions
    const actionCode = searchParams.get('code'); 

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Validação inicial do código de ação
    if (!actionCode) {
        toast.error("Código de redefinição não encontrado. Retornando ao login.");
        navigate('/login');
        return null; // Não renderiza nada se o código não estiver presente
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (newPassword.length < 6) {
            toast.error("A senha deve ter pelo menos 6 caracteres.");
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            setIsLoading(false);
            return;
        }

        try {
            // Chama a função do Firebase para redefinir a senha
            await confirmPasswordReset(auth, actionCode, newPassword);
            
            toast.success("✅ Senha redefinida com sucesso! Por favor, faça login.");
            navigate('/login');

        } catch (error) {
            // Em caso de erro (código expirado, código já usado, etc.)
            console.error("Erro ao redefinir senha:", error);
            toast.error("❌ Falha na redefinição. O link pode ter expirado ou o código é inválido.");
            // Redireciona para a página de recuperação, caso o usuário queira tentar novamente.
            navigate('/recuperar-senha'); 
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Definir Nova Senha</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            Nova Senha
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirmar Nova Senha
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Redefinindo...
                            </>
                        ) : (
                            'Redefinir Senha'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetarSenhaPage;