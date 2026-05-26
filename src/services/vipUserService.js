import axiosInstance from "../utils/axiosInstance";

const BASE_PATH = "/vip-users";

export const fetchVipUsers = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `${BASE_PATH}?${searchParams}` : BASE_PATH;
  const response = await axiosInstance.get(url);
  return response.data;
};

export const createVipUser = async (payload) => {
  const response = await axiosInstance.post(BASE_PATH, payload);
  return response.data;
};

export const updateVipUser = async (id, payload) => {
  const response = await axiosInstance.put(`${BASE_PATH}/${id}`, payload);
  return response.data;
};

export const deleteVipUser = async (id) => {
  const response = await axiosInstance.delete(`${BASE_PATH}/${id}`);
  return response.data;
};

export const toggleVipUserStatus = async (id) => {
  const response = await axiosInstance.patch(`${BASE_PATH}/${id}/toggle`);
  return response.data;
};
