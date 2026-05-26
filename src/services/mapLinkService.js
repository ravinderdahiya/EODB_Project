import axiosInstance from "../utils/axiosInstance";

const BASE_PATH = "/map-link";

export const resolveMapLink = async (url) => {
  const response = await axiosInstance.get(`${BASE_PATH}/resolve`, {
    params: { url },
  });
  return response.data;
};
