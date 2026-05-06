import axiosInstance from "../utils/axiosInstance";

const BASE_PATH = "/api-url";

export const fetchApiUrls = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `${BASE_PATH}?${searchParams}` : BASE_PATH;
  const response = await axiosInstance.get(url);
  return response.data;
};

export const fetchApiUrl = async (id) => {
  const response = await axiosInstance.get(`${BASE_PATH}/${id}`);
  return response.data;
};

export const createApiUrl = async (payload) => {
  const response = await axiosInstance.post(BASE_PATH, payload);
  return response.data;
};

export const updateApiUrl = async (id, payload) => {
  const response = await axiosInstance.put(`${BASE_PATH}/${id}`, payload);
  return response.data;
};

export const deleteApiUrl = async (id) => {
  const response = await axiosInstance.delete(`${BASE_PATH}/${id}`);
  return response.data;
};

export const toggleApiUrlStatus = async (id) => {
  const response = await axiosInstance.patch(`${BASE_PATH}/${id}/toggle`);
  return response.data;
};

export const fetchApiUrlCategories = async () => {
  const response = await axiosInstance.get(`${BASE_PATH}/categories`);
  return response.data;
};
