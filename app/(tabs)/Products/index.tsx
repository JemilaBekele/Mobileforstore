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
} from '@/(services)/api/product';

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
          color={value ? "$orange12" : "$orange8"} 
          fontWeight="600" 
          fontSize="$3"
          numberOfLines={1}
          flex={1}
          textAlign="left"
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Text color="$orange8" fontSize="$2">▼</Text>
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
                        backgroundColor={value === option.value ? "$orange5" : "$orange1"}
                        borderColor="$orange4"
                        borderWidth={1}
                        borderRadius="$3"
                      >
                        <Text 
                          color={value === option.value ? "$orange12" : "$orange11"} 
                          fontWeight="600"
                        >
                          {option.label}
                        </Text>
                      </Button>
                    ))}
                  </YStack>
                </ScrollView>
                <Button
                  backgroundColor="$orange3"
                  borderColor="$orange6"
                  borderWidth={1}
                  borderRadius="$4"
                  onPress={() => setShowOptions(false)}
                >
                  <Text color="$orange11" fontWeight="600">Cancel</Text>
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
const StockBadge = ({ stock, lowStockThreshold = 10 }: { stock: number; lowStockThreshold?: number }) => {
  if (stock === 0) {
    return (
      <Badge backgroundColor="$red9">
        <Text color="white" fontSize="$1" fontWeight="700">Out of Stock</Text>
      </Badge>
    );
  } else if (stock <= lowStockThreshold) {
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

// Price Display Component
const PriceDisplay = ({ price, additionalPrices, shopId }: { 
  price: string | null; 
  additionalPrices?: AdditionalPrice[];
  shopId?: string;
}) => {
  const basePrice = price ? parseFloat(price) : 0;
  let finalPrice = basePrice;

  if (shopId && additionalPrices) {
    const shopAdditionalPrice = additionalPrices.find(ap => ap.shopId === shopId);
    if (shopAdditionalPrice) {
      finalPrice = basePrice + shopAdditionalPrice.price;
    }
  }

  return (
    <YStack alignItems="flex-end">
      <Text fontSize="$5" fontWeight="800" color="$green10">
        ${finalPrice.toFixed(2)}
      </Text>
      {shopId && additionalPrices && additionalPrices.some(ap => ap.shopId === shopId) && (
        <Text fontSize="$1" color="$orange10">
          Includes shop pricing
        </Text>
      )}
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

// Helper function to get shop stock from branchStocks structure
const getShopStockFromBranchStocks = (product: Product, shopId?: string): number => {
  if (!shopId || !product.stockSummary?.branchStocks) return 0;
  
  let totalShopStock = 0;
  // Find shop stock in all branches
  for (const branchStock of Object.values(product.stockSummary.branchStocks)) {
    // Check if shops object exists and has the shopId
    if (branchStock.shops && branchStock.shops[shopId]) {
      totalShopStock += branchStock.shops[shopId];
    }
  }
  return totalShopStock;
};

// Product Card Component
const ProductCard = ({ 
  product, 
  onPress,
  selectedShopId,
}: { 
  product: Product;
  onPress: (product: Product) => void;
  selectedShopId?: string;
}) => {
  const totalStock = product.stockSummary?.totalStock || 0;
  
  // Calculate shop stock from branchStocks structure
  const shopStock = React.useMemo(() => {
    return getShopStockFromBranchStocks(product, selectedShopId);
  }, [product, selectedShopId]);
  
  // Get normalized image URL
  const productImageUrl = normalizeImagePath(product.imageUrl);

  return (
    <Card 
      elevate 
      bordered 
      borderRadius="$4" 
      backgroundColor="$orange1"
      borderColor="$orange4"
      shadowColor="$orange7"
      onPress={() => onPress(product)}
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
                borderRadius="$3" 
                overflow="hidden"
                backgroundColor="$orange2"
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
                borderRadius="$3" 
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
                  <Text fontSize="$2" color="$orange10">
                    Code: {product.productCode}
                  </Text>
                  {product.generic && (
                    <Text fontSize="$2" color="$orange10" numberOfLines={1}>
                      Generic: {product.generic}
                    </Text>
                  )}
                </YStack>
                <YStack alignItems="flex-end" space="$1">
                  <StockBadge stock={totalStock} />
                  {!product.isActive && (
                    <Badge backgroundColor="$red9">
                      <Text color="white" fontSize="$1" fontWeight="600">Inactive</Text>
                    </Badge>
                  )}
                  <BatchExpiryIndicator batches={product.stockSummary?.batchStockDetails} />
                </YStack>
              </XStack>

              {/* Category Info */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$2" color="$orange9">
                  {product.category.name}
                  {product.subCategory && ` › ${product.subCategory.name}`}
                </Text>
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
                {totalStock} units
              </Text>
            </XStack>
            
            {selectedShopId && (
              <XStack justifyContent="space-between">
                <Text fontSize="$2" color="$orange10">
                  This Shop:
                </Text>
                <Text fontSize="$2" fontWeight="600" color="$orange11">
                  {shopStock} units
                </Text>
              </XStack>
            )}

            {/* Stock Progress Bar */}
            <YStack space="$1">
              <XStack justifyContent="space-between">
                <Text fontSize="$1" color="$orange9">Stock Level</Text>
                <Text fontSize="$1" color="$orange9">{totalStock} units</Text>
              </XStack>
              <Progress value={Math.min((totalStock / 100) * 100, 100)} size="$1">
                <Progress.Indicator 
                  backgroundColor={
                    totalStock === 0 ? '$red9' : 
                    totalStock <= 10 ? '$orange9' : '$green9'
                  } 
                />
              </Progress>
            </YStack>
          </YStack>

          {/* Price and Actions */}
          <XStack justifyContent="space-between" alignItems="center">
            <PriceDisplay 
              price={product.sellPrice} 
              additionalPrices={product.AdditionalPrice}
              shopId={selectedShopId}
            />
            <Button
              size="$2"
              backgroundColor="$orange3"
              borderColor="$orange6"
              borderWidth={1}
              borderRadius="$3"
              onPress={() => onPress(product)}
            >
              <Text color="$orange11" fontWeight="600" fontSize="$2">
                👁️ Details
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
                      backgroundColor="white"
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
                        backgroundColor="white"
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
                        backgroundColor="white"
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
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      borderWidth={1}
                      borderRadius="$4"
                      onPress={handleClear}
                    >
                      <Text color="$orange11" fontWeight="600">Clear All</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange9"
                      borderColor="$orange10"
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
                backgroundColor="$orange3"
                borderColor="$orange6"
                borderWidth={1}
                borderRadius="$4"
                onPress={onClose}
              >
                <Text color="$orange11" fontWeight="600">Cancel</Text>
              </Button>
              <Button
                flex={1}
                backgroundColor="$orange9"
                borderColor="$orange10"
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

// Product Detail Modal
const ProductDetailModal = ({
  product,
  visible,
  onClose,
  shops,
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
  const batchDetails = product.stockSummary?.batchStockDetails || [];
  const shopStocks = product.stockSummary?.shopStocks || {};
  const storeStocks = product.stockSummary?.storeStocks || {};

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
          borderTopLeftRadius="$4" 
          borderTopRightRadius="$4" 
          padding="$4"
          maxHeight="80%"
          borderWidth={1}
          borderColor="$orange4"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack space="$4">
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <H4 color="$orange12" numberOfLines={2} flex={1}>
                  {product.name}
                </H4>
                <Button
                  size="$2"
                  circular
                  backgroundColor="$orange3"
                  onPress={onClose}
                >
                  <Text color="$orange11">✕</Text>
                </Button>
              </XStack>

              {/* Basic Info */}
              <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                <YStack space="$3">
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Product Code:</Text>
                    <Text color="$orange12">{product.productCode}</Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Category:</Text>
                    <Text color="$orange12">
                      {product.category.name}
                      {product.subCategory && ` › ${product.subCategory.name}`}
                    </Text>
                  </XStack>
                  {product.generic && (
                    <XStack justifyContent="space-between">
                      <Text fontWeight="600" color="$orange11">Generic:</Text>
                      <Text color="$orange12">{product.generic}</Text>
                    </XStack>
                  )}
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
                    <Text color="$green10" fontWeight="700">
                      ${product.sellPrice ? parseFloat(product.sellPrice).toFixed(2) : '0.00'}
                    </Text>
                  </XStack>
                </YStack>
              </Card>

              {/* Stock Summary */}
              <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                <YStack space="$3">
                  <Text fontWeight="700" color="$orange12" fontSize="$5">
                    Stock Summary
                  </Text>
                  
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="600" color="$orange11">Total Stock:</Text>
                    <StockBadge stock={totalStock} />
                  </XStack>

                  {/* Shop Stocks */}
                  {Object.keys(shopStocks).length > 0 && (
                    <YStack space="$2">
                      <Text fontWeight="600" color="$orange11">Shop Stocks:</Text>
                      {Object.entries(shopStocks).map(([shopName, stock]) => {
                        // Find shop by name
                        const shop = shops.find(s => s.name === shopName);
                        return (
                          <XStack key={shopName} justifyContent="space-between">
                            <Text color="$orange10" fontSize="$1">
                              {shop?.name || shopName}:
                            </Text>
                            <Text color="$orange12" fontSize="$1" fontWeight="600">
                              {stock} units
                            </Text>
                          </XStack>
                        );
                      })}
                    </YStack>
                  )}

                  {/* Store Stocks */}
                  {Object.keys(storeStocks).length > 0 && (
                    <YStack space="$2">
                      <Text fontWeight="600" color="$orange11">Store Stocks:</Text>
                      {Object.entries(storeStocks).map(([storeName, stock]) => (
                        <XStack key={storeName} justifyContent="space-between">
                          <Text color="$orange10" fontSize="$1">
                            {storeName}:
                          </Text>
                          <Text color="$orange12" fontSize="$1" fontWeight="600">
                            {stock} units
                          </Text>
                        </XStack>
                      ))}
                    </YStack>
                  )}

                  {/* Stock Totals */}
                  <XStack justifyContent="space-between" paddingTop="$2" borderTopWidth={1} borderTopColor="$orange4">
                    <YStack space="$1">
                      <XStack justifyContent="space-between">
                        <Text color="$orange10" fontSize="$1">Total Shop Stock:</Text>
                        <Text color="$orange12" fontSize="$1" fontWeight="600">
                          {product.stockSummary?.totalShopStock || 0} units
                        </Text>
                      </XStack>
                      <XStack justifyContent="space-between">
                        <Text color="$orange10" fontSize="$1">Total Store Stock:</Text>
                        <Text color="$orange12" fontSize="$1" fontWeight="600">
                          {product.stockSummary?.totalStoreStock || 0} units
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                </YStack>
              </Card>

              {/* Batch Details */}
              {batchDetails.length > 0 && (
                <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                  <YStack space="$3">
                    <Text fontWeight="700" color="$orange12" fontSize="$5">
                      Batch Details ({batchDetails.length})
                    </Text>
                    {batchDetails.map((batch, index) => (
                      <Card key={batch.batchId} backgroundColor="$orange3" padding="$3" borderRadius="$3">
                        <YStack space="$2">
                          <XStack justifyContent="space-between">
                            <Text fontWeight="600" color="$orange12">
                              Batch #{batch.batchNumber || batch.batchId?.slice(-6) || 'N/A'}
                            </Text>
                            <Text color="$orange10">
                              {batch.totalStock} units
                            </Text>
                          </XStack>
                          {batch.expiryDate && (
                            <XStack justifyContent="space-between">
                              <Text color="$orange10" fontSize="$1">Expiry:</Text>
                              <Text color="$orange12" fontSize="$1" fontWeight="600">
                                {new Date(batch.expiryDate).toLocaleDateString()}
                              </Text>
                            </XStack>
                          )}
                        </YStack>
                      </Card>
                    ))}
                  </YStack>
                </Card>
              )}

              {product.description && (
                <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                  <YStack space="$2">
                    <Text fontWeight="600" color="$orange11">Description:</Text>
                    <Text color="$orange12">{product.description}</Text>
                  </YStack>
                </Card>
              )}
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
        (product.description && product.description.toLowerCase().includes(searchLower))
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
        const shopStock = getShopStockFromBranchStocks(product, filters.shopId);
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
          aValue = parseFloat(a.sellPrice || '0');
          bValue = parseFloat(b.sellPrice || '0');
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
  }, [allProducts, filters, sortOption]);
  
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
            elevate 
            bordered 
            borderRadius="$4" 
            backgroundColor="$orange1"
            borderColor="$orange4"
            shadowColor="$orange7"
          >
            <Card.Header padded>
              <YStack space="$3" alignItems="center">
                <H3 fontWeight="bold" color="$orange12">
                  📦 Products Inventory
                </H3>
                
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
              elevate 
              bordered 
              borderRadius="$4" 
              backgroundColor="$orange1"
              borderColor="$orange4"
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
                      placeholder="Search by name, code, generic, or description..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                    />
                  </Fieldset>

                  {/* Filter Actions */}
                  <XStack space="$2">
                    <Button
                      flex={1}
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowFilterModal(true)}
                    >
                      <Text color="$orange11" fontWeight="600">🔍 Filters</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowSortModal(true)}
                    >
                      <Text color="$orange11" fontWeight="600">📊 Sort</Text>
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
        product={selectedProduct}
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