import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { 
  getAllSellsUser, 
  getSellByIdByUser,
} from "@/(services)/api/sell";
import { GetAllSellsUserParams, Sell, SellItem, ItemSaleStatus, SaleStatus } from "@/(utils)/types";

// Async thunk for fetching user sells
export const fetchUserSells = createAsyncThunk(
  "userSells/fetchUserSells",
  async (params: GetAllSellsUserParams, { rejectWithValue }) => {
    try {
      const response = await getAllSellsUser(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch user sells");
    }
  }
);

// Async thunk for fetching sell by ID
export const fetchUserSellById = createAsyncThunk(
  "userSells/fetchUserSellById",
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await getSellByIdByUser(params);
      return { ...response, id: params.id };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch sell by ID");
    }
  }
);

// Define the state interface
interface UserSellsState {
  sells: Sell[];
  loading: boolean;
  error: string | null;
  count: number;
  filters: {
    startDate?: string;
    endDate?: string;
    saleStatus?: SaleStatus;
    itemSaleStatus?: ItemSaleStatus;
  };
  lastFetchParams?: GetAllSellsUserParams;
  currentSell: Sell | null; // For storing the currently viewed sell
  loadingCurrent: boolean; // Separate loading state for single sell
  errorCurrent: string | null; // Separate error state for single sell
}

const initialState: UserSellsState = {
  sells: [],
  loading: false,
  error: null,
  count: 0,
  filters: {},
  lastFetchParams: undefined,
  currentSell: null,
  loadingCurrent: false,
  errorCurrent: null,
};

