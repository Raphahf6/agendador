// frontend/src/pages/painel/HandleAuthActions.jsx
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode } from 'firebase/auth'; // Usamos verify para checar
import { auth } from '@/firebaseConfig';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

function HandleAuthActions() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const mode = searchParams.get('mode');
        const actionCode = searchParams.get('oobCode');

        if (!mode || !actionCode) {
            toast.error("Link inválido.");
            navigate('/login');
            return;
        }

        if (mode === 'resetPassword') {
            // Verificar a validade do código antes de redirecionar
            verifyPasswordResetCode(auth, actionCode)
                .then((email) => {
                    // O código é válido. Redireciona para a página de redefinição final
                    // passando o código como parâmetro
                    navigate(`/resetar-senha?code=${actionCode}`);
                })
                .catch((error) => {
                    toast.error("Link de redefinição expirado ou inválido. Tente novamente.");
                    navigate('/recuperar-senha');
                });
        }

        // Adicione outros 'else if (mode === '...'){' aqui para (ex: verificar e-mail)

    }, [searchParams, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-700" />
            <p className="text-gray-600 ml-3">Verificando link seguro...</p>
        </div>
    );
}

export default HandleAuthActions;
