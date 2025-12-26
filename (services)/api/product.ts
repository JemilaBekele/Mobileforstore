import api from "@/(utils)/config";

// Batch stock organized by branch
export interface BatchBranchStockDetails {
  shops: { [shopName: string]: number };
  stores: { [storeName: string]: number };
  totalStock: number;
}

export interface BatchStockDetails {
  warningQuantity: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string | null;
  price: number | null;
  branchStocks: { [branchName: string]: BatchBranchStockDetails };
  totalStock: number;
}

// Branch stock structure
export interface BranchStock {
  branchId: string;
  shops: { [shopName: string]: number };
  stores: { [storeName: string]: number };
  totalShopStock: number;
  totalStoreStock: number;
  totalBranchStock: number;
}

// Overall totals branch structure
export interface BranchTotal {
  branchId: string;
  shops: { [shopName: string]: number };
  stores: { [storeName: string]: number };
  totalShopStock: number;
  totalStoreStock: number;
  totalBranchStock: number;
}

// Updated StockSummary interface
export interface StockSummary {
  storeStocks: object;
  shopStocks: any;
  branchStocks: { [branchName: string]: BranchStock };
  totalShopStock: number;
  totalStoreStock: number;
  totalStock: number;
  batchStockDetails: BatchStockDetails[];
}

// Overall totals structure
export interface OverallTotals {
  branchTotals: { [branchName: string]: BranchTotal };
  totalShopStock: number;
  totalStoreStock: number;
  totalAllStock: number;
}

// Branch info for shop
export interface Branch {
  id: string;
  name: string;
}

// Updated AdditionalPrice with branch info
export interface AdditionalPrice {
  id: string;
  label: string | null;
  price: number;
  productId: string;
  shopId: string | null;
  shop: {
    id: string;
    name: string;
    branch: Branch;
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
  overallTotals?: OverallTotals;
}

// Updated Shop interface with branch
export interface Shop {
  id: string;
  name: string;
  branch: Branch;
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