const userSellsSlice = createSlice({
  name: "userSells",
  initialState,
  reducers: {
    clearUserSells: (state) => {
      state.sells = [];
      state.count = 0;
      state.error = null;
      state.filters = {};
      state.lastFetchParams = undefined;
      state.currentSell = null;
      state.errorCurrent = null;
    },
    clearError: (state) => {
      state.error = null;
      state.errorCurrent = null;
    },
    clearCurrentSell: (state) => {
      state.currentSell = null;
      state.errorCurrent = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<UserSellsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    // Set current sell (useful when navigating from list to details)
    setCurrentSell: (state, action: PayloadAction<Sell | null>) => {
      state.currentSell = action.payload;
    },
    // Update sell status (useful for real-time updates)
    updateSellStatus: (state, action: PayloadAction<{ sellId: string; saleStatus: SaleStatus }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell) {
        sell.saleStatus = action.payload.saleStatus;
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId) {
        state.currentSell.saleStatus = action.payload.saleStatus;
      }
    },
    // Update item status
    updateSellItemStatus: (state, action: PayloadAction<{ 
      sellId: string; 
      itemId: string; 
      itemSaleStatus: ItemSaleStatus;
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.itemSaleStatus = action.payload.itemSaleStatus;
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.itemSaleStatus = action.payload.itemSaleStatus;
        }
      }
    },
    // Update item batches (for tracking batch allocations)
    updateSellItemBatches: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
      batches: SellItem['batches'];
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.batches = action.payload.batches;
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.batches = action.payload.batches;
        }
      }
    },
    // Add batch to sell item
    addBatchToSellItem: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
      batch: SellItem['batches'][0];
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          if (!item.batches) {
            item.batches = [];
          }
          item.batches.push(action.payload.batch);
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          if (!item.batches) {
            item.batches = [];
          }
          item.batches.push(action.payload.batch);
        }
      }
    },
    // Update batch quantity in sell item
    updateSellItemBatchQuantity: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
      batchId: string;
      quantity: number;
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item && item.batches) {
          const batch = item.batches.find(b => b.batchId === action.payload.batchId);
          if (batch) {
            batch.quantity = action.payload.quantity;
          }
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item && item.batches) {
          const batch = item.batches.find(b => b.batchId === action.payload.batchId);
          if (batch) {
            batch.quantity = action.payload.quantity;
          }
        }
      }
    },
    // Add a new sell (for real-time creation)
    addSell: (state, action: PayloadAction<Sell>) => {
      state.sells.unshift(action.payload); // Add to beginning for newest first
      state.count += 1;
    },
    // Remove a sell (for cancellation/deletion)
    removeSell: (state, action: PayloadAction<string>) => {
      state.sells = state.sells.filter(sell => sell.id !== action.payload);
      state.count = Math.max(0, state.count - 1);
      // Clear current sell if it's the one being removed
      if (state.currentSell && state.currentSell.id === action.payload) {
        state.currentSell = null;
      }
    },
    // Update sell totals
    updateSellTotals: (state, action: PayloadAction<{ 
      sellId: string; 
      subTotal?: number;
      discount?: number;
      vat?: number;
      grandTotal?: number;
      netTotal?: number;
      totalProducts?: number;
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell) {
        if (action.payload.subTotal !== undefined) sell.subTotal = action.payload.subTotal;
        if (action.payload.discount !== undefined) sell.discount = action.payload.discount;
        if (action.payload.vat !== undefined) sell.vat = action.payload.vat;
        if (action.payload.grandTotal !== undefined) sell.grandTotal = action.payload.grandTotal;
        if (action.payload.netTotal !== undefined) sell.NetTotal = action.payload.netTotal;
        if (action.payload.totalProducts !== undefined) sell.totalProducts = action.payload.totalProducts;
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId) {
        if (action.payload.subTotal !== undefined) state.currentSell.subTotal = action.payload.subTotal;
        if (action.payload.discount !== undefined) state.currentSell.discount = action.payload.discount;
        if (action.payload.vat !== undefined) state.currentSell.vat = action.payload.vat;
        if (action.payload.grandTotal !== undefined) state.currentSell.grandTotal = action.payload.grandTotal;
        if (action.payload.netTotal !== undefined) state.currentSell.NetTotal = action.payload.netTotal;
        if (action.payload.totalProducts !== undefined) state.currentSell.totalProducts = action.payload.totalProducts;
      }
    },
    // Update sell item price and totals
    updateSellItemPrice: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
      unitPrice: number;
      totalPrice: number;
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.unitPrice = action.payload.unitPrice;
          item.totalPrice = action.payload.totalPrice;
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.unitPrice = action.payload.unitPrice;
          item.totalPrice = action.payload.totalPrice;
        }
      }
    },
    // Update sell item quantity
    updateSellItemQuantity: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
      quantity: number;
      totalPrice: number;
    }>) => {
      const sell = state.sells.find(s => s.id === action.payload.sellId);
      if (sell && sell.items) {
        const item = sell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.quantity = action.payload.quantity;
          item.totalPrice = action.payload.totalPrice;
        }
      }
      // Also update current sell if it's the same
      if (state.currentSell && state.currentSell.id === action.payload.sellId && state.currentSell.items) {
        const item = state.currentSell.items.find(i => i.id === action.payload.itemId);
        if (item) {
          item.quantity = action.payload.quantity;
          item.totalPrice = action.payload.totalPrice;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Sells
      .addCase(fetchUserSells.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSells.fulfilled, (state, action: ReturnType<typeof fetchUserSells.fulfilled>) => {
        state.loading = false;
        state.sells = action.payload.sells;
        state.count = action.payload.count;
        state.error = null;
        // Store the last fetch params for potential refetching
        state.lastFetchParams = action.meta.arg;
      })
      .addCase(fetchUserSells.rejected, (state, action: ReturnType<typeof fetchUserSells.rejected>) => {
        state.loading = false;
        state.error = action.payload as string;
        state.sells = [];
        state.count = 0;
      })
      // Fetch Sell by ID
      .addCase(fetchUserSellById.pending, (state) => {
        state.loadingCurrent = true;
        state.errorCurrent = null;
      })
      .addCase(fetchUserSellById.fulfilled, (state, action: ReturnType<typeof fetchUserSellById.fulfilled>) => {
        state.loadingCurrent = false;
        if (action.payload.sells.length > 0) {
          state.currentSell = action.payload.sells[0];
          // Also update in sells array if it exists there
          const existingIndex = state.sells.findIndex(s => s.id === action.meta.arg.id);
          if (existingIndex !== -1) {
            state.sells[existingIndex] = action.payload.sells[0];
          }
        }
        state.errorCurrent = null;
      })
      .addCase(fetchUserSellById.rejected, (state, action: ReturnType<typeof fetchUserSellById.rejected>) => {
        state.loadingCurrent = false;
        state.errorCurrent = action.payload as string;
        state.currentSell = null;
      });
  },
});

