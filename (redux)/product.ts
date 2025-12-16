import { AdditionalPrice, BatchStockDetails, GetAllProductsResponse, getAllProductsWithStock, Product, Shop } from "@/(services)/api/product";
import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";


// Async thunk for fetching products with stock
export const fetchProductsWithStock = createAsyncThunk(
  "products/fetchProductsWithStock",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllProductsWithStock();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch products with stock");
    }
  }
);

// Define the state interface
interface ProductsState {
  products: Product[];
  userAccessibleShops: Shop[];
  loading: boolean;
  error: string | null;
  count: number;
  filters: {
    categoryId?: string;
    subCategoryId?: string;
    isActive?: boolean;
    searchTerm?: string;
    minStock?: number;
    maxStock?: number;
    shopId?: string;
  };
  sortBy: {
    field: keyof Product | 'totalStock' | 'price';
    direction: 'asc' | 'desc';
  };
}

const initialState: ProductsState = {
  products: [],
  userAccessibleShops: [],
  loading: false,
  error: null,
  count: 0,
  filters: {},
  sortBy: {
    field: 'name',
    direction: 'asc'
  },
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearProducts: (state) => {
      state.products = [];
      state.count = 0;
      state.error = null;
      state.filters = {};
      state.sortBy = {
        field: 'name',
        direction: 'asc'
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<ProductsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    updateSort: (state, action: PayloadAction<Partial<ProductsState['sortBy']>>) => {
      state.sortBy = { ...state.sortBy, ...action.payload };
    },
    // Update product stock (for real-time updates)
    updateProductStock: (state, action: PayloadAction<{ 
      productId: string; 
      shopId?: string;
      storeId?: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product && product.stockSummary) {
        const { shopId, storeId, quantity, operation } = action.payload;
        
        if (shopId) {
          const currentStock = product.stockSummary.shopStocks[shopId] || 0;
          product.stockSummary.shopStocks[shopId] = operation === 'set' 
            ? quantity 
            : operation === 'add' 
              ? currentStock + quantity 
              : Math.max(0, currentStock - quantity);
        }
        
        if (storeId) {
          const currentStock = product.stockSummary.storeStocks[storeId] || 0;
          product.stockSummary.storeStocks[storeId] = operation === 'set' 
            ? quantity 
            : operation === 'add' 
              ? currentStock + quantity 
              : Math.max(0, currentStock - quantity);
        }
        
        // Recalculate totals
        product.stockSummary.totalShopStock = Object.values(product.stockSummary.shopStocks).reduce((sum, stock) => sum + stock, 0);
        product.stockSummary.totalStoreStock = Object.values(product.stockSummary.storeStocks).reduce((sum, stock) => sum + stock, 0);
        product.stockSummary.totalStock = product.stockSummary.totalShopStock + product.stockSummary.totalStoreStock;
      }
    },
    // Update batch stock
    updateBatchStock: (state, action: PayloadAction<{
      productId: string;
      batchId: string;
      shopId?: string;
      storeId?: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product && product.stockSummary?.batchStockDetails) {
        const batch = product.stockSummary.batchStockDetails.find(b => b.batchId === action.payload.batchId);
        if (batch) {
          const { shopId, storeId, quantity, operation } = action.payload;
          
          if (shopId) {
            const currentStock = batch.shopStocks[shopId] || 0;
            batch.shopStocks[shopId] = operation === 'set' 
              ? quantity 
              : operation === 'add' 
                ? currentStock + quantity 
                : Math.max(0, currentStock - quantity);
          }
          
          if (storeId) {
            const currentStock = batch.storeStocks[storeId] || 0;
            batch.storeStocks[storeId] = operation === 'set' 
              ? quantity 
              : operation === 'add' 
                ? currentStock + quantity 
                : Math.max(0, currentStock - quantity);
          }
          
          // Recalculate batch total
          batch.totalStock = Object.values(batch.shopStocks).reduce((sum, stock) => sum + stock, 0) +
                            Object.values(batch.storeStocks).reduce((sum, stock) => sum + stock, 0);
        }
      }
    },
    // Update product price
    updateProductPrice: (state, action: PayloadAction<{
      productId: string;
      sellPrice: string | null;
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product) {
        product.sellPrice = action.payload.sellPrice;
      }
    },
    // Update additional price
    updateAdditionalPrice: (state, action: PayloadAction<{
      productId: string;
      additionalPrice: AdditionalPrice;
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product) {
        const existingIndex = product.AdditionalPrice.findIndex(ap => ap.id === action.payload.additionalPrice.id);
        if (existingIndex >= 0) {
          product.AdditionalPrice[existingIndex] = action.payload.additionalPrice;
        } else {
          product.AdditionalPrice.push(action.payload.additionalPrice);
        }
      }
    },
    // Remove additional price
    removeAdditionalPrice: (state, action: PayloadAction<{
      productId: string;
      additionalPriceId: string;
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product) {
        product.AdditionalPrice = product.AdditionalPrice.filter(ap => ap.id !== action.payload.additionalPriceId);
      }
    },
    // Toggle product active status
    toggleProductActive: (state, action: PayloadAction<string>) => {
      const product = state.products.find(p => p.id === action.payload);
      if (product) {
        product.isActive = !product.isActive;
      }
    },
    // Add a new product (for real-time creation)
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.unshift(action.payload);
      state.count += 1;
    },
    // Update product details
    updateProduct: (state, action: PayloadAction<Partial<Product> & { id: string }>) => {
      const product = state.products.find(p => p.id === action.payload.id);
      if (product) {
        Object.assign(product, action.payload);
      }
    },
    // Remove a product
    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(product => product.id !== action.payload);
      state.count = Math.max(0, state.count - 1);
    },
    // Update user accessible shops
    updateUserAccessibleShops: (state, action: PayloadAction<Shop[]>) => {
      state.userAccessibleShops = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products with Stock
      .addCase(fetchProductsWithStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsWithStock.fulfilled, (state, action: PayloadAction<GetAllProductsResponse>) => {
        state.loading = false;
        state.products = action.payload.products;
        state.userAccessibleShops = action.payload.userAccessibleShops;
        state.count = action.payload.count;
        state.error = null;
      })
      .addCase(fetchProductsWithStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.products = [];
        state.userAccessibleShops = [];
        state.count = 0;
      });
  },
});

