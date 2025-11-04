/**
 * Configurações de Preços e Transações da Horalis Pro.
 * Lê variáveis de ambiente do Frontend (usando import.meta.env ou process.env)
 * para exibição, usando valores padrão como fallback.
 */

// Função auxiliar para ler variáveis de ambiente do frontend de forma segura
const getEnvFloat = (key, fallback) => {
    // 1. Tenta ler via import.meta.env (Padrão Vite/Moderno)
    const viteValue = import.meta.env[key];
    if (viteValue !== undefined) {
        return parseFloat(viteValue) || fallback;
    }

    return fallback;
};

                                       
// Tenta ler a variável de ambiente, senão usa fallback 19.90
export const MONTHLY_PRICE_AMOUNT = getEnvFloat('VITE_SETUP_PRICE')
// Formatos de exibição
export const DISPLAY_PRICE_SETUP = `R$ ${MONTHLY_PRICE_AMOUNT.toFixed(2).replace('.', ',')}`;