export const { 
  clearUserSells, 
  clearError,
  clearCurrentSell,
  setCurrentSell,
  updateFilters,
  clearFilters,
  updateSellStatus,
  updateSellItemStatus,
  updateSellItemBatches,
  addBatchToSellItem,
  updateSellItemBatchQuantity,
  addSell,
  removeSell,
  updateSellTotals,
  updateSellItemPrice,
  updateSellItemQuantity
} = userSellsSlice.actions;

// Select the entire userSells state
const selectUserSellsState = (state: { userSells: UserSellsState }) => 
  state.userSells;

// Memoized selectors using Redux Toolkit's createSelector
export const selectUserSells = createSelector(
  [selectUserSellsState],
  (state) => state.sells
);

export const selectUserSellsLoading = createSelector(
  [selectUserSellsState],
  (state) => state.loading
);

export const selectUserSellsError = createSelector(
  [selectUserSellsState],
  (state) => state.error
);

export const selectUserSellsCount = createSelector(
  [selectUserSellsState],
  (state) => state.count
);

export const selectUserSellsFilters = createSelector(
  [selectUserSellsState],
  (state) => state.filters
);

export const selectLastFetchParams = createSelector(
  [selectUserSellsState],
  (state) => state.lastFetchParams
);

// Selectors for current sell
export const selectCurrentSell = createSelector(
  [selectUserSellsState],
  (state) => state.currentSell
);

export const selectCurrentSellLoading = createSelector(
  [selectUserSellsState],
  (state) => state.loadingCurrent
);

export const selectCurrentSellError = createSelector(
  [selectUserSellsState],
  (state) => state.errorCurrent
);

// Memoized selector for specific sell by ID (checks both sells array and currentSell)
export const selectUserSellById = (sellId: string) => 
  createSelector(
    [selectUserSells, selectCurrentSell],
    (sells, currentSell) => {
      // Check current sell first (most recent)
      if (currentSell && currentSell.id === sellId) {
        return currentSell;
      }
      // Otherwise check in the sells array
      return sells.find(sell => sell.id === sellId);
    }
  );

// Rest of your selectors remain the same...
export const selectUserSellsByStatus = (status: SaleStatus) => 
  createSelector(
    [selectUserSells],
    (sells) => sells.filter(sell => sell.saleStatus === status)
  );

export const selectUserSellsByBranch = (branchId: string) => 
  createSelector(
    [selectUserSells],
    (sells) => sells.filter(sell => sell.branchId === branchId)
  );

export const selectUserSellsByCustomer = (customerId: string) => 
  createSelector(
    [selectUserSells],
    (sells) => sells.filter(sell => sell.customerId === customerId)
  );

export const selectUserSellsByDateRange = (startDate: string, endDate: string) => 
  createSelector(
    [selectUserSells],
    (sells) => sells.filter(sell => {
      const sellDate = new Date(sell.saleDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return sellDate >= start && sellDate <= end;
    })
  );

export const selectRecentUserSells = createSelector(
  [selectUserSells],
  (sells) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return sells.filter(sell => new Date(sell.saleDate) >= oneWeekAgo);
  }
);

