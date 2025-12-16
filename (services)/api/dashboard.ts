// services/api/dashboard.ts
import api from "@/(utils)/config";

export const getUserDashboardSummary = async (params: any): Promise<any> => {
  try {
    const response = await api.get("/reports/sales/user/dashboard");
    return response.data; // This should be the actual dashboard data object
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch user dashboard summary"
    );
  }
};