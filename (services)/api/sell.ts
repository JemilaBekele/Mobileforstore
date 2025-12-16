import api from "@/(utils)/config";
import { DeliveryData, GetAllSellsUserParams, GetAllSellsUserResponse, ProductBatch } from "@/(utils)/types";


export const getAllSellsUser = async (
  params: GetAllSellsUserParams
): Promise<GetAllSellsUserResponse> => {
  try {
        const response = await api.get("/sells/store/getAll", {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
      }
    });    
    return {
      success: true,
      sells: response.data.sells || [],
      count: response.data.count || 0,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch user sells");
  }
};





export const getSellByIdByUser = async (
  params: GetAllSellsUserParams
): Promise<GetAllSellsUserResponse> => {
  try {
    const response = await api.get(`/sells/${params.id}/user/based`); 
    
    // Check if sell exists
    const sellData = response.data.sell;

    
    return {
      success: true,
      sells: sellData ? [sellData] : [],  // ✅ Wrap single sell in array
      count: response.data.count || (sellData ? 1 : 0),
    };
  } catch (error: any) {
    console.error('❌ API Error:', error);
    throw new Error(error.response?.data?.message || "Failed to fetch user sells");
  }
};

// Get available batches by product and shop
export const getAvailableBatchesByProductAndShop = async (
  shopId: string,
  productId: string
): Promise<{ success: boolean; batches: ProductBatch[]; count: number }> => {
  try {
    console.log('🔍 Fetching batches for shopId:', shopId, 'and productId:', productId);
    const response = await api.get(
      `/shops/${shopId}/products/${productId}/batches`
    );
    console.log('🔍 Batches response:', response.data);
    return {
      success: true,
      batches: response.data.batches || [],
      count: response.data.count || 0,
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch available batches");
  }
};

// Partial sale delivery
export const partialSaleDelivery = async (
  id: string,
  deliveryData: DeliveryData
): Promise<{ success: boolean; sell: any; message: string }> => {
  try {
    const response = await api.patch(`/sells/partial/deliver/${id}`, {
      deliveryData
    });
    return {
      success: true,
      sell: response.data.sell,
      message: response.data.message || "Partial delivery completed successfully",
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to process partial delivery");
  }
};