export const { 
  clearProducts, 
  clearError, 
  updateFilters,
  clearFilters,
  updateSort,
  updateProductStock,
  updateBatchStock,
  updateProductPrice,
  updateAdditionalPrice,
  removeAdditionalPrice,
  toggleProductActive,
  addProduct,
  updateProduct,
  removeProduct,
  updateUserAccessibleShops
} = productsSlice.actions;

// Select the entire products state
const selectProductsState = (state: { products: ProductsState }) => 
  state.products;

// Memoized selectors using Redux Toolkit's createSelector
export const selectProducts = createSelector(
  [selectProductsState],
  (state) => state.products
);

export const selectUserAccessibleShops = createSelector(
  [selectProductsState],
  (state) => state.userAccessibleShops
);

export const selectProductsLoading = createSelector(
  [selectProductsState],
  (state) => state.loading
);

export const selectProductsError = createSelector(
  [selectProductsState],
  (state) => state.error
);

export const selectProductsCount = createSelector(
  [selectProductsState],
  (state) => state.count
);

export const selectProductsFilters = createSelector(
  [selectProductsState],
  (state) => state.filters
);

export const selectProductsSort = createSelector(
  [selectProductsState],
  (state) => state.sortBy
);

// Memoized selector for filtered and sorted products
export const selectFilteredAndSortedProducts = createSelector(
  [selectProducts, selectProductsFilters, selectProductsSort],
  (products, filters, sort) => {
    let filteredProducts = [...products];

    // Apply filters
    if (filters.categoryId) {
      filteredProducts = filteredProducts.filter(product => 
        product.categoryId === filters.categoryId
      );
    }

    if (filters.subCategoryId) {
      filteredProducts = filteredProducts.filter(product => 
        product.subCategoryId === filters.subCategoryId
      );
    }

    if (filters.isActive !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.isActive === filters.isActive
      );
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.productCode.toLowerCase().includes(searchTerm) ||
        product.generic?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minStock !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.stockSummary.totalStock >= filters.minStock!
      );
    }

    if (filters.maxStock !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.stockSummary.totalStock <= filters.maxStock!
      );
    }

    if (filters.shopId) {
      filteredProducts = filteredProducts.filter(product => 
        product.stockSummary.shopStocks[filters.shopId!] > 0
      );
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      let aValue: any, bValue: any;

      if (sort.field === 'totalStock') {
        aValue = a.stockSummary.totalStock;
        bValue = b.stockSummary.totalStock;
      } else if (sort.field === 'price') {
        aValue = a.sellPrice ? parseFloat(a.sellPrice) : 0;
        bValue = b.sellPrice ? parseFloat(b.sellPrice) : 0;
      } else {
        aValue = a[sort.field];
        bValue = b[sort.field];
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredProducts;
  }
);

// Memoized selector for products by category
export const selectProductsByCategory = (categoryId: string) => 
  createSelector(
    [selectProducts],
    (products) => products.filter(product => product.categoryId === categoryId)
  );

