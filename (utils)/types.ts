export enum SaleStatus {
  NOT_APPROVED = "NOT_APPROVED",
  PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED",
  APPROVED = "APPROVED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED"
}

export enum ItemSaleStatus {
  PENDING = "PENDING",
  DELIVERED = "DELIVERED"
}

export interface User {
  id: string;
  name: string;
  email: string;
}
export interface DeliveryBatch {
  batchId: string;
  quantity: number;
}

export interface DeliveryItem {
  itemId: string;
  batches: DeliveryBatch[];
}

export interface DeliveryData {
  items: DeliveryItem[];
}
export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol?: string;
  base?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  branchId: string;
  branch: Branch;
}

export interface ProductBatch {
  availableQuantity: number;
  stock: number;
  quantity: number;
  id: string;
  batchNumber: string;
  expiryDate?: string;
    product?: Product;
      productId?: string;


}

// Add Product interface
export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price?: number;
  image?: string;
  imageUrl?: string;
}

export interface SellItemBatch {
  id: string;
  sellItemId: string;
  batchId: string;
  batch: ProductBatch;
  quantity: number; // quantity taken from this batch
}

export interface SellItem {
  id: string;
  sellId: string;
  sell?: Sell;

  productId: string;
  product: Product;

  shopId: string;
  shop: Shop;

  unitOfMeasureId: string;
  unitOfMeasure: UnitOfMeasure;

  itemSaleStatus: ItemSaleStatus; // PENDING / DELIVERED

  quantity: number;
  unitPrice: number;
  totalPrice: number;

  createdAt: string;
  updatedAt: string;

  // ✅ New: batches (from sell_item_batches)
  batches: SellItemBatch[];
}

export interface Sell {
  lockedAt: any;
  locked: any;
  id: string;
  invoiceNo: string;
  saleStatus: SaleStatus; // NOT_APPROVED, PARTIALLY_DELIVERED, APPROVED, DELIVERED, CANCELLED

  branchId?: string;
  branch?: Branch;

  customerId?: string;
  customer?: Customer;

  totalProducts: number;
  subTotal: number;
  discount: number;
  vat: number;
  grandTotal: number;
  NetTotal: number;

  notes?: string;
  saleDate: string;

  createdById?: string;
  createdBy?: User;
  updatedById?: string;
  updatedBy?: User;

  createdAt: string;
  updatedAt: string;

  items: SellItem[];

  _count: {
    items: number;
  };
}

export interface GetAllSellsUserParams {
  status: any;
  salesPersonName: any;
  customerName: any;
  startDate?: string;
  endDate?: string;
  userId: string;
  id?: string;
}

export interface GetAllSellsUserResponse {
  success: boolean;
  sells: Sell[];
  count: number;
}

export interface GetUserDashboardSummaryParams {
  userId: string;
}

export interface GetUserDashboardSummaryResponse {
  success: boolean;
  userShopsCount: number;
  userStoresCount: number;
  approvedSalesCount: number;
  salesStats: {
    totalSales: number;
    totalRevenue: number;
    totalGrossRevenue: number;
    totalSubTotal: number;
    deliveredItemsCount: number;
  };
  pendingDelivery: {
    totalItems: number;
    shopsWithPending: number;
    breakdown: {
      shopId: string;
      shopName: string;
      pendingCount: number;
    }[];
  };
  stockAlerts: {
    lowStockProducts: any[];
    expiredProducts: any[];
    expiringSoonProducts: any[];
    totalAlerts: number;
  };
  shopStockSummary: any[];
  storeStockSummary: any[];
  summary: {
    totalProductsInShops: number;
    totalProductsInStores: number;
    totalUniqueProducts: number;
    criticalAlerts: number;
  };
}