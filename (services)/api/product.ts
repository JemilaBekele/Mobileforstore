import api from "@/(utils)/config";
// Product related types
export interface BatchStockDetails {
  batchId: string;
  batchNumber: string;
  expiryDate: string | null;
  price: number | null;
  shopStocks: { [shopName: string]: number };
  storeStocks: { [storeName: string]: number };
  totalStock: number;
}

export interface StockSummary {
  shopStocks: { [shopName: string]: number };
  storeStocks: { [storeName: string]: number };
  totalShopStock: number;
  totalStoreStock: number;
  totalStock: number;
  batchStockDetails: BatchStockDetails[];
}

export interface AdditionalPrice {
  id: string;
  label: string | null;
  price: number;
  productId: string;
  shopId: string | null;
  shop: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  generic: string | null;
  description: string | null;
  categoryId: string;
  subCategoryId: string | null;
  sellPrice: string | null;
  imageUrl: string;
  unitOfMeasureId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  };
  subCategory: {
    id: string;
    name: string;
  } | null;
  unitOfMeasure: {
    id: string;
    name: string;
    symbol: string | null;
    base: boolean;
  };
  AdditionalPrice: AdditionalPrice[];
  batches: any[]; // You can define a more specific type if needed
  stockSummary: StockSummary;
  overallTotals?: any; // Define this type if needed
}

export interface Shop {
  id: string;
  name: string;
}

export interface GetAllProductsResponse {
  success: boolean;
  products: Product[];
  count: number;
  userAccessibleShops: Shop[];
  message?: string;
}

export const getAllProductsWithStock = async (
): Promise<GetAllProductsResponse> => {
  try {
    const response = await api.get("/all/Products/stock/employee");
    
    return {
      success: true,
      products: response.data.data.products || [],
      count: response.data.data.count || 0,
      userAccessibleShops: response.data.data.userAccessibleShops || [],
    };
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch products with stock"
    );
  }
};