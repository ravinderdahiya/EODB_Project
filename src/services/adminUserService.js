import axiosInstance from "@/utils/axiosInstance";

export const fetchUsersList = async (params = {}) => {
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `/user/users?${searchParams}` : "/user/users";
  const response = await axiosInstance.get(url);
  return response.data;
};
