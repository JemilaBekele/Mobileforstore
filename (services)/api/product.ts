// Import React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "@/(utils)/config";
import { useState } from 'react';

// Define interfaces (same as provided)
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

export interface BranchStock {
  branchId: string;
  shops: { [shopName: string]: number };
  stores: { [storeName: string]: number };
  totalShopStock: number;
  totalStoreStock: number;
  totalBranchStock: number;
}

export interface BranchTotal {
  branchId: string;
  shops: { [shopName: string]: number };
  stores: { [storeName: string]: number };
  totalShopStock: number;
  totalStoreStock: number;
  totalBranchStock: number;
}

export interface StockSummary {
  storeStocks: object;
  shopStocks: any;
  branchStocks: { [branchName: string]: BranchStock };
  totalShopStock: number;
  totalStoreStock: number;
  totalStock: number;
  batchStockDetails: BatchStockDetails[];
}

export interface OverallTotals {
  branchTotals: { [branchName: string]: BranchTotal };
  totalShopStock: number;
  totalStoreStock: number;
  totalAllStock: number;
}

export interface Branch {
  id: string;
  name: string;
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
  batches: any[];
  stockSummary: StockSummary;
  overallTotals?: OverallTotals;
}

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

// API function to fetch products
export const getAllProductsWithStock = async (): Promise<GetAllProductsResponse> => {
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

// API function to toggle product active status
export const toggleProductActiveStatus = async (productId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.put(`/products/${productId}/toggle-active`);
    return {
      success: true,
      message: response.data.message || "Product status updated successfully"
    };
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to toggle product active status"
    );
  }
};

// React Query hooks
export const useProductsQuery = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: getAllProductsWithStock,
  });
};

export const useToggleProductActiveMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleProductActiveStatus,
    onSuccess: () => {
      // Invalidate and refetch products query when mutation succeeds
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Pure utility functions (not hooks) to replace Redux selectors
export const filterProducts = (products: Product[], filters: any): Product[] => {
  let filtered = [...products];
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.productCode.toLowerCase().includes(searchTerm) ||
      product.generic?.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filters.category) {
    filtered = filtered.filter(product => product.categoryId === filters.category);
  }
  
  if (filters.status !== undefined) {
    filtered = filtered.filter(product => product.isActive === filters.status);
  }
  
  return filtered;
};

export const sortProducts = (products: Product[], sortOption: string): Product[] => {
  const sorted = [...products];
  
  switch (sortOption) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'code-asc':
      return sorted.sort((a, b) => a.productCode.localeCompare(b.productCode));
    case 'code-desc':
      return sorted.sort((a, b) => b.productCode.localeCompare(a.productCode));
    case 'stock-asc':
      return sorted.sort((a, b) => (a.stockSummary?.totalStock || 0) - (b.stockSummary?.totalStock || 0));
    case 'stock-desc':
      return sorted.sort((a, b) => (b.stockSummary?.totalStock || 0) - (a.stockSummary?.totalStock || 0));
    default:
      return sorted;
  }
};

// Utility functions to replace Redux selectors
export const selectFilteredAndSortedProducts = (
  products: Product[], 
  filters: any, 
  sortOption: string
): Product[] => {
  const filtered = filterProducts(products, filters);
  const sorted = sortProducts(filtered, sortOption);
  return sorted;
};

export const selectProductsCount = (products: Product[]): number => products.length;

export const selectProductsLoading = (isLoading: boolean, isFetching: boolean): boolean => isLoading || isFetching;

export const selectProductsError = (error: Error | null): string | null => error?.message || null;

export const selectUserAccessibleShops = (data: GetAllProductsResponse | undefined): Shop[] => 
  data?.userAccessibleShops || [];

// Custom hook that combines filtering and sorting (for convenience)
export const useFilteredAndSortedProducts = (
  products: Product[], 
  filters: any, 
  sortOption: string
): Product[] => {
  // This is a custom hook that uses pure functions internally
  return selectFilteredAndSortedProducts(products, filters, sortOption);
};

// Hook for managing filter state (optional)
export const useProductFilters = () => {
  const [filters, setFilters] = useState<any>({
    search: '',
    category: '',
    status: undefined,
  });
  
  const updateFilters = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
  };
  
  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: undefined,
    });
  };
  
  return {
    filters,
    updateFilters,
    clearFilters,
  };
};

// Hook for managing sort state (optional)
export const useProductSort = () => {
  const [sortOption, setSortOption] = useState<string>('name-asc');
  
  const updateSort = (newSortOption: string) => {
    setSortOption(newSortOption);
  };
  
  return {
    sortOption,
    updateSort,
  };
};