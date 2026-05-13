import axiosInstance from "@/utils/axiosInstance";

export const fetchAnalyticsSummary = async (days = 14) => {
  const response = await axiosInstance.get(`/analytics/summary?days=${days}`);
  return response.data;
};

export const fetchAnalyticsEvents = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `/analytics/events?${searchParams}` : "/analytics/events";
  const response = await axiosInstance.get(url);
  return response.data;
};
