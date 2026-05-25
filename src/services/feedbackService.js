import axiosInstance from "@/utils/axiosInstance";

export const submitFeedback = async (payload) => {
  const response = await axiosInstance.post("/feedback/submit", payload);
  return response.data;
};

export const fetchFeedbackHistory = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `/feedback/history?${searchParams}` : "/feedback/history";
  const response = await axiosInstance.get(url);
  return response.data;
};
