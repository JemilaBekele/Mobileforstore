import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { 
  getAvailableBatchesByProductAndShop, 
  partialSaleDelivery 
} from "@/(services)/api/sell";
import { ProductBatch, DeliveryData, Sell } from "@/(utils)/types";

// Parameter types
export interface AvailableBatchesParams {
  shopId: string;
  productId: string;
}

export interface PartialDeliveryParams {
  id: string;
  deliveryData: DeliveryData;
}

// Async thunk for fetching available batches
export const fetchAvailableBatches = createAsyncThunk(
  "sellDelivery/fetchAvailableBatches",
  async (params: AvailableBatchesParams, { rejectWithValue }) => {
    try {
      const response = await getAvailableBatchesByProductAndShop(
        params.shopId, 
        params.productId
      );
      return {
        ...response,
        shopId: params.shopId,
        productId: params.productId
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch available batches");
    }
  }
);

// Async thunk for partial sale delivery
export const processPartialSaleDelivery = createAsyncThunk(
  "sellDelivery/processPartialSaleDelivery",
  async (params: PartialDeliveryParams, { rejectWithValue }) => {
    try {
      const response = await partialSaleDelivery(
        params.id, 
        params.deliveryData
      );
      return {
        ...response,
        sellId: params.id,
        deliveryData: params.deliveryData
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to process partial delivery");
    }
  }
);

// Define the state interface
interface SellDeliveryState {
  // Available batches state
  availableBatches: {
    data: ProductBatch[];
    loading: boolean;
    error: string | null;
    count: number;
    lastRequest?: {
      shopId: string;
      productId: string;
      timestamp: number;
    };
  };
  
  // Partial delivery state
  partialDelivery: {
    processing: boolean;
    error: string | null;
    success: boolean;
    lastProcessed?: {
      sellId: string;
      timestamp: number;
      message: string;
    };
    deliveredItems: Array<{
      sellId: string;
      itemId: string;
      timestamp: number;
    }>;
  };
  
  // Batch selection state (for UI)
  selectedBatches: Record<string, {
    batchId: string;
    quantity: number;
    maxQuantity: number;
  }[]>;
}

const initialState: SellDeliveryState = {
  availableBatches: {
    data: [],
    loading: false,
    error: null,
    count: 0,
    lastRequest: undefined,
  },
  partialDelivery: {
    processing: false,
    error: null,
    success: false,
    lastProcessed: undefined,
    deliveredItems: [],
  },
  selectedBatches: {},
};

const sellDeliverySlice = createSlice({
  name: "sellDelivery",
  initialState,
  reducers: {
    // Clear available batches data
    clearAvailableBatches: (state) => {
      state.availableBatches = {
        data: [],
        loading: false,
        error: null,
        count: 0,
        lastRequest: undefined,
      };
    },
    
    // Clear partial delivery state
    clearPartialDelivery: (state) => {
      state.partialDelivery = {
        processing: false,
        error: null,
        success: false,
        lastProcessed: undefined,
        deliveredItems: [],
      };
    },
    
    // Clear all delivery state
    clearAllDeliveryState: (state) => {
      state.availableBatches = initialState.availableBatches;
      state.partialDelivery = initialState.partialDelivery;
      state.selectedBatches = initialState.selectedBatches;
    },
    
    // Clear errors
    clearError: (state) => {
      state.availableBatches.error = null;
      state.partialDelivery.error = null;
    },
    
    // Reset success state
    resetSuccessState: (state) => {
      state.partialDelivery.success = false;
    },
    
    // Manage selected batches (for UI)
    selectBatch: (state, action: PayloadAction<{
      itemId: string;
      batchId: string;
      quantity: number;
      maxQuantity: number;
    }>) => {
      const { itemId, batchId, quantity, maxQuantity } = action.payload;
      
      if (!state.selectedBatches[itemId]) {
        state.selectedBatches[itemId] = [];
      }
      
      const existingIndex = state.selectedBatches[itemId].findIndex(
        batch => batch.batchId === batchId
      );
      
      if (existingIndex >= 0) {
        // Update existing selection
        state.selectedBatches[itemId][existingIndex].quantity = quantity;
      } else {
        // Add new selection
        state.selectedBatches[itemId].push({
          batchId,
          quantity,
          maxQuantity,
        });
      }
    },
    
    // Remove batch selection
    removeBatchSelection: (state, action: PayloadAction<{
      itemId: string;
      batchId: string;
    }>) => {
      const { itemId, batchId } = action.payload;
      
      if (state.selectedBatches[itemId]) {
        state.selectedBatches[itemId] = state.selectedBatches[itemId].filter(
          batch => batch.batchId !== batchId
        );
        
        // Remove empty item entry
        if (state.selectedBatches[itemId].length === 0) {
          delete state.selectedBatches[itemId];
        }
      }
    },
    
    // Clear all batch selections for an item
    clearItemBatchSelections: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      delete state.selectedBatches[itemId];
    },
    
    // Clear all batch selections
    clearAllBatchSelections: (state) => {
      state.selectedBatches = {};
    },
    
    // Update batch quantity
    updateBatchQuantity: (state, action: PayloadAction<{
      itemId: string;
      batchId: string;
      quantity: number;
    }>) => {
      const { itemId, batchId, quantity } = action.payload;
      
      if (state.selectedBatches[itemId]) {
        const batch = state.selectedBatches[itemId].find(
          b => b.batchId === batchId
        );
        
        if (batch) {
          batch.quantity = Math.min(quantity, batch.maxQuantity);
        }
      }
    },
    
    // Mark item as delivered (local tracking)
    markItemAsDelivered: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
    }>) => {
      const { sellId, itemId } = action.payload;
      
      // Check if already marked
      const alreadyMarked = state.partialDelivery.deliveredItems.some(
        item => item.sellId === sellId && item.itemId === itemId
      );
      
      if (!alreadyMarked) {
        state.partialDelivery.deliveredItems.push({
          sellId,
          itemId,
          timestamp: Date.now(),
        });
      }
    },
    
    // Unmark item as delivered
    unmarkItemAsDelivered: (state, action: PayloadAction<{
      sellId: string;
      itemId: string;
    }>) => {
      const { sellId, itemId } = action.payload;
      
      state.partialDelivery.deliveredItems = state.partialDelivery.deliveredItems.filter(
        item => !(item.sellId === sellId && item.itemId === itemId)
      );
    },
    
    // Clear delivered items for a specific sell
    clearDeliveredItemsForSell: (state, action: PayloadAction<string>) => {
      const sellId = action.payload;
      
      state.partialDelivery.deliveredItems = state.partialDelivery.deliveredItems.filter(
        item => item.sellId !== sellId
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available Batches
      .addCase(fetchAvailableBatches.pending, (state) => {
        state.availableBatches.loading = true;
        state.availableBatches.error = null;
      })
      .addCase(fetchAvailableBatches.fulfilled, (state, action: ReturnType<typeof fetchAvailableBatches.fulfilled>) => {
        state.availableBatches.loading = false;
        state.availableBatches.data = action.payload.batches;
        state.availableBatches.count = action.payload.count;
        state.availableBatches.lastRequest = {
          shopId: action.payload.shopId,
          productId: action.payload.productId,
          timestamp: Date.now(),
        };
        state.availableBatches.error = null;
      })
      .addCase(fetchAvailableBatches.rejected, (state, action: ReturnType<typeof fetchAvailableBatches.rejected>) => {
        state.availableBatches.loading = false;
        state.availableBatches.error = action.payload as string;
        state.availableBatches.data = [];
        state.availableBatches.count = 0;
      })
      
      // Process Partial Sale Delivery
      .addCase(processPartialSaleDelivery.pending, (state) => {
        state.partialDelivery.processing = true;
        state.partialDelivery.error = null;
        state.partialDelivery.success = false;
      })
      .addCase(processPartialSaleDelivery.fulfilled, (state, action: ReturnType<typeof processPartialSaleDelivery.fulfilled>) => {
        state.partialDelivery.processing = false;
        state.partialDelivery.success = true;
        state.partialDelivery.lastProcessed = {
          sellId: action.payload.sellId,
          timestamp: Date.now(),
          message: action.payload.message,
        };
        state.partialDelivery.error = null;
        
        // Clear selected batches for this delivery
        const deliveredItemIds = action.payload.deliveryData.items.map(item => item.itemId);
        deliveredItemIds.forEach(itemId => {
          delete state.selectedBatches[itemId];
        });
        
        // Clear delivered items tracking for this sell
        state.partialDelivery.deliveredItems = state.partialDelivery.deliveredItems.filter(
          item => item.sellId !== action.payload.sellId
        );
      })
      .addCase(processPartialSaleDelivery.rejected, (state, action: ReturnType<typeof processPartialSaleDelivery.rejected>) => {
        state.partialDelivery.processing = false;
        state.partialDelivery.error = action.payload as string;
        state.partialDelivery.success = false;
      });
  },
});

export const { 
  clearAvailableBatches,
  clearPartialDelivery,
  clearAllDeliveryState,
  clearError,
  resetSuccessState,
  selectBatch,
  removeBatchSelection,
  clearItemBatchSelections,
  clearAllBatchSelections,
  updateBatchQuantity,
  markItemAsDelivered,
  unmarkItemAsDelivered,
  clearDeliveredItemsForSell,
} = sellDeliverySlice.actions;

// Select the entire sellDelivery state
const selectSellDeliveryState = (state: { sellDelivery: SellDeliveryState }) => 
  state.sellDelivery;

// Memoized selectors for available batches
export const selectAvailableBatches = createSelector(
  [selectSellDeliveryState],
  (state) => state.availableBatches.data
);

export const selectAvailableBatchesLoading = createSelector(
  [selectSellDeliveryState],
  (state) => state.availableBatches.loading
);

export const selectAvailableBatchesError = createSelector(
  [selectSellDeliveryState],
  (state) => state.availableBatches.error
);

export const selectAvailableBatchesCount = createSelector(
  [selectSellDeliveryState],
  (state) => state.availableBatches.count
);

export const selectLastBatchRequest = createSelector(
  [selectSellDeliveryState],
  (state) => state.availableBatches.lastRequest
);

// Memoized selectors for partial delivery
export const selectPartialDeliveryProcessing = createSelector(
  [selectSellDeliveryState],
  (state) => state.partialDelivery.processing
);

export const selectPartialDeliveryError = createSelector(
  [selectSellDeliveryState],
  (state) => state.partialDelivery.error
);

export const selectPartialDeliverySuccess = createSelector(
  [selectSellDeliveryState],
  (state) => state.partialDelivery.success
);

export const selectLastProcessedDelivery = createSelector(
  [selectSellDeliveryState],
  (state) => state.partialDelivery.lastProcessed
);

export const selectDeliveredItems = createSelector(
  [selectSellDeliveryState],
  (state) => state.partialDelivery.deliveredItems
);

// Memoized selectors for selected batches
export const selectSelectedBatches = createSelector(
  [selectSellDeliveryState],
  (state) => state.selectedBatches
);

export const selectSelectedBatchesForItem = (itemId: string) => 
  createSelector(
    [selectSelectedBatches],
    (selectedBatches) => selectedBatches[itemId] || []
  );

export const selectTotalSelectedQuantityForItem = (itemId: string) => 
  createSelector(
    [selectSelectedBatchesForItem(itemId)],
    (batches) => batches.reduce((total, batch) => total + batch.quantity, 0)
  );

// Check if item has complete batch selection
export const selectIsItemFullyAllocated = (itemId: string, requiredQuantity: number) => 
  createSelector(
    [selectTotalSelectedQuantityForItem(itemId)],
    (totalSelected) => totalSelected === requiredQuantity
  );

// Get available batches for specific shop and product
export const selectAvailableBatchesForShopAndProduct = (shopId: string, productId: string) => 
  createSelector(
    [selectAvailableBatches, selectLastBatchRequest],
    (batches, lastRequest) => {
      // Only return batches if they match the last requested shop/product
      if (lastRequest?.shopId === shopId && lastRequest?.productId === productId) {
        return batches;
      }
      return [];
    }
  );

// Check if batches are loaded for specific shop and product
export const selectAreBatchesLoadedFor = (shopId: string, productId: string) => 
  createSelector(
    [selectLastBatchRequest],
    (lastRequest) => 
      lastRequest?.shopId === shopId && 
      lastRequest?.productId === productId
  );

// Get delivery summary for a sell
export const selectDeliverySummaryForSell = (sellId: string) => 
  createSelector(
    [selectDeliveredItems, selectLastProcessedDelivery],
    (deliveredItems, lastProcessed) => {
      const itemsForSell = deliveredItems.filter(item => item.sellId === sellId);
      const wasRecentlyProcessed = lastProcessed?.sellId === sellId;
      
      return {
        deliveredItemCount: itemsForSell.length,
        lastDeliveredAt: wasRecentlyProcessed ? lastProcessed?.timestamp : undefined,
        items: itemsForSell,
        recentlyProcessed: wasRecentlyProcessed,
      };
    }
  );

// Check if any delivery is in progress
export const selectIsDeliveryInProgress = createSelector(
  [selectPartialDeliveryProcessing],
  (processing) => processing
);

// Get validation status for batch selections
export const selectBatchSelectionValidation = createSelector(
  [selectSelectedBatches],
  (selectedBatches) => {
    const items = Object.keys(selectedBatches);
    const validation = {
      totalItems: items.length,
      totalBatches: 0,
      hasSelections: items.length > 0,
      itemValidations: {} as Record<string, {
        hasSelections: boolean;
        batchCount: number;
        totalQuantity: number;
      }>,
    };
    
    items.forEach(itemId => {
      const batches = selectedBatches[itemId];
      const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);
      
      validation.totalBatches += batches.length;
      validation.itemValidations[itemId] = {
        hasSelections: batches.length > 0,
        batchCount: batches.length,
        totalQuantity,
      };
    });
    
    return validation;
  }
);

export default sellDeliverySlice.reducer;