// Memoized selector for products by subcategory
export const selectProductsBySubCategory = (subCategoryId: string) => 
  createSelector(
    [selectProducts],
    (products) => products.filter(product => product.subCategoryId === subCategoryId)
  );

// Memoized selector for active products
export const selectActiveProducts = createSelector(
  [selectProducts],
  (products) => products.filter(product => product.isActive)
);

// Memoized selector for low stock products
export const selectLowStockProducts = (threshold: number = 10) => 
  createSelector(
    [selectProducts],
    (products) => products.filter(product => product.stockSummary.totalStock <= threshold)
  );

// Memoized selector for out of stock products
export const selectOutOfStockProducts = createSelector(
  [selectProducts],
  (products) => products.filter(product => product.stockSummary.totalStock === 0)
  );

// Memoized selector for specific product by ID
export const selectProductById = (productId: string) => 
  createSelector(
    [selectProducts],
    (products) => products.find(product => product.id === productId)
  );

// Memoized selector for products by shop stock
export const selectProductsByShopStock = (shopId: string, minStock: number = 0) => 
  createSelector(
    [selectProducts],
    (products) => products.filter(product => 
      (product.stockSummary.shopStocks[shopId] || 0) >= minStock
    )
  );

// Memoized selector for products with additional prices for shop
export const selectProductsWithAdditionalPrices = (shopId: string) => 
  createSelector(
    [selectProducts],
    (products) => products.filter(product => 
      product.AdditionalPrice.some(ap => ap.shopId === shopId)
    )
  );

// Memoized selector for product stock summary
export const selectProductStockSummary = (productId: string) => 
  createSelector(
    [selectProductById(productId)],
    (product) => product?.stockSummary
  );

// Memoized selector for product batches
export const selectProductBatches = (productId: string) => 
  createSelector(
    [selectProductById(productId)],
    (product) => product?.stockSummary?.batchStockDetails || []
  );

// Memoized selector for total stock value
export const selectTotalStockValue = createSelector(
  [selectProducts],
  (products) => products.reduce((total, product) => {
    const price = product.sellPrice ? parseFloat(product.sellPrice) : 0;
    return total + (price * product.stockSummary.totalStock);
  }, 0)
);

// Memoized selector for stock statistics
export const selectStockStatistics = createSelector(
  [selectProducts],
  (products) => {
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      totalStockValue: 0,
      totalItemsInStock: 0,
      outOfStockProducts: 0,
      lowStockProducts: 0,
      categoryCount: {} as Record<string, number>,
      shopStockDistribution: {} as Record<string, number>,
    };

    products.forEach(product => {
      // Stock value
      const price = product.sellPrice ? parseFloat(product.sellPrice) : 0;
      stats.totalStockValue += price * product.stockSummary.totalStock;
      
      // Stock items
      stats.totalItemsInStock += product.stockSummary.totalStock;
      
      // Out of stock
      if (product.stockSummary.totalStock === 0) {
        stats.outOfStockProducts += 1;
      }
      
      // Low stock (less than 10)
      if (product.stockSummary.totalStock > 0 && product.stockSummary.totalStock <= 10) {
        stats.lowStockProducts += 1;
      }
      
      // Category count
      stats.categoryCount[product.category.name] = (stats.categoryCount[product.category.name] || 0) + 1;
      
      // Shop stock distribution
      Object.entries(product.stockSummary.shopStocks).forEach(([shopId, stock]) => {
        stats.shopStockDistribution[shopId] = (stats.shopStockDistribution[shopId] || 0) + stock;
      });
    });

    return stats;
  }
);

// Memoized selector for batch expiry alerts
export const selectExpiringBatches = (daysThreshold: number = 30) => 
  createSelector(
    [selectProducts],
    (products) => {
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + daysThreshold);

      const expiringBatches: {
        product: Product;
        batch: BatchStockDetails;
        daysUntilExpiry: number;
      }[] = [];

      products.forEach(product => {
        product.stockSummary?.batchStockDetails?.forEach(batch => {
          if (batch.expiryDate) {
            const expiryDate = new Date(batch.expiryDate);
            if (expiryDate <= thresholdDate && expiryDate >= today) {
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              expiringBatches.push({
                product,
                batch,
                daysUntilExpiry
              });
            }
          }
        });
      });

      return expiringBatches.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    }
  );

// Memoized selector for products search
export const selectProductsSearch = (searchTerm: string) => 
  createSelector(
    [selectProducts],
    (products) => {
      if (!searchTerm) return products;
      
      const term = searchTerm.toLowerCase();
      return products.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.productCode.toLowerCase().includes(term) ||
        product.generic?.toLowerCase().includes(term) ||
        product.category.name.toLowerCase().includes(term) ||
        product.subCategory?.name.toLowerCase().includes(term)
      );
    }
  );

export default productsSlice.reducer;