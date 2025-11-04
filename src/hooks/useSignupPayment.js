import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { parseApiError } from '@/utils/apiHelpers';
// --- CONFIGURAÇÕES GLOBAIS ---
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

// --- NOVO HELPER: Captura o Device ID ---
// Se o script de segurança do MP estiver carregado, ele cria este input oculto.
const getDeviceId = () => {
    const input = document.getElementById('__mpoffline_device_id');
    return input ? input.value : null;
};
// ----------------------------------------


export function useSignupPayment(isModalOpen) {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [step, setStep] = useState(1);
    const [pixData, setPixData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Dados do Formulário
    const [formData, setFormData] = useState({
        email: '', password: '', confirmPassword: '',
        nomeSalao: '', whatsapp: '', cpf: ''
    });

    const updateFormField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);
    
    // Reset de estado ao fechar
    useEffect(() => {
        if (!isModalOpen) {
            setStep(1);
            setPixData(null);
            setError('');
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        }
    }, [isModalOpen, pollingInterval]);

    // 1. POLLING PARA CONFIRMAÇÃO DO PIX (MANTIDO)
    const startPolling = useCallback((paymentId) => {
        // ... (código startPolling) ...
        if (pollingInterval) clearInterval(pollingInterval);

        let checks = 0;
        const maxChecks = 40; // 2 minutos

        const interval = setInterval(async () => {
            checks++;
            if (checks >= maxChecks) {
                clearInterval(interval);
                setPollingInterval(null);
                setError("Tempo limite excedido. O pagamento ainda está pendente. Verifique o login em instantes.");
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/auth/check-payment-status/${paymentId}`);
                const status = response.data.status;

                if (status === 'approved') {
                    clearInterval(interval);
                    setPollingInterval(null);
                    setStep(4); // Sucesso
                    return;
                }

                if (status !== 'pending' && status !== 'trialing') {
                    clearInterval(interval);
                    setPollingInterval(null);
                    setError(response.data.message || "Pagamento rejeitado. Tente novamente.");
                    setStep(1); 
                }
            } catch (error) {
                // Continua o polling em caso de erro de rede temporário.
            }
        }, 3000);

        setPollingInterval(interval);
    }, [pollingInterval]);


    // 2. Validação do Formulário e Avanço (ETAPA 1) (MANTIDO)
    const handleFormSubmit = useCallback((e) => {
        e.preventDefault();
        setError('');

        const { password, confirmPassword, nomeSalao, whatsapp, cpf } = formData;
        
        if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
        if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
        if (!nomeSalao.trim()) { setError("O nome do salão é obrigatório."); return; }
        const cleanedWhatsapp = whatsapp.replace(/\D/g, '');
        if (cleanedWhatsapp.length < 10 || cleanedWhatsapp.length > 11) { setError("Telefone inválido."); return; }
        const cleanedCpf = cpf.replace(/\D/g, '');
        if (cleanedCpf.length !== 11) { setError("CPF inválido. Deve conter 11 dígitos."); return; }

        setStep(2); // Avança para o pagamento
    }, [formData]);


    // 3. Pagamento com Cartão (ETAPA 2) - ADICIONANDO device_id MANUALMENTE
     const handleCardPaymentSubmit = useCallback((cardData) => {
        setLoading(true);
        setError('');

        // -----------------------------------------------------------------------------------
        // VALIDAÇÃO CRÍTICA DO BRICK (REMOVIDA TEMPORARIAMENTE PARA DEBUG)
        // Deixamos a tokenização falhar para que o backend devolva o erro detalhado do MP.
        // -----------------------------------------------------------------------------------

        const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, '');
        const formattedWhatsapp = `+55${cleanedWhatsapp}`;
        const deviceId = getDeviceId(); 
        const cleanedCpf = formData.cpf.replace(/\D/g, ''); 
        console.log(cardData)

        const payload = {
            // Campos que vêm do Formulário
            email: formData.email, 
            // >>> MUDANÇA CRÍTICA: Assegura que a senha seja uma string válida e vem APENAS do formData
            // Converte para string e usa 'none' se estiver vazio, embora o Pydantic espere a senha real
            password: String(formData.password), 
            nome_salao: formData.nomeSalao.trim(), 
            client_whatsapp_id: cleanedWhatsapp, 
            numero_whatsapp: formattedWhatsapp, 

            // CAMPOS CRÍTICOS DO CARTÃO: Agora passamos o que vier do cardData (pode ser null/undefined)
            // Se o Brick falhou (token, payment_method_id ausentes), o backend receberá null e deve rejeitar a transação.
            payment_method_id: cardData.formData.payment_method_id || null, 
            transaction_amount: VITE_SETUP_PRICE, 
            token: cardData.formData.token || null,
            
            // ... (Campos opcionais e Payer Data) ...
            issuer_id: cardData.formData.issuer_id || null,
            installments: cardData.formData.installments || 1,
            device_id: deviceId || null, 
            
            payer: {
                email: formData.email, 
                identification: {
                    type: 'CPF', 
                    number: cleanedCpf,
                },
                entity_type: 'individual'
            }
        };

        // ... (código de requisição axios.post) ...
        return new Promise((resolve, reject) => {
            axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload)
                .then((response) => {
                    setLoading(false);
                    if (response.data.status === 'approved') {
                        setStep(4);
                        resolve();
                    } else {
                        // O Mercado Pago está rejeitando no backend, mas a resposta é 200/201.
                        // O payload precisa ser {status, message}
                        setError(response.data.message || "Pagamento em análise ou pendente.");
                        reject(new Error(response.data.message || "Pagamento pendente.")); 
                    }
                })
                .catch((err) => {
                    setLoading(false);
                    const friendlyError = parseApiError(err);
                    setError(friendlyError);
                    
                    // Se o 422 retornar, logamos o detalhe
                    if (err.response && err.response.status === 422) {
                        console.error("ERRO 422 - Detalhes da Validação Pydantic:", err.response.data.detail);
                        console.log(cardData)
                    }
                    
                    reject(new Error(friendlyError));
                });
        });
    }, [formData]);


    // 4. Pagamento com PIX (ETAPA 2) - ADICIONANDO entity_type MANUALMENTE
    const handlePixPayment = useCallback(async () => {
        setLoading(true);
        setError(''); setPixData(null);

        const cleanedCpf = formData.cpf.replace(/\D/g, '');
        const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, '');
        const formattedWhatsapp = `+55${cleanedWhatsapp}`;
        
        const deviceId = getDeviceId(); // CAPTURA MANUAL AQUI
        

        const payload = {
            email: formData.email, 
            password: formData.password, 
            nome_salao: formData.nomeSalao.trim(), 
            client_whatsapp_id: cleanedWhatsapp, 
            numero_whatsapp: formattedWhatsapp, 
            device_id: deviceId,
            
            payment_method_id: 'pix', 
            transaction_amount: VITE_SETUP_PRICE,
            
            // ADIÇÃO CRÍTICA DO entity_type:
            payer: { 
                email: formData.email, 
                identification: { type: 'CPF', number: cleanedCpf },
                entity_type: 'individual' // <<< ADICIONADO AQUI
            }
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload);

            const { qr_code, qr_code_base64, payment_id } = response.data?.payment_data || {};

            if (qr_code && qr_code_base64 && payment_id) {
                setPixData({ qr_code, qr_code_base64, payment_id });
                setStep(3); 
                startPolling(payment_id);
            } else {
                setError("Ocorreu um erro ao gerar o PIX. Dados incompletos da API.");
                setStep(1);
            }

        } catch (err) {
            const friendlyError = parseApiError(err);
            setError(friendlyError);
            setStep(1);
        } finally {
            setLoading(false);
        }
    }, [formData, startPolling]);


    // Retorna todos os dados e manipuladores
    return {
        step, setStep,
        formData, updateFormField,
        pixData,
        error, setError,
        loading,
        handleFormSubmit,
        handleCardPaymentSubmit,
        handlePixPayment,
        navigate,
    };
}
