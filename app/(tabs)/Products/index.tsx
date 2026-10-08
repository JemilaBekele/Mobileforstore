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
  Text,
  XStack,
  YStack,
  Button,
  ScrollView,
  Spinner,
  Input,
  Fieldset,
  Label,
  Switch,
  Progress,
} from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
import AppImage from '@/components/AppImage';

// Presentation palette for this screen (white, black text, orange accent)
const C = {
  accent: '#FF6B00',
  accentTint: '#FFF7ED',
  text: '#111827',
  label: '#374151',
  muted: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#E5E7EB',
  subtle: '#F9FAFB',
  danger: '#DC2626',
};

const softShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
} as const;

const inputStyle = {
  backgroundColor: 'white',
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 10,
  color: C.text,
  placeholderTextColor: C.placeholder,
  focusStyle: { borderColor: C.accent },
} as const;

// Small tinted pill
type PillTone = 'neutral' | 'accent' | 'green' | 'amber' | 'red';
const PILL_TONES: Record<PillTone, { bg: string; fg: string }> = {
  neutral: { bg: '#F3F4F6', fg: '#374151' },
  accent: { bg: '#FFF7ED', fg: '#C2410C' },
  green: { bg: '#DCFCE7', fg: '#166534' },
  amber: { bg: '#FEF3C7', fg: '#92400E' },
  red: { bg: '#FEE2E2', fg: '#991B1B' },
};

