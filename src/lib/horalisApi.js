import axios from 'axios';

import { auth } from '@/firebaseConfig';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken?.();
  if (!token) throw new Error('Sessao expirada. Faca login novamente.');
  return { Authorization: `Bearer ${token}` };
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export function normalizeAppointment(row = {}) {
  const startTime = firstDefined(row.start_time, row.startTime);
  const endTime = firstDefined(row.end_time, row.endTime);
  const servicePrice = Number(firstDefined(row.service_price, row.servicePrice, 0));

  return {
    ...row,
    id: row.id,
    start_time: startTime,
    end_time: endTime,
    startDate: parseDate(startTime),
    endDate: parseDate(endTime),
    customerName: firstDefined(row.customer_name, row.customerName, 'Cliente'),
    customerEmail: firstDefined(row.customer_email, row.customerEmail, ''),
    customerPhone: firstDefined(row.customer_phone, row.customerPhone, ''),
    serviceName: firstDefined(row.service_name, row.serviceName, 'Servico'),
    servicePrice: Number.isFinite(servicePrice) ? servicePrice : 0,
    durationMinutes: Number(firstDefined(row.duration_minutes, row.durationMinutes, 30)) || 30,
    professionalName: firstDefined(row.professional_name, row.professionalName, ''),
    professionalId: firstDefined(row.professional_id, row.professionalId, ''),
    paymentStatus: firstDefined(row.payment_status, row.paymentStatus, ''),
    status: firstDefined(row.status, 'confirmado'),
  };
}

export async function apiGet(path, config = {}) {
  const headers = await getAuthHeaders();
  return axios.get(`${API_BASE_URL}${path}`, {
    ...config,
    headers: { ...headers, ...(config.headers || {}) },
  });
}

export async function apiPost(path, data = {}, config = {}) {
  const headers = await getAuthHeaders();
  return axios.post(`${API_BASE_URL}${path}`, data, {
    ...config,
    headers: { ...headers, ...(config.headers || {}) },
  });
}

export async function apiPut(path, data = {}, config = {}) {
  const headers = await getAuthHeaders();
  return axios.put(`${API_BASE_URL}${path}`, data, {
    ...config,
    headers: { ...headers, ...(config.headers || {}) },
  });
}

export async function apiPatch(path, data = {}, config = {}) {
  const headers = await getAuthHeaders();
  return axios.patch(`${API_BASE_URL}${path}`, data, {
    ...config,
    headers: { ...headers, ...(config.headers || {}) },
  });
}

export async function apiDelete(path, config = {}) {
  const headers = await getAuthHeaders();
  return axios.delete(`${API_BASE_URL}${path}`, {
    ...config,
    headers: { ...headers, ...(config.headers || {}) },
  });
}

export async function fetchClinic(salaoId) {
  const response = await apiGet(`/admin/clientes/${salaoId}`);
  return response.data;
}

export async function fetchAppointments(salaoId, params = {}) {
  const response = await apiGet(`/admin/calendario/${salaoId}/agendamentos`, { params });
  return Array.isArray(response.data) ? response.data.map(normalizeAppointment) : [];
}
