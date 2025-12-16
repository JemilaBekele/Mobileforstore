import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { getUserDashboardSummary } from "@/(services)/api/dashboard";

// Types based on the API response
export interface SalesStats {
  deliveredItemsCount: number;
  totalGrossRevenue: number;
  totalRevenue: number;
  totalSales: number;
  totalSubTotal: number;
}

export interface PendingDeliveryBreakdown {
  shopId: string;
  shopName: string;
  pendingCount: number;
}

export interface PendingDelivery {
  breakdown: PendingDeliveryBreakdown[];
  shopsWithPending: number;
  totalItems: number;
}

export interface ShopStockItem {
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  productCode: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  hasExpiryAlert: boolean;
  hasLowStockAlert: boolean;
  quantity: number;
  status: string;
  unit: string;
  warningQuantity?: number;
}

export interface StoreStockItem {
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  productCode: string;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
  hasExpiryAlert: boolean;
  hasLowStockAlert: boolean;
  quantity: number;
  status: string;
  unit: string;
  warningQuantity?: number;
}

export interface StockAlert {
  id: string;
  name: string;
  productCode: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  location: string;
  locationName: string;
  message: string;
  quantity: number;
  unit: string;
  warningQuantity: number;
  alertType: "EXPIRED" | "LOW_STOCK" | "EXPIRING_SOON";
}

export interface StockAlerts {
  expiredProducts: StockAlert[];
  expiringSoonProducts: StockAlert[];
  lowStockProducts: StockAlert[];
  totalAlerts: number;
}

export interface Summary {
  criticalAlerts: number;
  totalProductsInShops: number;
  totalProductsInStores: number;
  totalUniqueProducts: number;
}

export interface UserDashboardSummary {
  success: boolean;
  userShopsCount: number;
  userStoresCount: number;
  approvedSalesCount: number;
  salesStats: SalesStats;
  pendingDelivery: PendingDelivery;
  shopStockSummary: ShopStockItem[];
  storeStockSummary: StoreStockItem[];
  stockAlerts: StockAlerts;
  summary: Summary;
}

// Async thunk for fetching user dashboard summary
// redux/dashboard.ts
export const fetchUserDashboardSummary = createAsyncThunk(
  "userDashboard/fetchUserDashboardSummary",
  async (params: any, { rejectWithValue }) => {
    try {
      const data = await getUserDashboardSummary(params);
      
      // Make sure data has the expected structure
      if (!data) {
        throw new Error("No data received from server");
      }
      
      return data; // This should be UserDashboardSummary
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch user dashboard summary");
    }
  }
);
// Define the state interface
interface UserDashboardState {
  summary: UserDashboardSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  filters: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    shopIds?: string[];
    storeIds?: string[];
  };
}

const initialState: UserDashboardState = {
  summary: null,
  loading: false,
  error: null,
  lastUpdated: null,
  filters: {},
};