const Pill = ({
  children,
  tone = 'neutral',
  icon,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) => {
  const { bg, fg } = PILL_TONES[tone];
  return (
    <XStack
      backgroundColor={bg}
      paddingHorizontal={8}
      paddingVertical={2}
      borderRadius={999}
      alignItems="center"
      gap={4}
    >
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text fontSize={12} fontWeight="600" color={fg}>
        {children}
      </Text>
    </XStack>
  );
};

const LabelText = ({ children }: { children: React.ReactNode }) => (
  <Label fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
    {children}
  </Label>
);

const PrimaryButton = ({
  children,
  onPress,
  flex,
}: {
  children: React.ReactNode;
  onPress: () => void;
  flex?: number;
}) => (
  <Button
    flex={flex}
    backgroundColor={C.accent}
    borderWidth={0}
    borderRadius={10}
    onPress={onPress}
    pressStyle={{ backgroundColor: '$orange10' }}
  >
    <Text color="white" fontWeight="700">{children}</Text>
  </Button>
);

const SecondaryButton = ({
  children,
  onPress,
  flex,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  flex?: number;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) => (
  <Button
    flex={flex}
    backgroundColor="white"
    borderColor={C.border}
    borderWidth={1}
    borderRadius={10}
    onPress={onPress}
    pressStyle={{ backgroundColor: C.subtle, borderColor: C.border }}
    icon={icon ? <Ionicons name={icon} size={16} color={C.accent} /> : undefined}
  >
    <Text color={C.text} fontWeight="600">{children}</Text>
  </Button>
);

const ModalTitle = ({ title, onClose }: { title: string; onClose?: () => void }) => (
  <XStack alignItems="center" justifyContent="space-between">
    <Text color={C.text} fontSize={18} fontWeight="700" flex={1}>
      {title}
    </Text>
    {onClose ? (
      <Button
        size="$2"
        circular
        chromeless
        borderWidth={0}
        onPress={onClose}
        icon={<Ionicons name="close" size={20} color={C.muted} />}
      />
    ) : null}
  </XStack>
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
      <XStack
        onPress={() => setShowOptions(true)}
        backgroundColor="white"
        borderColor={C.border}
        borderWidth={1}
        borderRadius={10}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        height={44}
        pressStyle={{ backgroundColor: C.subtle }}
        cursor="pointer"
      >
        <Text
          color={selectedOption ? C.text : C.placeholder}
          fontWeight="500"
          fontSize={14}
          numberOfLines={1}
          flex={1}
          textAlign="left"
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={C.muted} />
      </XStack>

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
            backgroundColor="rgba(0,0,0,0.4)"
            padding="$4"
          >
            <YStack
              backgroundColor="white"
              borderRadius={16}
              padding={16}
              width="100%"
              maxWidth={400}
              borderWidth={1}
              borderColor={C.border}
            >
              <YStack gap={12}>
                <ModalTitle title={placeholder} onClose={() => setShowOptions(false)} />
                <ScrollView maxHeight={300}>
                  <YStack gap={8}>
                    {options.map((option) => {
                      const selected = value === option.value;
                      return (
                        <XStack
                          key={option.value}
                          onPress={() => {
                            onValueChange(option.value);
                            setShowOptions(false);
                          }}
                          backgroundColor={selected ? C.accentTint : 'white'}
                          borderColor={selected ? C.accent : C.border}
                          borderWidth={1}
                          borderRadius={12}
                          paddingHorizontal={12}
                          paddingVertical={12}
                          alignItems="center"
                          gap={12}
                          pressStyle={{ opacity: 0.8 }}
                          cursor="pointer"
                        >
                          <Text
                            flex={1}
                            fontSize={15}
                            fontWeight="600"
                            color={selected ? C.accent : C.text}
                          >
                            {option.label}
                          </Text>
                          {selected ? (
                            <Ionicons name="checkmark" size={18} color={C.accent} />
                          ) : null}
                        </XStack>
                      );
                    })}
                  </YStack>
                </ScrollView>
                <SecondaryButton onPress={() => setShowOptions(false)}>Cancel</SecondaryButton>
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
    return <Pill tone="red">Out of Stock</Pill>;
  } else if (warningQuantity > 0 && stock <= warningQuantity) {
    return <Pill tone="amber">Low Stock</Pill>;
  } else {
    return <Pill tone="green">In Stock</Pill>;
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
    <XStack flexWrap="wrap" gap={6} justifyContent={align}>
      {prices.map(ap => (
        <YStack
          key={ap.id}
          backgroundColor="white"
          borderColor={C.border}
          borderWidth={1}
          borderRadius={999}
          paddingHorizontal={8}
          paddingVertical={2}
        >
          <Text fontSize={12} color={C.muted}>
            {ap.label || 'Alt. price'} · <Text fontSize={12} fontWeight="700" color={C.text}>{formatMoney(ap.price)}</Text>
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
    <YStack alignItems="flex-start" gap={4} flex={1}>
      <Text fontSize={18} fontWeight="800" color={C.accent}>
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
    <Pill tone="amber" icon="time-outline">
      {`${expiringBatches.length} batch${expiringBatches.length > 1 ? 'es' : ''} expiring`}
    </Pill>
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

  return (
    <YStack
      backgroundColor="white"
      borderWidth={1}
      borderColor={C.border}
      borderRadius={14}
      padding={14}
      gap={12}
      {...softShadow}
      onPress={() => onPress(product)}
      pressStyle={{ backgroundColor: '#FAFAFA' }}
      cursor="pointer"
    >
      {/* Product Image and Header */}
      <XStack gap={12}>
        {/* Product Image */}
        <AppImage path={product.imageUrl} size={72} radius={12} bordered zoomable title={product.name} />

        {/* Product Info */}
        <YStack flex={1} gap={4}>
          <XStack justifyContent="space-between" alignItems="flex-start" gap={8}>
            <Text flex={1} fontSize={15} fontWeight="700" color={C.text} numberOfLines={2}>
              {product.name}
            </Text>
            <YStack alignItems="flex-end" gap={4}>
              <StockBadge stock={totalStock} warningQuantity={warningQuantity} />
              {!product.isActive ? <Pill tone="red">Inactive</Pill> : null}
              <BatchExpiryIndicator batches={product.stockSummary?.batchStockDetails} />
            </YStack>
          </XStack>
          <Text fontSize={12} color={C.muted}>
            Code: {product.productCode}
          </Text>
          {product.generic ? (
            <Text fontSize={12} color={C.muted} numberOfLines={1}>
              Generic: {product.generic}
            </Text>
          ) : null}

          {/* Category Info */}
          <XStack alignItems="center" flexWrap="wrap" gap={6}>
            <XStack alignItems="center" gap={4} flexShrink={1}>
              <Ionicons name="pricetag-outline" size={12} color={C.muted} />
              <Text fontSize={12} color={C.label} numberOfLines={1} flexShrink={1}>
                {product.category.name}
                {product.subCategory ? ` › ${product.subCategory.name}` : ''}
              </Text>
            </XStack>
            {subProductCount > 0 ? (
              <Pill tone="neutral">
                {`${subProductCount} sub-product${subProductCount > 1 ? 's' : ''}`}
              </Pill>
            ) : null}
          </XStack>
        </YStack>
      </XStack>

      {/* Stock Information */}
      <YStack gap={6}>
        <XStack justifyContent="space-between">
          <Text fontSize={14} color={C.label}>
            Total Stock
          </Text>
          <Text fontSize={14} fontWeight="700" color={C.text}>
            {formatQty(totalStock)} units
          </Text>
        </XStack>

        {selectedShopId ? (
          <XStack justifyContent="space-between">
            <Text fontSize={13} color={C.label}>
              This Shop
            </Text>
            <Text fontSize={13} fontWeight="600" color={C.text}>
              {formatQty(shopStock)} units
            </Text>
          </XStack>
        ) : null}

        {/* Stock Progress Bar */}
        <YStack gap={4}>
          <XStack justifyContent="space-between">
            <Text fontSize={12} color={C.muted}>Stock Level</Text>
            <Text fontSize={12} color={C.muted}>
              {warningQuantity > 0 ? `Alert at ${formatQty(warningQuantity)}` : `${formatQty(totalStock)} units`}
            </Text>
          </XStack>
          <Progress
            value={Math.min((totalStock / Math.max(warningQuantity * 3, 100)) * 100, 100)}
            size="$1"
            backgroundColor="#F3F4F6"
          >
            <Progress.Indicator
              backgroundColor={
                totalStock <= 0 ? '#DC2626' :
                isLowStock(totalStock, warningQuantity) ? '#F59E0B' : '#16A34A'
              }
            />
          </Progress>
        </YStack>
      </YStack>

      {/* Price and Actions */}
      <XStack justifyContent="space-between" alignItems="center" gap={8} paddingTop={12} borderTopWidth={1} borderTopColor={C.border}>
        <PriceDisplay
          price={product.sellPrice}
          additionalPrices={product.AdditionalPrice}
          shopId={selectedShopId}
        />
        <Button
          size="$3"
          backgroundColor="white"
          borderColor={C.border}
          borderWidth={1}
          borderRadius={10}
          onPress={() => onPress(product)}
          pressStyle={{ backgroundColor: C.subtle, borderColor: C.border }}
          iconAfter={<Ionicons name="chevron-forward" size={16} color={C.muted} />}
        >
          <Text color={C.text} fontWeight="600" fontSize={13}>
            Details
          </Text>
        </Button>
      </XStack>
    </YStack>
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
          backgroundColor="rgba(0,0,0,0.4)"
          padding="$4"
        >
          <TouchableWithoutFeedback>
            <YStack
              backgroundColor="white"
              borderRadius={16}
              padding={16}
              width="100%"
              maxWidth={400}
              borderWidth={1}
              borderColor={C.border}
              maxHeight="90%"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={16}>
                  <ModalTitle title="Filter Products" onClose={onClose} />

                  {/* Search */}
                  <Fieldset gap={6}>
                    <LabelText>Search</LabelText>
                    <Input
                      id="search"
                      value={localFilters.searchTerm || ''}
                      onChangeText={(text) => updateLocalFilter('searchTerm', text)}
                      placeholder="Search products..."
                      {...inputStyle}
                    />
                  </Fieldset>

                  {/* Stock Range */}
                  <YStack gap={12}>
                    <Text fontSize={13} fontWeight="600" color={C.label}>
                      Stock Range
                    </Text>

                    <XStack gap={12}>
                      <Fieldset gap={6} flex={1}>
                        <Label htmlFor="minStock" fontSize={13} fontWeight="500" color={C.muted} lineHeight={18}>
                          Minimum
                        </Label>
                        <Input
                          id="minStock"
                          value={localFilters.minStock?.toString() || ''}
                          onChangeText={(text) => updateLocalFilter('minStock', text ? parseInt(text) : undefined)}
                          placeholder="0"
                          keyboardType="numeric"
                          {...inputStyle}
                        />
                      </Fieldset>

                      <Fieldset gap={6} flex={1}>
                        <Label htmlFor="maxStock" fontSize={13} fontWeight="500" color={C.muted} lineHeight={18}>
                          Maximum
                        </Label>
                        <Input
                          id="maxStock"
                          value={localFilters.maxStock?.toString() || ''}
                          onChangeText={(text) => updateLocalFilter('maxStock', text ? parseInt(text) : undefined)}
                          placeholder="100"
                          keyboardType="numeric"
                          {...inputStyle}
                        />
                      </Fieldset>
                    </XStack>
                  </YStack>

                  {/* Shop Filter */}
                  {shops.length > 0 ? (
                    <Fieldset gap={6}>
                      <LabelText>Filter by Shop Stock</LabelText>
                      <CustomSelect
                        value={localFilters.shopId || ''}
                        onValueChange={(value) => updateLocalFilter('shopId', value)}
                        options={shopOptions}
                        placeholder="All shops"
                      />
                    </Fieldset>
                  ) : null}

                  {/* Status Filter */}
                  <Fieldset gap={6}>
                    <LabelText>Status</LabelText>
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
                    localFilters.isActive) ? (
                    <YStack gap={6} borderWidth={1} borderColor={C.border} borderRadius={12} padding={12}>
                      <Text fontSize={12} fontWeight="600" color={C.muted}>
                        Active filters
                      </Text>
                      <XStack flexWrap="wrap" gap={6}>
                        {localFilters.searchTerm ? (
                          <Pill tone="accent">{`Search: ${localFilters.searchTerm}`}</Pill>
                        ) : null}
                        {localFilters.minStock !== undefined ? (
                          <Pill tone="accent">{`Min stock: ${localFilters.minStock}`}</Pill>
                        ) : null}
                        {localFilters.maxStock !== undefined ? (
                          <Pill tone="accent">{`Max stock: ${localFilters.maxStock}`}</Pill>
                        ) : null}
                        {localFilters.shopId ? (
                          <Pill tone="accent">
                            {`Shop: ${shops.find(s => s.id === localFilters.shopId)?.name || ''}`}
                          </Pill>
                        ) : null}
                        {localFilters.isActive ? (
                          <Pill tone="accent">
                            {`Status: ${localFilters.isActive === 'active' ? 'Active' : 'Inactive'}`}
                          </Pill>
                        ) : null}
                      </XStack>
                    </YStack>
                  ) : null}

                  <XStack gap={12}>
                    <SecondaryButton flex={1} onPress={handleClear}>Clear All</SecondaryButton>
                    <PrimaryButton flex={1} onPress={handleApply}>Apply Filters</PrimaryButton>
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
        backgroundColor="rgba(0,0,0,0.4)"
        padding="$4"
      >
        <YStack
          backgroundColor="white"
          borderRadius={16}
          padding={16}
          width="100%"
          maxWidth={400}
          borderWidth={1}
          borderColor={C.border}
        >
          <YStack gap={16}>
            <ModalTitle title="Sort Products" onClose={onClose} />

            {/* Sort Field */}
            <Fieldset gap={6}>
              <LabelText>Sort By</LabelText>
              <CustomSelect
                value={localSort.field}
                onValueChange={(value) => setLocalSort((prev: any) => ({ ...prev, field: value }))}
                options={sortFields}
                placeholder="Select field"
              />
            </Fieldset>

            {/* Sort Direction */}
            <Fieldset gap={6}>
              <LabelText>Direction</LabelText>
              <CustomSelect
                value={localSort.direction}
                onValueChange={(value) => setLocalSort((prev: any) => ({ ...prev, direction: value }))}
                options={directionOptions}
                placeholder="Select direction"
              />
            </Fieldset>

            <XStack gap={12}>
              <SecondaryButton flex={1} onPress={onClose}>Cancel</SecondaryButton>
              <PrimaryButton flex={1} onPress={handleApply}>Apply Sort</PrimaryButton>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  );
};

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <XStack justifyContent="space-between" alignItems="center" gap={12}>
    <Text color={C.label} fontSize={14}>{label}</Text>
    {children}
  </XStack>
);

// One row of the Sub-products section in the detail sheet
const SubProductRow = ({ subProduct, product }: { subProduct: ProductSubProduct; product: Product }) => {
  const usesProductPrice = subProduct.sellPrice === null || subProduct.sellPrice === undefined;
  const ownPrices = (product.AdditionalPrice || []).filter(ap => ap.subProductId === subProduct.id);

  return (
    <YStack
      backgroundColor="white"
      borderColor={C.border}
      borderWidth={1}
      borderRadius={12}
      padding={12}
      gap={8}
    >
      <XStack gap={8} alignItems="flex-start">
        {subProduct.imageUrl ? (
          <AppImage path={subProduct.imageUrl} size={44} radius={8} zoomable title={subProduct.name} />
        ) : null}
        <YStack flex={1} gap={2}>
          <Text fontWeight="700" color={C.text} numberOfLines={2}>
            {subProduct.name}
          </Text>
          <Text fontSize={12} color={C.muted}>
            Code: {subProduct.subProductCode}
          </Text>
        </YStack>
        <StockBadge stock={subProduct.totalStock || 0} warningQuantity={product.warningQuantity || 0} />
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={13} color={C.label}>Price</Text>
        <Text fontSize={14} fontWeight="700" color={C.text}>
          {formatMoney(usesProductPrice ? product.sellPrice : subProduct.sellPrice)}
          {usesProductPrice ? <Text fontSize={12} fontWeight="400" color={C.muted}> (product price)</Text> : null}
        </Text>
      </XStack>

      <XStack justifyContent="space-between">
        <Text fontSize={13} color={C.label}>Stock</Text>
        <Text fontSize={13} fontWeight="600" color={C.text}>
          {formatQty(subProduct.totalStock || 0)} units
          <Text fontSize={12} fontWeight="400" color={C.muted}>
            {`  (shop ${formatQty(subProduct.totalShopStock || 0)} · store ${formatQty(subProduct.totalStoreStock || 0)})`}
          </Text>
        </Text>
      </XStack>

      {ownPrices.length > 0 ? (
        <YStack gap={4}>
          <Text fontSize={12} color={C.muted}>Other prices</Text>
          <AdditionalPriceChips prices={ownPrices} />
        </YStack>
      ) : null}
    </YStack>
  );
};

// Section card used inside the detail sheet
const DetailSection = ({ children }: { children: React.ReactNode }) => (
  <YStack backgroundColor="white" borderColor={C.border} borderWidth={1} padding={14} borderRadius={12}>
    {children}
  </YStack>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text fontWeight="700" color={C.text} fontSize={16}>
    {children}
  </Text>
);

const LocationStockList = ({ title, rows }: {
  title: string;
  rows: { key: string; name: string; branch: string; qty: number }[];
}) => {
  if (rows.length === 0) return null;
  return (
    <YStack gap={8}>
      <Text fontWeight="600" fontSize={13} color={C.label}>{title}</Text>
      {rows.map(row => (
        <XStack
          key={row.key}
          justifyContent="space-between"
          alignItems="center"
          backgroundColor={C.subtle}
          borderRadius={8}
          paddingHorizontal={10}
          paddingVertical={8}
        >
          <YStack flex={1}>
            <Text color={C.text} fontSize={14}>{row.name}</Text>
            <Text color={C.muted} fontSize={12}>{row.branch}</Text>
          </YStack>
          <Text color={C.text} fontSize={14} fontWeight="600">
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
        backgroundColor="rgba(0,0,0,0.4)"
        justifyContent="flex-end"
      >
        <YStack
          backgroundColor="white"
          borderTopLeftRadius={20}
          borderTopRightRadius={20}
          padding={16}
          maxHeight="85%"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap={16}>
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center" gap={8}>
                <Text flex={1} color={C.text} fontSize={20} fontWeight="700" numberOfLines={2}>
                  {product.name}
                </Text>
                <Button
                  size="$3"
                  circular
                  backgroundColor="white"
                  borderColor={C.border}
                  borderWidth={1}
                  onPress={onClose}
                  pressStyle={{ backgroundColor: C.subtle, borderColor: C.border }}
                  icon={<Ionicons name="close" size={18} color={C.text} />}
                />
              </XStack>

              {/* Basic Info */}
              <DetailSection>
                <YStack gap={10}>
                  <InfoRow label="Product Code">
                    <Text color={C.text} fontWeight="600">{product.productCode}</Text>
                  </InfoRow>
                  <InfoRow label="Category">
                    <Text color={C.text} flexShrink={1} textAlign="right">
                      {product.category.name}
                      {product.subCategory ? ` › ${product.subCategory.name}` : ''}
                    </Text>
                  </InfoRow>
                  {product.generic ? (
                    <InfoRow label="Generic">
                      <Text color={C.text} flexShrink={1} textAlign="right">{product.generic}</Text>
                    </InfoRow>
                  ) : null}
                  <InfoRow label="Status">
                    <XStack alignItems="center" gap={8}>
                      <Pill tone={product.isActive ? 'green' : 'red'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Pill>
                      <Switch
                        size="$2"
                        checked={product.isActive}
                        onCheckedChange={() => onToggleActive(product.id)}
                        backgroundColor={product.isActive ? C.accent : '#D1D5DB'}
                        borderWidth={0}
                      >
                        <Switch.Thumb backgroundColor="white" />
                      </Switch>
                    </XStack>
                  </InfoRow>
                  <InfoRow label="Sell Price">
                    <Text color={C.accent} fontWeight="800" fontSize={16}>
                      {formatMoney(product.sellPrice)}
                    </Text>
                  </InfoRow>
                  {productPrices.length > 0 ? (
                    <YStack gap={4}>
                      <Text color={C.label} fontSize={14}>Other prices</Text>
                      <AdditionalPriceChips prices={productPrices} />
                    </YStack>
                  ) : null}
                  {warningQuantity > 0 ? (
                    <InfoRow label="Low-stock alert at">
                      <Text color={C.text}>{formatQty(warningQuantity)} units</Text>
                    </InfoRow>
                  ) : null}
                </YStack>
              </DetailSection>

              {/* Stock Summary */}
              <DetailSection>
                <YStack gap={12}>
                  <SectionTitle>Stock Summary</SectionTitle>

                  <XStack justifyContent="space-between" alignItems="center">
                    <Text color={C.label} fontSize={14}>
                      Total Stock: <Text color={C.text} fontWeight="700">{formatQty(totalStock)} units</Text>
                    </Text>
                    <StockBadge stock={totalStock} warningQuantity={warningQuantity} />
                  </XStack>

                  {/* Shop Stocks */}
                  <LocationStockList title="Shop Stocks" rows={shopRows} />

                  {/* Store Stocks */}
                  <LocationStockList title="Store Stocks" rows={storeRows} />

                  {/* Stock Totals */}
                  <YStack gap={6} paddingTop={10} borderTopWidth={1} borderTopColor={C.border}>
                    <XStack justifyContent="space-between">
                      <Text color={C.label} fontSize={13}>Total Shop Stock</Text>
                      <Text color={C.text} fontSize={13} fontWeight="600">
                        {formatQty(product.stockSummary?.totalShopStock || 0)} units
                      </Text>
                    </XStack>
                    <XStack justifyContent="space-between">
                      <Text color={C.label} fontSize={13}>Total Store Stock</Text>
                      <Text color={C.text} fontSize={13} fontWeight="600">
                        {formatQty(product.stockSummary?.totalStoreStock || 0)} units
                      </Text>
                    </XStack>
                  </YStack>
                </YStack>
              </DetailSection>

              {/* Sub-products */}
              {subProducts.length > 0 ? (
                <DetailSection>
                  <YStack gap={10}>
                    <SectionTitle>{`Sub-products (${subProducts.length})`}</SectionTitle>
                    {subProducts.map(subProduct => (
                      <SubProductRow key={subProduct.id} subProduct={subProduct} product={product} />
                    ))}
                  </YStack>
                </DetailSection>
              ) : null}

              {/* Batch Details */}
              {batchDetails.length > 0 ? (
                <DetailSection>
                  <YStack gap={10}>
                    <SectionTitle>{`Batch Details (${batchDetails.length})`}</SectionTitle>
                    {batchDetails.map((batch) => {
                      const batchSubProduct = batch.subProductId
                        ? subProducts.find(sp => sp.id === batch.subProductId)
                        : undefined;
                      return (
                        <YStack
                          key={batch.batchId}
                          backgroundColor={C.subtle}
                          borderWidth={1}
                          borderColor={C.border}
                          padding={10}
                          borderRadius={10}
                          gap={4}
                        >
                          <XStack justifyContent="space-between">
                            <Text fontWeight="600" color={C.text}>
                              Batch #{batch.batchNumber || batch.batchId?.slice(-6) || 'N/A'}
                            </Text>
                            <Text color={C.text} fontWeight="600">
                              {formatQty(batch.totalStock)} units
                            </Text>
                          </XStack>
                          {batchSubProduct ? (
                            <Text color={C.muted} fontSize={12}>{batchSubProduct.name}</Text>
                          ) : null}
                          {batch.expiryDate ? (
                            <XStack alignItems="center" gap={4}>
                              <Ionicons name="calendar-outline" size={12} color={C.muted} />
                              <Text color={C.muted} fontSize={12}>
                                Expiry: {new Date(batch.expiryDate).toLocaleDateString()}
                              </Text>
                            </XStack>
                          ) : null}
                        </YStack>
                      );
                    })}
                  </YStack>
                </DetailSection>
              ) : null}

              {product.description ? (
                <DetailSection>
                  <YStack gap={6}>
                    <Text fontWeight="600" color={C.label}>Description</Text>
                    <Text color={C.text}>{product.description}</Text>
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
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
        <Spinner size="large" color={C.accent} />
        <Text marginTop={16} color={C.muted} fontSize={15}>
          Loading products...
        </Text>
      </YStack>
    );
  }

  const sortFieldLabels: Record<string, string> = {
    name: 'Product name',
    productCode: 'Product code',
    totalStock: 'Total stock',
    price: 'Price',
    createdAt: 'Date created',
  };

  return (
    <YStack flex={1} backgroundColor="white">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[C.accent]} tintColor={C.accent} />
        }
      >
        {/* Screen header */}
        <YStack
          paddingHorizontal={16}
          paddingTop={16}
          paddingBottom={12}
          borderBottomWidth={1}
          borderBottomColor={C.border}
          backgroundColor="white"
          gap={2}
        >
          <Text fontSize={24} fontWeight="700" color={C.text}>
            Products
          </Text>
          <Text fontSize={13} color={C.muted}>
            Inventory, stock levels and prices
          </Text>
        </YStack>

        <YStack gap={12} padding={16}>
          {/* Summary */}
          <YStack
            backgroundColor="white"
            borderWidth={1}
            borderColor={C.border}
            borderRadius={14}
            padding={16}
            {...softShadow}
          >
            {filteredAndSortedProducts.length === 0 ? (
              <YStack alignItems="center" gap={8} paddingVertical={16}>
                <YStack
                  width={56}
                  height={56}
                  borderRadius={999}
                  backgroundColor={C.accentTint}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="cube-outline" size={26} color={C.accent} />
                </YStack>
                <Text fontSize={16} fontWeight="700" color={C.text} textAlign="center">
                  {allProducts.length === 0 ? 'No products available' : 'No products match your filters'}
                </Text>
                {hasActiveFilters ? (
                  <Text
                    onPress={handleResetAllFilters}
                    color={C.accent}
                    fontWeight="600"
                    fontSize={14}
                    textAlign="center"
                  >
                    Try adjusting your filters
                  </Text>
                ) : (
                  <Text fontSize={14} color={C.muted} textAlign="center">
                    {allProducts.length === 0 ? 'Add products to get started' : 'Your products will appear here'}
                  </Text>
                )}
              </YStack>
            ) : (
              <XStack justifyContent="space-between" alignItems="center" width="100%">
                <XStack alignItems="center" gap={8}>
                  <Ionicons name="cube-outline" size={18} color={C.accent} />
                  <Text fontSize={14} color={C.label}>
                    Showing
                  </Text>
                </XStack>
                <Text fontSize={14} color={C.muted}>
                  <Text fontSize={20} fontWeight="800" color={C.text}>{totalCount}</Text>
                  {` of ${allProducts.length} products`}
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Filters & Search */}
          {allProducts.length > 0 ? (
            <YStack
              backgroundColor="white"
              borderWidth={1}
              borderColor={C.border}
              borderRadius={14}
              padding={16}
              gap={12}
              {...softShadow}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} fontWeight="700" color={C.text}>
                  Filters
                </Text>
                {hasActiveFilters ? (
                  <XStack
                    onPress={handleResetAllFilters}
                    alignItems="center"
                    gap={4}
                    paddingHorizontal={10}
                    paddingVertical={6}
                    borderRadius={8}
                    pressStyle={{ opacity: 0.7 }}
                    cursor="pointer"
                  >
                    <Ionicons name="refresh-outline" size={16} color={C.accent} />
                    <Text color={C.accent} fontWeight="600" fontSize={13}>
                      Reset All
                    </Text>
                  </XStack>
                ) : null}
              </XStack>

              {/* Search */}
              <Fieldset gap={6}>
                <Label htmlFor="search" fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
                  Search
                </Label>
                <XStack
                  alignItems="center"
                  borderWidth={1}
                  borderColor={C.border}
                  borderRadius={10}
                  backgroundColor="white"
                  paddingLeft={12}
                >
                  <Ionicons name="search-outline" size={18} color={C.muted} />
                  <Input
                    id="search"
                    flex={1}
                    placeholder="Name, code, generic, sub-product..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    borderWidth={0}
                    backgroundColor="transparent"
                    color={C.text}
                    placeholderTextColor={C.placeholder}
                    focusStyle={{ borderWidth: 0 }}
                  />
                </XStack>
              </Fieldset>

              {/* Filter Actions */}
              <XStack gap={8}>
                <SecondaryButton flex={1} icon="funnel-outline" onPress={() => setShowFilterModal(true)}>
                  Filters
                </SecondaryButton>
                <SecondaryButton flex={1} icon="swap-vertical-outline" onPress={() => setShowSortModal(true)}>
                  Sort
                </SecondaryButton>
              </XStack>

              {/* Active Filters Summary */}
              {hasActiveFilters ? (
                <YStack gap={6}>
                  <Text fontSize={12} fontWeight="600" color={C.muted}>
                    Active filters
                  </Text>
                  <XStack flexWrap="wrap" gap={6}>
                    {filters.searchTerm ? (
                      <Pill tone="accent">{`Search: ${filters.searchTerm}`}</Pill>
                    ) : null}
                    {filters.shopId ? (
                      <Pill tone="accent">{`Shop: ${getShopNameById(filters.shopId, shops)}`}</Pill>
                    ) : null}
                    {filters.minStock !== undefined ? (
                      <Pill tone="accent">{`Min stock: ${filters.minStock}`}</Pill>
                    ) : null}
                    {filters.maxStock !== undefined ? (
                      <Pill tone="accent">{`Max stock: ${filters.maxStock}`}</Pill>
                    ) : null}
                    {filters.isActive ? (
                      <Pill tone="accent">
                        {`Status: ${filters.isActive === 'active' ? 'Active' : 'Inactive'}`}
                      </Pill>
                    ) : null}
                  </XStack>
                </YStack>
              ) : null}

              {/* Sort Info */}
              <XStack alignItems="center" gap={6}>
                <Ionicons name="swap-vertical-outline" size={14} color={C.muted} />
                <Text fontSize={13} color={C.muted}>
                  {`Sorted by ${sortFieldLabels[sortOption.field] || sortOption.field} (${sortOption.direction === 'asc' ? 'ascending' : 'descending'})`}
                </Text>
              </XStack>
            </YStack>
          ) : null}

          {/* Products Grid */}
          <YStack gap={12}>
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
