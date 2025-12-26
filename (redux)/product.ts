import { 
  AdditionalPrice, 
  BatchStockDetails, 
  GetAllProductsResponse, 
  getAllProductsWithStock, 
  Product, 
  Shop,
  OverallTotals
} from "@/(services)/api/product";
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
    branchId?: string;
  };
  sortBy: {
    field: keyof Product | 'totalStock' | 'price' | 'branchStock';
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
      branchName: string;
      shopName?: string;
      storeName?: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product && product.stockSummary?.branchStocks) {
        const { branchName, shopName, storeName, quantity, operation } = action.payload;
        const branchStock = product.stockSummary.branchStocks[branchName];
        
        if (!branchStock) return;
        
        if (shopName) {
          const currentStock = branchStock.shops[shopName] || 0;
          branchStock.shops[shopName] = operation === 'set' 
            ? quantity 
            : operation === 'add' 
              ? currentStock + quantity 
              : Math.max(0, currentStock - quantity);
              
          // Recalculate branch totals
          branchStock.totalShopStock = Object.values(branchStock.shops).reduce((sum, stock) => sum + stock, 0);
          branchStock.totalBranchStock = branchStock.totalShopStock + branchStock.totalStoreStock;
          
          // Recalculate product totals
          product.stockSummary.totalShopStock = Object.values(product.stockSummary.branchStocks)
            .reduce((sum, branch) => sum + branch.totalShopStock, 0);
        }
        
        if (storeName) {
          const currentStock = branchStock.stores[storeName] || 0;
          branchStock.stores[storeName] = operation === 'set' 
            ? quantity 
            : operation === 'add' 
              ? currentStock + quantity 
              : Math.max(0, currentStock - quantity);
              
          // Recalculate branch totals
          branchStock.totalStoreStock = Object.values(branchStock.stores).reduce((sum, stock) => sum + stock, 0);
          branchStock.totalBranchStock = branchStock.totalShopStock + branchStock.totalStoreStock;
          
          // Recalculate product totals
          product.stockSummary.totalStoreStock = Object.values(product.stockSummary.branchStocks)
            .reduce((sum, branch) => sum + branch.totalStoreStock, 0);
        }
        
        // Update overall product total
        product.stockSummary.totalStock = product.stockSummary.totalShopStock + product.stockSummary.totalStoreStock;
      }
    },
    // Update batch stock
    updateBatchStock: (state, action: PayloadAction<{
      productId: string;
      batchId: string;
      branchName: string;
      shopName?: string;
      storeName?: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
    }>) => {
      const product = state.products.find(p => p.id === action.payload.productId);
      if (product && product.stockSummary?.batchStockDetails) {
        const batch = product.stockSummary.batchStockDetails.find(b => b.batchId === action.payload.batchId);
        if (batch && batch.branchStocks) {
          const { branchName, shopName, storeName, quantity, operation } = action.payload;
          const batchBranchStock = batch.branchStocks[branchName];
          
          if (!batchBranchStock) return;
          
          if (shopName) {
            const currentStock = batchBranchStock.shops[shopName] || 0;
            batchBranchStock.shops[shopName] = operation === 'set' 
              ? quantity 
              : operation === 'add' 
                ? currentStock + quantity 
                : Math.max(0, currentStock - quantity);
          }
          
          if (storeName) {
            const currentStock = batchBranchStock.stores[storeName] || 0;
            batchBranchStock.stores[storeName] = operation === 'set' 
              ? quantity 
              : operation === 'add' 
                ? currentStock + quantity 
                : Math.max(0, currentStock - quantity);
          }
          
          // Recalculate batch branch total
          batchBranchStock.totalStock = 
            Object.values(batchBranchStock.shops).reduce((sum, stock) => sum + stock, 0) +
            Object.values(batchBranchStock.stores).reduce((sum, stock) => sum + stock, 0);
            
          // Recalculate batch total
          batch.totalStock = Object.values(batch.branchStocks)
            .reduce((sum, branch) => sum + branch.totalStock, 0);
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
    // Update overall totals (if needed for real-time updates)
    updateOverallTotals: (state, action: PayloadAction<OverallTotals>) => {
      state.products = state.products.map(product => ({
        ...product,
        overallTotals: action.payload
      }));
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products with Stock
      .addCase(fetchProductsWithStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
    // In your Redux slice, update the fetchProductsWithStock.fulfilled case
.addCase(fetchProductsWithStock.fulfilled, (state, action: PayloadAction<GetAllProductsResponse>) => {
  state.loading = false;
  
  // Transform the API data to match your expected structure
  const transformedProducts = action.payload.products.map(product => {
    // Create branchStocks structure from shopStocks and storeStocks
    const branchStocks: Record<string, any> = {};
    
    // Group by branch (you'll need branch information)
    // For now, let's assume all shops/stores are in a default branch
    const defaultBranchName = "Default Branch";
    
    if (product.stockSummary?.shopStocks) {
      branchStocks[defaultBranchName] = {
        shops: { ...product.stockSummary.shopStocks },
        stores: { ...product.stockSummary.storeStocks || {} },
        totalShopStock: product.stockSummary.totalShopStock || 0,
        totalStoreStock: product.stockSummary.totalStoreStock || 0,
        totalBranchStock: (product.stockSummary.totalShopStock || 0) + (product.stockSummary.totalStoreStock || 0),
        branchId: "" // You'll need to get this from your data
      };
    }
    
    return {
      ...product,
      stockSummary: {
        ...product.stockSummary,
        branchStocks
      }
    };
  });
  
  state.products = transformedProducts;
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
  updateUserAccessibleShops,
  updateOverallTotals
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

// Helper function to check if product has stock in shop (by name)
const hasStockInShop = (product: Product, shopName: string): boolean => {
  for (const branchStock of Object.values(product.stockSummary.branchStocks)) {
    if (branchStock.shops[shopName] > 0) {
      return true;
    }
  }
  return false;
};

// Helper function to get product stock in branch
const getProductStockInBranch = (product: Product, branchName: string): number => {
  return product.stockSummary.branchStocks[branchName]?.totalBranchStock || 0;
};

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
      // Find shop name by ID
      const shopExists = filteredProducts[0]?.stockSummary?.branchStocks
        ? Object.values(filteredProducts[0].stockSummary.branchStocks)
            .flatMap(branch => Object.keys(branch.shops))
            .includes(filters.shopId)
        : false;
      
      if (shopExists) {
        filteredProducts = filteredProducts.filter(product => 
          hasStockInShop(product, filters.shopId!)
        );
      }
    }

    if (filters.branchId) {
      // Find branch name by ID
      const branch = filteredProducts[0]?.stockSummary?.branchStocks
        ? Object.entries(filteredProducts[0].stockSummary.branchStocks)
            .find((entry) => entry[1].branchId === filters.branchId)
        : undefined;
      
      if (branch) {
        filteredProducts = filteredProducts.filter(product => 
          getProductStockInBranch(product, branch[0]) > 0
        );
      }
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      let aValue: any, bValue: any;

      if (sort.field === 'totalStock') {
        aValue = a.stockSummary.totalStock;
        bValue = b.stockSummary.totalStock;
      } else if (sort.field === 'branchStock') {
        // Sort by stock in a specific branch (you might want to make this configurable)
        aValue = Object.values(a.stockSummary.branchStocks).reduce((sum, branch) => sum + branch.totalBranchStock, 0);
        bValue = Object.values(b.stockSummary.branchStocks).reduce((sum, branch) => sum + branch.totalBranchStock, 0);
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
export const selectProductById = (productId: string) => createSelector(
  [selectProducts],
  (products) => products.find(product => product.id === productId)
);

// Memoized selector for products by branch stock
export const selectProductsByBranchStock = (branchName: string, minStock: number = 0) => createSelector(
  [selectProducts],
  (products) => products.filter(product => 
    (product.stockSummary.branchStocks[branchName]?.totalBranchStock || 0) >= minStock
  )
);

// Memoized selector for products by shop stock (by name)
export const selectProductsByShopStock = (shopName: string, minStock: number = 0) => createSelector(
  [selectProducts],
  (products) => products.filter(product => {
    for (const branchStock of Object.values(product.stockSummary.branchStocks)) {
      if ((branchStock.shops[shopName] || 0) >= minStock) {
        return true;
      }
    }
    return false;
  })
);

// Memoized selector for products with additional prices for shop
export const selectProductsWithAdditionalPrices = (shopId: string) => createSelector(
  [selectProducts],
  (products) => products.filter(product => 
    product.AdditionalPrice.some(ap => ap.shopId === shopId)
  )
);

// Memoized selector for product stock summary
export const selectProductStockSummary = (productId: string) => createSelector(
  [selectProductById(productId)],
  (product) => product?.stockSummary
);

// Memoized selector for product branch stocks
export const selectProductBranchStocks = (productId: string) => createSelector(
  [selectProductById(productId)],
  (product) => product?.stockSummary?.branchStocks || {}
);

// Memoized selector for product batches
export const selectProductBatches = (productId: string) => createSelector(
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
      branchStockDistribution: {} as Record<string, number>,
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
      
      // Branch stock distribution
      Object.entries(product.stockSummary.branchStocks).forEach(([branchName, branchStock]) => {
        stats.branchStockDistribution[branchName] = 
          (stats.branchStockDistribution[branchName] || 0) + branchStock.totalBranchStock;
        
        // Shop stock distribution within branch
        Object.entries(branchStock.shops).forEach(([shopName, stock]) => {
          const key = `${branchName} - ${shopName}`;
          stats.shopStockDistribution[key] = (stats.shopStockDistribution[key] || 0) + stock;
        });
      });
    });

    return stats;
  }
);

// Memoized selector for batch expiry alerts
export const selectExpiringBatches = (daysThreshold: number = 30) => createSelector(
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
export const selectProductsSearch = (searchTerm: string) => createSelector(
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

// Memoized selector for all branches from products
export const selectAllBranches = createSelector(
  [selectProducts],
  (products) => {
    const branches = new Set<{id: string, name: string}>();
    
    products.forEach(product => {
      Object.entries(product.stockSummary.branchStocks).forEach(([branchName, branchStock]) => {
        branches.add({
          id: branchStock.branchId,
          name: branchName
        });
      });
    });
    
    return Array.from(branches);
  }
);

// Memoized selector for all shops from products
export const selectAllShops = createSelector(
  [selectProducts],
  (products) => {
    const shops = new Set<{name: string, branchId: string, branchName: string}>();
    
    products.forEach(product => {
      Object.entries(product.stockSummary.branchStocks).forEach(([branchName, branchStock]) => {
        Object.keys(branchStock.shops).forEach(shopName => {
          shops.add({
            name: shopName,
            branchId: branchStock.branchId,
            branchName: branchName
          });
        });
      });
    });
    
    return Array.from(shops);
  }
);

export default productsSlice.reducer;