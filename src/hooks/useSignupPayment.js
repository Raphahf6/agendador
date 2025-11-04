// src/hooks/useSignupPayment.js
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { parseApiError } from '@/utils/apiHelpers';

// --- CONFIGURAÇÕES GLOBAIS ---
const API_BASE_URL = "https://api-agendador.onrender.com/api/v1";

export function useSignupPayment(isModalOpen) {
    const navigate = useNavigate();

    // --- ESTADOS ---
    const [step, setStep] = useState(1);
    const [pixData, setPixData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Dados do Formulário (Centralizados no Hook)
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

    // --- FUNÇÕES DE EFEITO COLATERAL ---

    // 1. POLLING PARA CONFIRMAÇÃO DO PIX
    const startPolling = useCallback((paymentId) => {
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


    // 2. Validação do Formulário e Avanço (ETAPA 1)
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


    // 3. Pagamento com Cartão (ETAPA 2)
    const handleCardPaymentSubmit = useCallback((cardData) => {
        setLoading(true);
        setError('');

        const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, ''); // Limpo
        const formattedWhatsapp = `+55${cleanedWhatsapp}`; // Formatado

        const payload = {
            email: formData.email, 
            password: formData.password, 
            nome_salao: formData.nomeSalao.trim(), 
            
            // NOVO CAMPO: ID do cliente sem prefixo (para uso interno)
            client_whatsapp_id: cleanedWhatsapp, 
            
            // NOME ORIGINAL: Número formatado (+55) para APIs de notificação
            numero_whatsapp: formattedWhatsapp, 
            
            // Dados do Mercado Pago
            ...cardData,
        };

        return new Promise((resolve, reject) => {
            axios.post(`${API_BASE_URL}/auth/criar-conta-paga`, payload)
                .then(() => {
                    setLoading(false);
                    setStep(4); // Sucesso
                    resolve();
                })
                .catch((err) => {
                    setLoading(false);
                    const friendlyError = parseApiError(err);
                    setError(friendlyError);
                    reject(new Error(friendlyError)); 
                });
        });
    }, [formData]);


    // 4. Pagamento com PIX (ETAPA 2)
    const handlePixPayment = useCallback(async () => {
        setLoading(true);
        setError(''); setPixData(null);

        const cleanedCpf = formData.cpf.replace(/\D/g, '');
        const cleanedWhatsapp = formData.whatsapp.replace(/\D/g, ''); // Limpo
        const formattedWhatsapp = `+55${cleanedWhatsapp}`; // Formatado

        const payload = {
            email: formData.email, 
            password: formData.password, 
            nome_salao: formData.nomeSalao.trim(), 
            
            // NOVO CAMPO: ID do cliente sem prefixo (para uso interno)
            client_whatsapp_id: cleanedWhatsapp, 
            
            // NOME ORIGINAL: Número formatado (+55) para APIs de notificação
            numero_whatsapp: formattedWhatsapp, 
            
            payment_method_id: 'pix', 
            transaction_amount: 0.99,
            payer: { email: formData.email, identification: { type: 'CPF', number: cleanedCpf } }
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