const userDashboardSlice = createSlice({
  name: "userDashboard",
  initialState,
  reducers: {
    clearDashboardSummary: (state) => {
      state.summary = null;
      state.error = null;
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<UserDashboardState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    // Update specific counts for real-time updates
    updateApprovedSalesCount: (state, action: PayloadAction<number>) => {
      if (state.summary) {
        state.summary.approvedSalesCount = action.payload;
      }
    },
    updateSalesStats: (state, action: PayloadAction<Partial<SalesStats>>) => {
      if (state.summary) {
        state.summary.salesStats = { ...state.summary.salesStats, ...action.payload };
      }
    },
    // Update pending delivery counts
    updatePendingDelivery: (state, action: PayloadAction<{ shopId: string; pendingCount: number }>) => {
      if (state.summary) {
        const { shopId, pendingCount } = action.payload;
        const breakdownIndex = state.summary.pendingDelivery.breakdown.findIndex(
          item => item.shopId === shopId
        );
        
        if (breakdownIndex !== -1) {
          state.summary.pendingDelivery.breakdown[breakdownIndex].pendingCount = pendingCount;
        }
        
        // Recalculate totals
        state.summary.pendingDelivery.totalItems = state.summary.pendingDelivery.breakdown.reduce(
          (total, item) => total + item.pendingCount, 0
        );
        state.summary.pendingDelivery.shopsWithPending = state.summary.pendingDelivery.breakdown.filter(
          item => item.pendingCount > 0
        ).length;
      }
    },
    // Update stock quantities
    updateShopStockQuantity: (state, action: PayloadAction<{ 
      shopId: string; 
      productId: string; 
      batchId?: string;
      quantity: number;
    }>) => {
      if (state.summary) {
        const { shopId, productId, batchId, quantity } = action.payload;
        const stockItem = state.summary.shopStockSummary.find(
          item => item.shopId === shopId && 
                 item.productId === productId && 
                 (!batchId || item.batchId === batchId)
        );
        
        if (stockItem) {
          stockItem.quantity = quantity;
          stockItem.hasLowStockAlert = stockItem.warningQuantity !== undefined && quantity <= stockItem.warningQuantity;
        }
      }
    },
    updateStoreStockQuantity: (state, action: PayloadAction<{ 
      storeId: string; 
      productId: string; 
      batchId?: string;
      quantity: number;
    }>) => {
      if (state.summary) {
        const { storeId, productId, batchId, quantity } = action.payload;
        const stockItem = state.summary.storeStockSummary.find(
          item => item.storeId === storeId && 
                 item.productId === productId && 
                 (!batchId || item.batchId === batchId)
        );
        
        if (stockItem) {
          stockItem.quantity = quantity;
          stockItem.hasLowStockAlert = stockItem.warningQuantity !== undefined && quantity <= stockItem.warningQuantity;
        }
      }
    },
    // Add new stock alert
    addStockAlert: (state, action: PayloadAction<StockAlert>) => {
      if (state.summary) {
        const alert = action.payload;
        switch (alert.alertType) {
          case "EXPIRED":
            state.summary.stockAlerts.expiredProducts.push(alert);
            break;
          case "LOW_STOCK":
            state.summary.stockAlerts.lowStockProducts.push(alert);
            break;
          case "EXPIRING_SOON":
            state.summary.stockAlerts.expiringSoonProducts.push(alert);
            break;
        }
        state.summary.stockAlerts.totalAlerts += 1;
        state.summary.summary.criticalAlerts += 1;
      }
    },
    // Remove stock alert
    removeStockAlert: (state, action: PayloadAction<{ alertType: string; id: string }>) => {
      if (state.summary) {
        const { alertType, id } = action.payload;
        let removed = false;
        
        switch (alertType) {
          case "EXPIRED":
            state.summary.stockAlerts.expiredProducts = 
              state.summary.stockAlerts.expiredProducts.filter(alert => alert.id !== id);
            removed = true;
            break;
          case "LOW_STOCK":
            state.summary.stockAlerts.lowStockProducts = 
              state.summary.stockAlerts.lowStockProducts.filter(alert => alert.id !== id);
            removed = true;
            break;
          case "EXPIRING_SOON":
            state.summary.stockAlerts.expiringSoonProducts = 
              state.summary.stockAlerts.expiringSoonProducts.filter(alert => alert.id !== id);
            removed = true;
            break;
        }
        
        if (removed) {
          state.summary.stockAlerts.totalAlerts = Math.max(0, state.summary.stockAlerts.totalAlerts - 1);
          state.summary.summary.criticalAlerts = Math.max(0, state.summary.summary.criticalAlerts - 1);
        }
      }
    },
    // Update summary counts
    updateSummaryCounts: (state, action: PayloadAction<Partial<Summary>>) => {
      if (state.summary) {
        state.summary.summary = { ...state.summary.summary, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Dashboard Summary
      .addCase(fetchUserDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserDashboardSummary.fulfilled, (state, action: PayloadAction<UserDashboardSummary>) => {
        state.loading = false;
        state.summary = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchUserDashboardSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.summary = null;
      });
  },
});

export const { 
  clearDashboardSummary, 
  clearError, 
  updateFilters,
  clearFilters,
  updateApprovedSalesCount,
  updateSalesStats,
  updatePendingDelivery,
  updateShopStockQuantity,
  updateStoreStockQuantity,
  addStockAlert,
  removeStockAlert,
  updateSummaryCounts
} = userDashboardSlice.actions;

// Select the entire userDashboard state
const selectUserDashboardState = (state: { userDashboard: UserDashboardState }) => 
  state.userDashboard;

// Memoized selectors using Redux Toolkit's createSelector
export const selectDashboardSummary = createSelector(
  [selectUserDashboardState],
  (state) => state.summary
);

export const selectDashboardLoading = createSelector(
  [selectUserDashboardState],
  (state) => state.loading
);

export const selectDashboardError = createSelector(
  [selectUserDashboardState],
  (state) => state.error
);

export const selectLastUpdated = createSelector(
  [selectUserDashboardState],
  (state) => state.lastUpdated
);

export const selectDashboardFilters = createSelector(
  [selectUserDashboardState],
  (state) => state.filters
);

// Safe base selectors with proper defaults
export const selectSalesStats = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.salesStats || {
    deliveredItemsCount: 0,
    totalGrossRevenue: 0,
    totalRevenue: 0,
    totalSales: 0,
    totalSubTotal: 0
  }
);

export const selectPendingDelivery = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.pendingDelivery || {
    breakdown: [],
    shopsWithPending: 0,
    totalItems: 0
  }
);

export const selectShopStockSummary = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.shopStockSummary || []
);

export const selectStoreStockSummary = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.storeStockSummary || []
);