export const selectUserSellsWithItemStatus = (itemStatus: ItemSaleStatus) => 
  createSelector(
    [selectUserSells],
    (sells) => sells.filter(sell => 
      sell.items?.some(item => item.itemSaleStatus === itemStatus)
    )
  );

export const selectUserSellsWithBatches = createSelector(
  [selectUserSells],
  (sells) => sells.filter(sell => 
    sell.items?.some(item => item.batches && item.batches.length > 0)
  )
);

export const selectSellItemsByProduct = (productId: string) => 
  createSelector(
    [selectUserSells],
    (sells) => {
      const allItems: SellItem[] = [];
      sells.forEach(sell => {
        if (sell.items) {
          const productItems = sell.items.filter(item => item.productId === productId);
          allItems.push(...productItems);
        }
      });
      return allItems;
    }
  );

export const selectSellItemsByShop = (shopId: string) => 
  createSelector(
    [selectUserSells],
    (sells) => {
      const allItems: SellItem[] = [];
      sells.forEach(sell => {
        if (sell.items) {
          const shopItems = sell.items.filter(item => item.shopId === shopId);
          allItems.push(...shopItems);
        }
      });
      return allItems;
    }
  );

export const selectTotalSalesAmount = createSelector(
  [selectUserSells],
  (sells) => sells.reduce((total, sell) => total + (sell.grandTotal || 0), 0)
);

export const selectAverageSaleValue = createSelector(
  [selectUserSells, selectUserSellsCount],
  (sells, count) => count > 0 ? sells.reduce((total, sell) => total + (sell.grandTotal || 0), 0) / count : 0
);

export const selectUserSellsStatistics = createSelector(
  [selectUserSells],
  (sells) => {
    const stats = {
      totalSells: sells.length,
      totalRevenue: sells.reduce((sum, sell) => sum + (sell.grandTotal || 0), 0),
      totalDiscount: sells.reduce((sum, sell) => sum + (sell.discount || 0), 0),
      totalVat: sells.reduce((sum, sell) => sum + (sell.vat || 0), 0),
      totalProducts: sells.reduce((sum, sell) => sum + (sell.totalProducts || 0), 0),
      totalItems: sells.reduce((sum, sell) => sum + (sell.items?.length || 0), 0),
      statusCount: {} as Record<SaleStatus, number>,
      branchCount: {} as Record<string, number>,
      itemStatusCount: {} as Record<ItemSaleStatus, number>,
    };

    sells.forEach(sell => {
      stats.statusCount[sell.saleStatus] = (stats.statusCount[sell.saleStatus] || 0) + 1;
      
      if (sell.branchId) {
        stats.branchCount[sell.branchId] = (stats.branchCount[sell.branchId] || 0) + 1;
      }
      
      if (sell.items) {
        sell.items.forEach(item => {
          stats.itemStatusCount[item.itemSaleStatus] = (stats.itemStatusCount[item.itemSaleStatus] || 0) + 1;
        });
      }
    });

    return stats;
  }
);

export const selectBatchUsageStatistics = createSelector(
  [selectUserSells],
  (sells) => {
    const batchStats: Record<string, { 
      batchId: string; 
      productId: string; 
      totalQuantity: number; 
      usedInSells: number;
    }> = {};

    sells.forEach(sell => {
      if (sell.items) {
        sell.items.forEach(item => {
          if (item.batches) {
            item.batches.forEach(sellItemBatch => {
              const key = sellItemBatch.batchId;
              if (!batchStats[key]) {
                batchStats[key] = {
                  batchId: sellItemBatch.batchId,
                  productId: item.productId,
                  totalQuantity: 0,
                  usedInSells: 0
                };
              }
              batchStats[key].totalQuantity += sellItemBatch.quantity;
              batchStats[key].usedInSells += 1;
            });
          }
        });
      }
    });

    return Object.values(batchStats);
  }
);

export default userSellsSlice.reducer;