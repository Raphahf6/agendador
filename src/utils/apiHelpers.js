// src/utils/apiHelpers.js

/**
 * Analisa a resposta de erro do Axios para retornar uma mensagem amigável.
 * @param {object} err - O objeto de erro retornado pelo catch do Axios.
 * @returns {string} Mensagem de erro amigável.
 */
export const parseApiError = (err) => {
    const defaultError = "Ocorreu um erro. Verifique os dados e tente novamente.";
    try {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') { return detail; }
        if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) { return detail[0].msg; }
        if (typeof detail === 'object' && detail !== null && detail.msg) { return detail.msg; }
        return defaultError;
    } catch (e) {
        return defaultError;
    }
};