export const selectStockAlerts = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.stockAlerts || {
    expiredProducts: [],
    expiringSoonProducts: [],
    lowStockProducts: [],
    totalAlerts: 0
  }
);

export const selectSummaryOverview = createSelector(
  [selectDashboardSummary],
  (summary) => summary?.summary || {
    criticalAlerts: 0,
    totalProductsInShops: 0,
    totalProductsInStores: 0,
    totalUniqueProducts: 0
  }
);

// Safe derived selectors
export const selectTotalRevenue = createSelector(
  [selectSalesStats],
  (salesStats) => salesStats.totalRevenue || 0
);

export const selectTotalSales = createSelector(
  [selectSalesStats],
  (salesStats) => salesStats.totalSales || 0
);

export const selectDeliveredItemsCount = createSelector(
  [selectSalesStats],
  (salesStats) => salesStats.deliveredItemsCount || 0
);

export const selectTotalPendingItems = createSelector(
  [selectPendingDelivery],
  (pendingDelivery) => pendingDelivery.totalItems || 0
);

export const selectShopsWithPending = createSelector(
  [selectPendingDelivery],
  (pendingDelivery) => pendingDelivery.shopsWithPending || 0
);

export const selectTotalAlerts = createSelector(
  [selectStockAlerts],
  (stockAlerts) => stockAlerts.totalAlerts || 0
);

export const selectCriticalAlerts = createSelector(
  [selectSummaryOverview],
  (overview) => overview.criticalAlerts || 0
);

// Performance metrics with safe defaults
export const selectDeliveryPerformance = createSelector(
  [selectSalesStats, selectPendingDelivery],
  (salesStats, pendingDelivery) => {
    const delivered = salesStats.deliveredItemsCount || 0;
    const pending = pendingDelivery.totalItems || 0;
    const total = delivered + pending;
    
    return total > 0 ? (delivered / total) * 100 : 0;
  }
);

export const selectStockHealth = createSelector(
  [selectShopStockSummary, selectStoreStockSummary],
  (shopStock, storeStock) => {
    const totalItems = shopStock.length + storeStock.length;
    const lowStockItems = [
      ...shopStock.filter(item => item.hasLowStockAlert),
      ...storeStock.filter(item => item.hasLowStockAlert)
    ].length;
    
    return totalItems > 0 ? ((totalItems - lowStockItems) / totalItems) * 100 : 100;
  }
);

// Alert summary with safe defaults
export const selectAlertSummary = createSelector(
  [selectStockAlerts],
  (stockAlerts) => ({
    expired: stockAlerts.expiredProducts?.length || 0,
    expiringSoon: stockAlerts.expiringSoonProducts?.length || 0,
    lowStock: stockAlerts.lowStockProducts?.length || 0,
    total: stockAlerts.totalAlerts || 0
  })
);

// Filtered selectors with safe defaults
export const selectShopStockByShopId = (shopId: string) => 
  createSelector(
    [selectShopStockSummary],
    (stockSummary) => stockSummary.filter(item => item.shopId === shopId)
  );

export const selectStoreStockByStoreId = (storeId: string) => 
  createSelector(
    [selectStoreStockSummary],
    (stockSummary) => stockSummary.filter(item => item.storeId === storeId)
  );

export const selectLowStockItems = createSelector(
  [selectShopStockSummary, selectStoreStockSummary],
  (shopStock, storeStock) => {
    const lowStockShopItems = shopStock.filter(item => item.hasLowStockAlert);
    const lowStockStoreItems = storeStock.filter(item => item.hasLowStockAlert);
    return [...lowStockShopItems, ...lowStockStoreItems];
  }
);

export const selectExpiringItems = createSelector(
  [selectShopStockSummary, selectStoreStockSummary],
  (shopStock, storeStock) => {
    const expiringShopItems = shopStock.filter(item => item.hasExpiryAlert);
    const expiringStoreItems = storeStock.filter(item => item.hasExpiryAlert);
    return [...expiringShopItems, ...expiringStoreItems];
  }
);

export const selectPendingDeliveryByShop = (shopId: string) => 
  createSelector(
    [selectPendingDelivery],
    (pendingDelivery) => 
      pendingDelivery.breakdown?.find(item => item.shopId === shopId) || null
  );

export default userDashboardSlice.reducer;