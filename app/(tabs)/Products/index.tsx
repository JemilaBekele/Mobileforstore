import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import {
  Card,
  Text,
  XStack,
  YStack,
  Button,
  ScrollView,
  Spinner,
  H4,
  H3,
  Input,
  Fieldset,
  Label,
  Switch,
  Progress,
} from 'tamagui';
import { useFocusEffect } from 'expo-router';

// Import React Query hooks and types
import {
  useProductsQuery,
  useToggleProductActiveMutation,
  selectProductsLoading,
  selectProductsError,
  selectUserAccessibleShops,
  Product,
  Shop,
  AdditionalPrice,
  BatchStockDetails,
  ProductSubProduct,
} from '@/(services)/api/product';
import { formatMoney, formatQty, toNumber } from '@/(utils)/format';

const BACKEND_URL = "https://ordere.net";

export const normalizeImagePath = (path?: string) => {
  if (!path) return undefined;
  const normalizedPath = path.replace(/\\/g, '/');
  if (normalizedPath.startsWith('http')) {
    return normalizedPath;
  }
  const cleanPath = normalizedPath.replace(/^\/+/, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

// Custom Badge Component
const Badge = ({
  children,
  backgroundColor,
  ...props
}: {
  children: React.ReactNode;
  backgroundColor: string;
  [key: string]: any;
}) => (
  <YStack
    backgroundColor={backgroundColor}
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$2"
    alignItems="center"
    justifyContent="center"
    {...props}
  >
    <Text fontSize="$1" fontWeight="700" color="white">
      {children}
    </Text>
  </YStack>
);

// Custom Select Component to replace Tamagui Select
const CustomSelect = ({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <YStack>
      <Button
        onPress={() => setShowOptions(true)}
        backgroundColor="$orange1"
        borderColor="$orange5"
        borderWidth={1}
        borderRadius="$3"
        justifyContent="space-between"
        paddingHorizontal="$3"
        paddingVertical="$2"
      >
        <Text
          color={value ? "$orange12" : "$orange11"}
          fontWeight="600"
          fontSize="$3"
          numberOfLines={1}
          flex={1}
          textAlign="left"
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Text color="$orange9" fontSize="$2">▼</Text>
      </Button>

      {showOptions && (
        <Modal
          visible={showOptions}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowOptions(false)}
        >
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            backgroundColor="rgba(0,0,0,0.5)"
            padding="$4"
          >
            <YStack
              backgroundColor="$orange1"
              borderRadius="$4"
              padding="$4"
              width="100%"
              maxWidth={400}
              borderWidth={1}
              borderColor="$orange4"
            >
              <YStack space="$3">
                <H4 textAlign="center" color="$orange12">
                  {placeholder}
                </H4>
                <ScrollView maxHeight={300}>
                  <YStack space="$2">
                    {options.map((option) => (
                      <Button
                        key={option.value}
                        onPress={() => {
                          onValueChange(option.value);
                          setShowOptions(false);
                        }}
                        backgroundColor={value === option.value ? "$orange2" : "$orange1"}
                        borderColor={value === option.value ? "$orange9" : "$orange4"}
                        borderWidth={1}
                        borderRadius="$3"
                      >
                        <Text
                          color={value === option.value ? "$orange9" : "$orange12"}
                          fontWeight="600"
                        >
                          {option.label}
                        </Text>
                      </Button>
                    ))}
                  </YStack>
                </ScrollView>
                <Button
                  backgroundColor="$orange1"
                  borderColor="$orange9"
                  borderWidth={1}
                  borderRadius="$4"
                  onPress={() => setShowOptions(false)}
                >
                  <Text color="$orange9" fontWeight="600">Cancel</Text>
                </Button>
              </YStack>
            </YStack>
          </YStack>
        </Modal>
      )}
    </YStack>
  );
};

// Stock Badge Component
// Low stock uses the product's own alert level (warningQuantity); 0 or missing
// means the product has no low-stock alert, only out of stock / in stock.
const StockBadge = ({ stock, warningQuantity = 0 }: { stock: number; warningQuantity?: number }) => {
  if (stock <= 0) {
    return (
      <Badge backgroundColor="$red9">
        <Text color="white" fontSize="$1" fontWeight="700">Out of Stock</Text>
      </Badge>
    );
  } else if (warningQuantity > 0 && stock <= warningQuantity) {
    return (
      <Badge backgroundColor="$orange9">
        <Text color="white" fontSize="$1" fontWeight="700">Low Stock</Text>
      </Badge>
    );
  } else {
    return (
      <Badge backgroundColor="$green9">
        <Text color="white" fontSize="$1" fontWeight="700">In Stock</Text>
      </Badge>
    );
  }
};

const isLowStock = (stock: number, warningQuantity = 0) =>
  stock > 0 && warningQuantity > 0 && stock <= warningQuantity;

// Additional prices are alternative price options (e.g. "Wholesale"), not
// amounts added to the standard price. Pass subProductId to get the ones for
// that sub-product; without it you get the product-level ones.
const getApplicablePrices = (
  additionalPrices: AdditionalPrice[] | undefined,
  options: { shopId?: string; subProductId?: string | null } = {},
): AdditionalPrice[] =>
  (additionalPrices || []).filter(ap =>
    (ap.subProductId ?? null) === (options.subProductId ?? null) &&
    (!ap.shopId || !options.shopId || ap.shopId === options.shopId)
  );

// Small labelled chips: "Wholesale · ETB 95.00", shop-only ones get the shop name
const AdditionalPriceChips = ({ prices, align = 'flex-start' }: {
  prices: AdditionalPrice[];
  align?: 'flex-start' | 'flex-end';
}) => {
  if (prices.length === 0) return null;
  return (
    <XStack flexWrap="wrap" gap="$1" justifyContent={align}>
      {prices.map(ap => (
        <YStack
          key={ap.id}
          backgroundColor="$orange2"
          borderColor="$orange6"
          borderWidth={1}
          borderRadius="$2"
          paddingHorizontal="$2"
          paddingVertical={2}
        >
          <Text fontSize="$1" color="$orange11">
            {ap.label || 'Alt. price'} · <Text fontSize="$1" fontWeight="700" color="$orange12">{formatMoney(ap.price)}</Text>
            {ap.shopId ? ` (${ap.shop?.name || 'shop only'})` : ''}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
};

// Price Display Component
const PriceDisplay = ({ price, additionalPrices, shopId }: {
  price: number | string | null;
  additionalPrices?: AdditionalPrice[];
  shopId?: string;
}) => {
  const options = getApplicablePrices(additionalPrices, { shopId });

  return (
    <YStack alignItems="flex-start" space="$1" flex={1}>
      <Text fontSize="$5" fontWeight="800" color="$orange9">
        {formatMoney(price)}
      </Text>
      <AdditionalPriceChips prices={options} />
    </YStack>
  );
};

// Batch Expiry Indicator
const BatchExpiryIndicator = ({ batches }: { batches?: BatchStockDetails[] }) => {
  if (!batches || batches.length === 0) return null;

  const expiringBatches = batches.filter(batch => {
    if (!batch.expiryDate) return false;
    const expiryDate = new Date(batch.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  if (expiringBatches.length === 0) return null;

  return (
    <Badge backgroundColor="$yellow9">
      <Text color="white" fontSize="$1" fontWeight="600">
        ⚠️ {expiringBatches.length} batch{expiringBatches.length > 1 ? 'es' : ''} expiring
      </Text>
    </Badge>
  );
};

// Helper function to get shop stock from branchStocks structure.
// branchStocks is keyed by branch name, and each branch's shops by shop name.
const getShopStockFromBranchStocks = (product: Product, shopId?: string, shops: Shop[] = []): number => {
  if (!shopId || !product.stockSummary?.branchStocks) return 0;
  const shop = shops.find(s => s.id === shopId);

  let totalShopStock = 0;
  for (const [branchName, branchStock] of Object.entries(product.stockSummary.branchStocks)) {
    if (!branchStock.shops) continue;
    if (shop) {
      if (shop.branch?.name && shop.branch.name !== branchName && branchStock.branchId !== shop.branch.id) continue;
      totalShopStock += branchStock.shops[shop.name] || 0;
    } else if (branchStock.shops[shopId]) {
      totalShopStock += branchStock.shops[shopId];
    }
  }
  return totalShopStock;
};

// Flattens branchStocks into per-shop and per-store rows (with branch name)
const getLocationStocks = (product: Product) => {
  const shopRows: { key: string; name: string; branch: string; qty: number }[] = [];
  const storeRows: { key: string; name: string; branch: string; qty: number }[] = [];
  const branchStocks = product.stockSummary?.branchStocks || {};
  for (const [branchName, branchStock] of Object.entries(branchStocks)) {
    for (const [shopName, qty] of Object.entries(branchStock.shops || {})) {
      shopRows.push({ key: `${branchName}/${shopName}`, name: shopName, branch: branchName, qty });
    }
    for (const [storeName, qty] of Object.entries(branchStock.stores || {})) {
      storeRows.push({ key: `${branchName}/${storeName}`, name: storeName, branch: branchName, qty });
    }
  }
  return { shopRows, storeRows };
};

// Product Card Component
const ProductCard = ({
  product,
  onPress,
  selectedShopId,
  shops,
}: {
  product: Product;
  onPress: (product: Product) => void;
  selectedShopId?: string;
  shops: Shop[];
}) => {
  const totalStock = product.stockSummary?.totalStock || 0;
  const warningQuantity = product.warningQuantity || 0;
  const subProductCount = product.subProducts?.length || 0;

  // Calculate shop stock from branchStocks structure
  const shopStock = React.useMemo(() => {
    return getShopStockFromBranchStocks(product, selectedShopId, shops);
  }, [product, selectedShopId, shops]);

  // Get normalized image URL
  const productImageUrl = normalizeImagePath(product.imageUrl);

  return (
    <Card
      bordered
      borderRadius="$5"
      backgroundColor="$orange1"
      borderColor="$orange4"
      borderWidth={1}
      onPress={() => onPress(product)}
      pressStyle={{ backgroundColor: '$orange2' }}
    >
      <Card.Header padded>
        <YStack space="$3">
          {/* Product Image and Header */}
          <XStack space="$3">
            {/* Product Image */}
            {productImageUrl ? (
              <YStack
                width={80}
                height={80}
                borderRadius="$4"
                overflow="hidden"
                backgroundColor="$orange2"
                borderWidth={1}
                borderColor="$orange4"
              >
                <Image
                  source={{ uri: productImageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </YStack>
            ) : (
              <YStack
                width={80}
                height={80}
                borderRadius="$4"
                backgroundColor="$orange2"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$6" color="$orange8">
                  📦
                </Text>
              </YStack>
            )}

            {/* Product Info */}
            <YStack flex={1} space="$2">
              {/* Product Header */}
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack flex={1} space="$1">
                  <Text fontSize="$5" fontWeight="700" color="$orange12" numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text fontSize="$2" color="$orange11">
                    Code: {product.productCode}
                  </Text>
                  {product.generic ? (
                    <Text fontSize="$2" color="$orange11" numberOfLines={1}>
                      Generic: {product.generic}
                    </Text>
                  ) : null}
                </YStack>
                <YStack alignItems="flex-end" space="$1">
                  <StockBadge stock={totalStock} warningQuantity={warningQuantity} />
                  {!product.isActive && (
                    <Badge backgroundColor="$red9">
                      <Text color="white" fontSize="$1" fontWeight="600">Inactive</Text>
                    </Badge>
                  )}
                  <BatchExpiryIndicator batches={product.stockSummary?.batchStockDetails} />
                </YStack>
              </XStack>

              {/* Category Info */}
              <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$1">
                <Text fontSize="$2" color="$orange10" fontWeight="600">
                  {product.category.name}
                  {product.subCategory ? ` › ${product.subCategory.name}` : ''}
                </Text>
                {subProductCount > 0 && (
                  <YStack
                    backgroundColor="$orange2"
                    borderColor="$orange6"
                    borderWidth={1}
                    borderRadius="$2"
                    paddingHorizontal="$2"
                    paddingVertical={2}
                  >
                    <Text fontSize="$1" fontWeight="600" color="$orange10">
                      {subProductCount} sub-product{subProductCount > 1 ? 's' : ''}
                    </Text>
                  </YStack>
                )}
              </XStack>
            </YStack>
          </XStack>

          {/* Stock Information */}
          <YStack space="$2">
            <XStack justifyContent="space-between">
              <Text fontSize="$3" fontWeight="600" color="$orange11">
                Total Stock:
              </Text>
              <Text fontSize="$3" fontWeight="700" color="$orange12">
                {formatQty(totalStock)} units
              </Text>
            </XStack>

            {selectedShopId ? (
              <XStack justifyContent="space-between">
                <Text fontSize="$2" color="$orange11">
                  This Shop:
                </Text>
                <Text fontSize="$2" fontWeight="600" color="$orange12">
                  {formatQty(shopStock)} units
                </Text>
              </XStack>
            ) : null}

            {/* Stock Progress Bar */}
            <YStack space="$1">
              <XStack justifyContent="space-between">
                <Text fontSize="$1" color="$orange11">Stock Level</Text>
                <Text fontSize="$1" color="$orange11">
                  {warningQuantity > 0 ? `Alert at ${formatQty(warningQuantity)}` : `${formatQty(totalStock)} units`}
                </Text>
              </XStack>
              <Progress
                value={Math.min((totalStock / Math.max(warningQuantity * 3, 100)) * 100, 100)}
                size="$1"
                backgroundColor="$orange4"
              >
                <Progress.Indicator
                  backgroundColor={
                    totalStock <= 0 ? '$red9' :
                    isLowStock(totalStock, warningQuantity) ? '$orange9' : '$green9'
                  }
                />
              </Progress>
            </YStack>
          </YStack>

          {/* Price and Actions */}
          <XStack justifyContent="space-between" alignItems="center" space="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="$orange4">
            <PriceDisplay
              price={product.sellPrice}
              additionalPrices={product.AdditionalPrice}
              shopId={selectedShopId}
            />
            <Button
              size="$2"
              backgroundColor="$orange1"
              borderColor="$orange9"
              borderWidth={1}
              borderRadius="$3"
              onPress={() => onPress(product)}
            >
              <Text color="$orange9" fontWeight="700" fontSize="$2">
                Details
              </Text>
            </Button>
          </XStack>
        </YStack>
      </Card.Header>
    </Card>
  );
};

// Filter Modal Component
const FilterModal = ({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
  shops,
}: {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  currentFilters: any;
  shops: Shop[];
}) => {
  const [localFilters, setLocalFilters] = useState(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      categoryId: undefined,
      subCategoryId: undefined,
      isActive: undefined,
      searchTerm: '',
      minStock: undefined,
      maxStock: undefined,
      shopId: '',
    };
    setLocalFilters(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
  };

  const updateLocalFilter = (key: string, value: any) => {
    setLocalFilters((prev: any) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const shopOptions = [
    { value: '', label: 'All shops' },
    ...shops.map(shop => ({ value: shop.id, label: shop.name }))
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active only' },
    { value: 'inactive', label: 'Inactive only' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          backgroundColor="rgba(0,0,0,0.5)"
          padding="$4"
        >
          <TouchableWithoutFeedback>
            <YStack
              backgroundColor="$orange1"
              borderRadius="$4"
              padding="$4"
              width="100%"
              maxWidth={400}
              borderWidth={1}
              borderColor="$orange4"
              maxHeight="90%"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack space="$4">
                  <H4 textAlign="center" color="$orange12">
                    Filter Products
                  </H4>

                  {/* Search */}
                  <Fieldset>
                    <Label htmlFor="search" fontSize="$3" fontWeight="600" color="$orange12">
                      Search
                    </Label>
                    <Input
                      id="search"
                      value={localFilters.searchTerm || ''}
                      onChangeText={(text) => updateLocalFilter('searchTerm', text)}
                      placeholder="Search products..."
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                    />
                  </Fieldset>

                  {/* Stock Range */}
                  <YStack space="$3">
                    <Text fontSize="$4" fontWeight="600" color="$orange11">
                      Stock Range
                    </Text>

                    <Fieldset>
                      <Label htmlFor="minStock" fontSize="$3" fontWeight="600" color="$orange12">
                        Minimum Stock
                      </Label>
                      <Input
                        id="minStock"
                        value={localFilters.minStock?.toString() || ''}
                        onChangeText={(text) => updateLocalFilter('minStock', text ? parseInt(text) : undefined)}
                        placeholder="0"
                        keyboardType="numeric"
                        borderColor="$orange5"
                        backgroundColor="$orange1"
                      />
                    </Fieldset>

                    <Fieldset>
                      <Label htmlFor="maxStock" fontSize="$3" fontWeight="600" color="$orange12">
                        Maximum Stock
                      </Label>
                      <Input
                        id="maxStock"
                        value={localFilters.maxStock?.toString() || ''}
                        onChangeText={(text) => updateLocalFilter('maxStock', text ? parseInt(text) : undefined)}
                        placeholder="100"
                        keyboardType="numeric"
                        borderColor="$orange5"
                        backgroundColor="$orange1"
                      />
                    </Fieldset>
                  </YStack>

                  {/* Shop Filter */}
                  {shops.length > 0 && (
                    <Fieldset>
                      <Label htmlFor="shopFilter" fontSize="$3" fontWeight="600" color="$orange12">
                        Filter by Shop Stock
                      </Label>
                      <CustomSelect
                        value={localFilters.shopId || ''}
                        onValueChange={(value) => updateLocalFilter('shopId', value)}
                        options={shopOptions}
                        placeholder="All shops"
                      />
                    </Fieldset>
                  )}

                  {/* Status Filter */}
                  <Fieldset>
                    <Label htmlFor="statusFilter" fontSize="$3" fontWeight="600" color="$orange12">
                      Status
                    </Label>
                    <CustomSelect
                      value={localFilters.isActive || ''}
                      onValueChange={(value) => updateLocalFilter('isActive', value)}
                      options={statusOptions}
                      placeholder="All statuses"
                    />
                  </Fieldset>

                  {/* Active Filters Summary */}
                  {(localFilters.searchTerm ||
                    localFilters.minStock !== undefined ||
                    localFilters.maxStock !== undefined ||
                    localFilters.shopId ||
                    localFilters.isActive) && (
                    <Card backgroundColor="$orange2" padding="$3" borderRadius="$3">
                      <Text fontSize="$3" fontWeight="600" color="$orange11">
                        Active Filters:
                      </Text>
                      <YStack space="$1" marginTop="$2">
                        {localFilters.searchTerm && (
                          <XStack>
                            <Text fontSize="$2" color="$orange10">Search: </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange12">{localFilters.searchTerm}</Text>
                          </XStack>
                        )}
                        {localFilters.minStock !== undefined && (
                          <XStack>
                            <Text fontSize="$2" color="$orange10">Min Stock: </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange12">{localFilters.minStock}</Text>
                          </XStack>
                        )}
                        {localFilters.maxStock !== undefined && (
                          <XStack>
                            <Text fontSize="$2" color="$orange10">Max Stock: </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange12">{localFilters.maxStock}</Text>
                          </XStack>
                        )}
                        {localFilters.shopId && (
                          <XStack>
                            <Text fontSize="$2" color="$orange10">Shop: </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange12">
                              {shops.find(s => s.id === localFilters.shopId)?.name}
                            </Text>
                          </XStack>
                        )}
                        {localFilters.isActive && (
                          <XStack>
                            <Text fontSize="$2" color="$orange10">Status: </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange12">
                              {localFilters.isActive === 'active' ? 'Active' : 'Inactive'}
                            </Text>
                          </XStack>
                        )}
                      </YStack>
                    </Card>
                  )}

                  <XStack space="$3" marginTop="$2">
                    <Button
                      flex={1}
                      backgroundColor="$orange1"
                      borderColor="$orange9"
                      borderWidth={1}
                      borderRadius="$4"
                      onPress={handleClear}
                    >
                      <Text color="$orange9" fontWeight="600">Clear All</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange9"
                      borderColor="$orange9"
                      borderWidth={1}
                      borderRadius="$4"
                      onPress={handleApply}
                    >
                      <Text color="white" fontWeight="600">Apply Filters</Text>
                    </Button>
                  </XStack>
                </YStack>
              </ScrollView>
            </YStack>
          </TouchableWithoutFeedback>
        </YStack>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Sort Modal Component
const SortModal = ({
  visible,
  onClose,
  onApplySort,
  currentSort,
}: {
  visible: boolean;
  onClose: () => void;
  onApplySort: (sort: any) => void;
  currentSort: any;
}) => {
  const [localSort, setLocalSort] = useState(currentSort);

  useEffect(() => {
    setLocalSort(currentSort);
  }, [currentSort]);

  const handleApply = () => {
    onApplySort(localSort);
    onClose();
  };

  const sortFields = [
    { value: 'name', label: 'Product Name' },
    { value: 'productCode', label: 'Product Code' },
    { value: 'totalStock', label: 'Total Stock' },
    { value: 'price', label: 'Price' },
    { value: 'createdAt', label: 'Date Created' },
  ];

  const directionOptions = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        backgroundColor="rgba(0,0,0,0.5)"
        padding="$4"
      >
        <YStack
          backgroundColor="$orange1"
          borderRadius="$4"
          padding="$4"
          width="100%"
          maxWidth={400}
          borderWidth={1}
          borderColor="$orange4"
        >
          <YStack space="$4">
            <H4 textAlign="center" color="$orange12">
              Sort Products
            </H4>

            {/* Sort Field */}
            <Fieldset>
              <Label htmlFor="sortField" fontSize="$3" fontWeight="600" color="$orange12">
                Sort By
              </Label>
              <CustomSelect
                value={localSort.field}
                onValueChange={(value) => setLocalSort((prev: any) => ({ ...prev, field: value }))}
                options={sortFields}
                placeholder="Select field"
              />
            </Fieldset>

            {/* Sort Direction */}
            <Fieldset>
              <Label htmlFor="sortDirection" fontSize="$3" fontWeight="600" color="$orange12">
                Direction
              </Label>
              <CustomSelect
                value={localSort.direction}
                onValueChange={(value) => setLocalSort((prev: any) => ({ ...prev, direction: value }))}
                options={directionOptions}
                placeholder="Select direction"
              />
            </Fieldset>

            <XStack space="$3" marginTop="$2">
              <Button
                flex={1}
                backgroundColor="$orange1"
                borderColor="$orange9"
                borderWidth={1}
                borderRadius="$4"
                onPress={onClose}
              >
                <Text color="$orange9" fontWeight="600">Cancel</Text>
              </Button>
              <Button
                flex={1}
                backgroundColor="$orange9"
                borderColor="$orange9"
                borderWidth={1}
                borderRadius="$4"
                onPress={handleApply}
              >
                <Text color="white" fontWeight="600">Apply Sort</Text>
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  );
};

// One row of the Sub-products section in the detail sheet
const SubProductRow = ({ subProduct, product }: { subProduct: ProductSubProduct; product: Product }) => {
  const usesProductPrice = subProduct.sellPrice === null || subProduct.sellPrice === undefined;
  const ownPrices = (product.AdditionalPrice || []).filter(ap => ap.subProductId === subProduct.id);
  const subImageUrl = normalizeImagePath(subProduct.imageUrl);

  return (
    <YStack
      backgroundColor="$orange1"
      borderColor="$orange4"
      borderWidth={1}
      borderRadius="$3"
      padding="$3"
      space="$2"
    >
      <XStack space="$2" alignItems="flex-start">
        {subImageUrl ? (
          <YStack width={44} height={44} borderRadius="$2" overflow="hidden" backgroundColor="$orange2">
            <Image source={{ uri: subImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </YStack>
        ) : null}
        <YStack flex={1} space="$1">
          <Text fontWeight="700" color="$orange12" numberOfLines={2}>
            {subProduct.name}
          </Text>
          <Text fontSize="$1" color="$orange11">
            Code: {subProduct.subProductCode}
          </Text>
        </YStack>
        <StockBadge stock={subProduct.totalStock || 0} warningQuantity={product.warningQuantity || 0} />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$orange11">Price:</Text>
        <Text fontSize="$3" fontWeight="700" color="$orange9">
          {formatMoney(usesProductPrice ? product.sellPrice : subProduct.sellPrice)}
          {usesProductPrice ? <Text fontSize="$1" fontWeight="400" color="$orange11"> (product price)</Text> : null}
        </Text>
      </XStack>

      <XStack justifyContent="space-between">
        <Text fontSize="$2" color="$orange11">Stock:</Text>
        <Text fontSize="$2" fontWeight="600" color="$orange12">
          {formatQty(subProduct.totalStock || 0)} units
          <Text fontSize="$1" fontWeight="400" color="$orange11">
            {`  (shop ${formatQty(subProduct.totalShopStock || 0)} · store ${formatQty(subProduct.totalStoreStock || 0)})`}
          </Text>
        </Text>
      </XStack>

      {ownPrices.length > 0 && (
        <YStack space="$1">
          <Text fontSize="$1" color="$orange11">Other prices:</Text>
          <AdditionalPriceChips prices={ownPrices} />
        </YStack>
      )}
    </YStack>
  );
};

// Section card used inside the detail sheet
const DetailSection = ({ children }: { children: React.ReactNode }) => (
  <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$4" borderRadius="$4">
    {children}
  </Card>
);

const LocationStockList = ({ title, rows }: {
  title: string;
  rows: { key: string; name: string; branch: string; qty: number }[];
}) => {
  if (rows.length === 0) return null;
  return (
    <YStack space="$2">
      <Text fontWeight="600" color="$orange11">{title}</Text>
      {rows.map(row => (
        <XStack key={row.key} justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text color="$orange12" fontSize="$2">{row.name}</Text>
            <Text color="$orange11" fontSize="$1">{row.branch}</Text>
          </YStack>
          <Text color="$orange12" fontSize="$2" fontWeight="600">
            {formatQty(row.qty)} units
          </Text>
        </XStack>
      ))}
    </YStack>
  );
};

// Product Detail Modal
const ProductDetailModal = ({
  product,
  visible,
  onClose,
  onToggleActive,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  shops: Shop[];
  onToggleActive: (productId: string) => void;
}) => {
  if (!product) return null;

  const totalStock = product.stockSummary?.totalStock || 0;
  const warningQuantity = product.warningQuantity || 0;
  const batchDetails = product.stockSummary?.batchStockDetails || [];
  const { shopRows, storeRows } = getLocationStocks(product);
  const subProducts = product.subProducts || [];
  const productPrices = getApplicablePrices(product.AdditionalPrice);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        backgroundColor="rgba(0,0,0,0.5)"
        justifyContent="flex-end"
      >
        <YStack
          backgroundColor="$orange1"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6"
          padding="$4"
          maxHeight="85%"
          borderWidth={1}
          borderColor="$orange4"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack space="$4">
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center" space="$2">
                <YStack flex={1}>
                  <H4 color="$orange12" fontWeight="800" numberOfLines={2}>
                    {product.name}
                  </H4>
                  <YStack width={36} height={3} borderRadius={2} backgroundColor="$orange9" marginTop="$1" />
                </YStack>
                <Button
                  size="$2"
                  circular
                  backgroundColor="$orange2"
                  borderColor="$orange4"
                  borderWidth={1}
                  onPress={onClose}
                >
                  <Text color="$orange12">✕</Text>
                </Button>
              </XStack>

              {/* Basic Info */}
              <DetailSection>
                <YStack space="$3">
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Product Code:</Text>
                    <Text color="$orange12">{product.productCode}</Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Category:</Text>
                    <Text color="$orange12">
                      {product.category.name}
                      {product.subCategory ? ` › ${product.subCategory.name}` : ''}
                    </Text>
                  </XStack>
                  {product.generic ? (
                    <XStack justifyContent="space-between">
                      <Text fontWeight="600" color="$orange11">Generic:</Text>
                      <Text color="$orange12">{product.generic}</Text>
                    </XStack>
                  ) : null}
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Status:</Text>
                    <XStack alignItems="center" space="$2">
                      <Text color={product.isActive ? '$green10' : '$red10'} fontWeight="600">
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Text>
                      <Switch
                        size="$2"
                        checked={product.isActive}
                        onCheckedChange={() => onToggleActive(product.id)}
                        backgroundColor={product.isActive ? '$green8' : '$red8'}
                      >
                        <Switch.Thumb />
                      </Switch>
                    </XStack>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Sell Price:</Text>
                    <Text color="$orange9" fontWeight="800">
                      {formatMoney(product.sellPrice)}
                    </Text>
                  </XStack>
                  {productPrices.length > 0 && (
                    <YStack space="$1">
                      <Text fontWeight="600" color="$orange11">Other prices:</Text>
                      <AdditionalPriceChips prices={productPrices} />
                    </YStack>
                  )}
                  {warningQuantity > 0 && (
                    <XStack justifyContent="space-between">
                      <Text fontWeight="600" color="$orange11">Low-stock alert at:</Text>
                      <Text color="$orange12">{formatQty(warningQuantity)} units</Text>
                    </XStack>
                  )}
                </YStack>
              </DetailSection>

              {/* Stock Summary */}
              <DetailSection>
                <YStack space="$3">
                  <Text fontWeight="700" color="$orange12" fontSize="$5">
                    Stock Summary
                  </Text>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="600" color="$orange11">
                      Total Stock: <Text color="$orange12" fontWeight="700">{formatQty(totalStock)} units</Text>
                    </Text>
                    <StockBadge stock={totalStock} warningQuantity={warningQuantity} />
                  </XStack>

                  {/* Shop Stocks */}
                  <LocationStockList title="Shop Stocks:" rows={shopRows} />

                  {/* Store Stocks */}
                  <LocationStockList title="Store Stocks:" rows={storeRows} />

                  {/* Stock Totals */}
                  <XStack justifyContent="space-between" paddingTop="$2" borderTopWidth={1} borderTopColor="$orange4">
                    <YStack space="$1" flex={1}>
                      <XStack justifyContent="space-between">
                        <Text color="$orange11" fontSize="$2">Total Shop Stock:</Text>
                        <Text color="$orange12" fontSize="$2" fontWeight="600">
                          {formatQty(product.stockSummary?.totalShopStock || 0)} units
                        </Text>
                      </XStack>
                      <XStack justifyContent="space-between">
                        <Text color="$orange11" fontSize="$2">Total Store Stock:</Text>
                        <Text color="$orange12" fontSize="$2" fontWeight="600">
                          {formatQty(product.stockSummary?.totalStoreStock || 0)} units
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                </YStack>
              </DetailSection>

              {/* Sub-products */}
              {subProducts.length > 0 && (
                <DetailSection>
                  <YStack space="$3">
                    <Text fontWeight="700" color="$orange12" fontSize="$5">
                      Sub-products ({subProducts.length})
                    </Text>
                    {subProducts.map(subProduct => (
                      <SubProductRow key={subProduct.id} subProduct={subProduct} product={product} />
                    ))}
                  </YStack>
                </DetailSection>
              )}

              {/* Batch Details */}
              {batchDetails.length > 0 && (
                <DetailSection>
                  <YStack space="$3">
                    <Text fontWeight="700" color="$orange12" fontSize="$5">
                      Batch Details ({batchDetails.length})
                    </Text>
                    {batchDetails.map((batch) => {
                      const batchSubProduct = batch.subProductId
                        ? subProducts.find(sp => sp.id === batch.subProductId)
                        : undefined;
                      return (
                        <Card key={batch.batchId} backgroundColor="$orange2" padding="$3" borderRadius="$3">
                          <YStack space="$2">
                            <XStack justifyContent="space-between">
                              <Text fontWeight="600" color="$orange12">
                                Batch #{batch.batchNumber || batch.batchId?.slice(-6) || 'N/A'}
                              </Text>
                              <Text color="$orange11">
                                {formatQty(batch.totalStock)} units
                              </Text>
                            </XStack>
                            {batchSubProduct ? (
                              <Text color="$orange11" fontSize="$1">{batchSubProduct.name}</Text>
                            ) : null}
                            {batch.expiryDate ? (
                              <XStack justifyContent="space-between">
                                <Text color="$orange11" fontSize="$1">Expiry:</Text>
                                <Text color="$orange12" fontSize="$1" fontWeight="600">
                                  {new Date(batch.expiryDate).toLocaleDateString()}
                                </Text>
                              </XStack>
                            ) : null}
                          </YStack>
                        </Card>
                      );
                    })}
                  </YStack>
                </DetailSection>
              )}

              {product.description ? (
                <DetailSection>
                  <YStack space="$2">
                    <Text fontWeight="600" color="$orange11">Description:</Text>
                    <Text color="$orange12">{product.description}</Text>
                  </YStack>
                </DetailSection>
              ) : null}
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
};

// Helper function to get shop name by ID
const getShopNameById = (shopId: string, shops: Shop[]): string => {
  const shop = shops.find(s => s.id === shopId);
  return shop?.name || shopId;
};

// Main Products Screen
export default function ProductsScreen() {
  // React Query hooks - NO FILTERS PASSED TO BACKEND
  const { data, isLoading, isFetching, error, refetch } = useProductsQuery();
  const toggleProductMutation = useToggleProductActiveMutation();

  // Local state for filters and sort
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [filters, setFilters] = useState({
    searchTerm: '',
    minStock: undefined as number | undefined,
    maxStock: undefined as number | undefined,
    shopId: '',
    isActive: '' as 'active' | 'inactive' | '',
  });
  const [sortOption, setSortOption] = useState({
    field: 'name',
    direction: 'asc' as 'asc' | 'desc',
  });

  // Process products data
  const allProducts = data?.products || [];
  const shops = data?.userAccessibleShops || [];

  // LOCAL FILTERING AND SORTING
  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = [...allProducts];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.productCode && product.productCode.toLowerCase().includes(searchLower)) ||
        (product.generic && product.generic.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.subProducts || []).some(sp =>
          (sp.name && sp.name.toLowerCase().includes(searchLower)) ||
          (sp.subProductCode && sp.subProductCode.toLowerCase().includes(searchLower))
        )
      );
    }

    // Apply stock range filter
    if (filters.minStock !== undefined) {
      filteredProducts = filteredProducts.filter(product =>
        (product.stockSummary?.totalStock || 0) >= filters.minStock!
      );
    }

    if (filters.maxStock !== undefined) {
      filteredProducts = filteredProducts.filter(product =>
        (product.stockSummary?.totalStock || 0) <= filters.maxStock!
      );
    }

    // Apply shop filter
    if (filters.shopId) {
      filteredProducts = filteredProducts.filter(product => {
        const shopStock = getShopStockFromBranchStocks(product, filters.shopId, shops);
        return shopStock > 0;
      });
    }

    // Apply status filter
    if (filters.isActive === 'active') {
      filteredProducts = filteredProducts.filter(product => product.isActive);
    } else if (filters.isActive === 'inactive') {
      filteredProducts = filteredProducts.filter(product => !product.isActive);
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOption.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'productCode':
          aValue = a.productCode || '';
          bValue = b.productCode || '';
          break;
        case 'totalStock':
          aValue = a.stockSummary?.totalStock || 0;
          bValue = b.stockSummary?.totalStock || 0;
          break;
        case 'price':
          aValue = toNumber(a.sellPrice);
          bValue = toNumber(b.sellPrice);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOption.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filteredProducts;
  }, [allProducts, filters, sortOption, shops]);

  const totalCount = filteredAndSortedProducts.length;
  const loading = selectProductsLoading(isLoading, isFetching);
  const errorMessage = selectProductsError(error);

  // Check if any filters are active
  const hasActiveFilters =
    filters.searchTerm !== '' ||
    filters.minStock !== undefined ||
    filters.maxStock !== undefined ||
    filters.shopId !== '' ||
    filters.isActive !== '';

  // Load products data on mount
  useEffect(() => {
    console.log('🔄 Initial products data load...');
  }, []);

  // Refresh products data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (errorMessage) {
      Alert.alert('Error', errorMessage);
    }
  }, [errorMessage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApplyFilters = (newFilters: any) => {
    setFilters({
      searchTerm: newFilters.searchTerm || '',
      minStock: newFilters.minStock,
      maxStock: newFilters.maxStock,
      shopId: newFilters.shopId || '',
      isActive: newFilters.isActive || '',
    });

    // Update local search query state
    if (newFilters.searchTerm !== undefined) {
      setSearchQuery(newFilters.searchTerm || '');
    }

    // Update local shop state
    if (newFilters.shopId !== undefined) {
      setSelectedShop(newFilters.shopId || '');
    }
  };

  const handleApplySort = (newSort: any) => {
    setSortOption({
      field: newSort.field || 'name',
      direction: newSort.direction || 'asc',
    });
  };

  const handleResetAllFilters = () => {
    setFilters({
      searchTerm: '',
      minStock: undefined,
      maxStock: undefined,
      shopId: '',
      isActive: '',
    });
    setSearchQuery('');
    setSelectedShop('');
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleToggleActive = (productId: string) => {
    toggleProductMutation.mutate(productId);
  };

  // Update search filter when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        searchTerm: searchQuery,
      }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Update shop filter when selected shop changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      shopId: selectedShop,
    }));
  }, [selectedShop]);

  if (loading && !refreshing && allProducts.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Loading products...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$orange1">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack space="$4" padding="$4">
          {/* Header with Stats */}
          <Card
            bordered
            borderRadius="$5"
            backgroundColor="$orange1"
            borderColor="$orange4"
            borderWidth={1}
          >
            <Card.Header padded>
              <YStack space="$3" alignItems="center">
                <YStack alignItems="center" space="$1">
                  <H3 fontWeight="800" color="$orange12">
                    Products Inventory
                  </H3>
                  <YStack width={40} height={3} borderRadius={2} backgroundColor="$orange9" />
                </YStack>

                {filteredAndSortedProducts.length === 0 ? (
                  <YStack alignItems="center" space="$3" paddingVertical="$4">
                    <Text fontSize="$6" color="$orange9">📦</Text>
                    <Text fontSize="$5" fontWeight="600" color="$orange11" textAlign="center">
                      {allProducts.length === 0 ? 'No products available' : 'No products match your filters'}
                    </Text>
                    <Text fontSize="$3" color="$orange9" textAlign="center">
                      {hasActiveFilters ? (
                        <Button
                          onPress={handleResetAllFilters}
                          backgroundColor="transparent"
                          padding={0}
                          margin={0}
                        >
                          <Text
                            color="$orange11"
                            fontWeight="600"
                            textDecorationLine="underline"
                          >
                            Try adjusting your filters
                          </Text>
                        </Button>
                      ) : (
                        allProducts.length === 0 ? 'Add products to get started' : 'Your products will appear here'
                      )}
                    </Text>
                  </YStack>
                ) : (
                  <YStack space="$3" width="100%">
                    <XStack justifyContent="space-between" width="100%">
                      <Text fontSize="$4" fontWeight="600" color="$orange11">
                        Showing:
                      </Text>
                      <Text fontSize="$4" fontWeight="700" color="$orange12">
                        {totalCount} of {allProducts.length} products
                      </Text>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            </Card.Header>
          </Card>

          {/* Filters & Search */}
          {allProducts.length > 0 && (
            <Card
              bordered
              borderRadius="$5"
              backgroundColor="$orange1"
              borderColor="$orange4"
              borderWidth={1}
            >
              <Card.Header padded>
                <YStack space="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$5" fontWeight="700" color="$orange12">
                      Filters & Search
                    </Text>
                    {hasActiveFilters && (
                      <Button
                        size="$2"
                        backgroundColor="$red3"
                        borderColor="$red6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={handleResetAllFilters}
                      >
                        <Text color="$red11" fontWeight="600" fontSize="$2">
                          🔄 Reset All
                        </Text>
                      </Button>
                    )}
                  </XStack>

                  {/* Search */}
                  <Fieldset>
                    <Label htmlFor="search" fontSize="$3" fontWeight="600" color="$orange11">
                      Search Products
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search by name, code, generic, sub-product..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                      borderRadius="$4"
                      focusStyle={{ borderColor: '$orange9' }}
                    />
                  </Fieldset>

                  {/* Filter Actions */}
                  <XStack space="$2">
                    <Button
                      flex={1}
                      backgroundColor="$orange1"
                      borderColor="$orange9"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowFilterModal(true)}
                    >
                      <Text color="$orange9" fontWeight="700">🔍 Filters</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange1"
                      borderColor="$orange9"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowSortModal(true)}
                    >
                      <Text color="$orange9" fontWeight="700">📊 Sort</Text>
                    </Button>
                  </XStack>

                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <Card backgroundColor="$orange2" padding="$2" borderRadius="$2">
                      <YStack space="$1">
                        <Text fontSize="$2" fontWeight="600" color="$orange11">
                          Active Filters:
                        </Text>
                        <XStack flexWrap="wrap" space="$1">
                          {filters.searchTerm && (
                            <Badge backgroundColor="$orange8">
                              Search: {filters.searchTerm}
                            </Badge>
                          )}
                          {filters.shopId && (
                            <Badge backgroundColor="$green8">
                              Shop: {getShopNameById(filters.shopId, shops)}
                            </Badge>
                          )}
                          {filters.minStock !== undefined && (
                            <Badge backgroundColor="$orange8">
                              Min Stock: {filters.minStock}
                            </Badge>
                          )}
                          {filters.maxStock !== undefined && (
                            <Badge backgroundColor="$orange8">
                              Max Stock: {filters.maxStock}
                            </Badge>
                          )}
                          {filters.isActive && (
                            <Badge backgroundColor={filters.isActive === 'active' ? '$green8' : '$red8'}>
                              Status: {filters.isActive === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </XStack>
                      </YStack>
                    </Card>
                  )}

                  {/* Sort Info */}
                  <Card backgroundColor="$orange2" padding="$2" borderRadius="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$2" color="$orange11">
                        Sorted by:
                      </Text>
                      <Text fontSize="$2" fontWeight="600" color="$orange12">
                        {sortOption.field} ({sortOption.direction})
                      </Text>
                    </XStack>
                  </Card>
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Products Grid */}
          <YStack space="$3">
            {filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={handleViewDetails}
                selectedShopId={selectedShop}
                shops={shops}
              />
            ))}
          </YStack>
        </YStack>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
        shops={shops}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        onApplySort={handleApplySort}
        currentSort={sortOption}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={
          selectedProduct
            ? allProducts.find(p => p.id === selectedProduct.id) || selectedProduct
            : null
        }
        visible={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduct(null);
        }}
        shops={shops}
        onToggleActive={handleToggleActive}
      />
    </YStack>
  );
}