import React, { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  YStack,
  XStack,
  Text,
  Button,
  Spinner,
  Input,
  Image,
} from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Modal as RNModal,
  View,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SellItem, ProductBatch, DeliveryData } from '@/(utils)/types';
import {
  getSellByIdByUser,
  getAvailableBatchesByProductAndShop,
  partialSaleDelivery,
} from '@/(services)/api/sell';
import { formatMoney } from '@/(utils)/format';
import AppImage from '@/components/AppImage';
import SaleCorrections from '@/components/SaleCorrections';

// Presentation palette (white, black text, orange accent) - same as the sales app
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
  success: '#166534',
};

// Light-tint pill colours for sale / item statuses
const statusPill = (status: string): { bg: string; fg: string } => {
  switch (status) {
    case 'DELIVERED': return { bg: '#DCFCE7', fg: '#166534' };
    case 'APPROVED': return { bg: '#FFF7ED', fg: '#C2410C' };
    case 'PARTIALLY_DELIVERED': return { bg: '#FEF3C7', fg: '#92400E' };
    case 'PENDING': return { bg: '#FEF3C7', fg: '#92400E' };
    case 'CANCELLED': return { bg: '#FEE2E2', fg: '#991B1B' };
    case 'NOT_APPROVED': return { bg: '#F3F4F6', fg: '#374151' };
    default: return { bg: '#F3F4F6', fg: '#374151' };
  }
};

const StatusPill = ({ status, label }: { status: string; label: string }) => {
  const { bg, fg } = statusPill(status);
  return (
    <YStack backgroundColor={bg} paddingHorizontal={10} paddingVertical={3} borderRadius={999}>
      <Text color={fg} fontSize={12} fontWeight="700">
        {label}
      </Text>
    </YStack>
  );
};

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <XStack justifyContent="space-between" alignItems="center" gap="$3">
    <Text color={C.label} fontSize={14}>{label}</Text>
    {children}
  </XStack>
);

const SectionCard = ({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) => (
  <YStack
    backgroundColor="white"
    borderWidth={1}
    borderColor={C.border}
    borderRadius={14}
    padding={14}
    gap={gap}
  >
    {children}
  </YStack>
);

const primaryBtn = {
  backgroundColor: C.accent,
  borderWidth: 0,
  borderRadius: 10,
  pressStyle: { backgroundColor: '$orange10' },
} as const;

const secondaryBtn = {
  backgroundColor: 'white',
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 10,
  pressStyle: { backgroundColor: C.subtle, borderColor: C.border },
} as const;

const dangerBtn = {
  backgroundColor: 'white',
  borderColor: C.danger,
  borderWidth: 1,
  borderRadius: 10,
  pressStyle: { backgroundColor: '#FEF2F2', borderColor: C.danger },
} as const;

const getProductName = (item: SellItem) =>
  item.product?.name || `Product ${item.productId?.slice(-8) || 'Unknown'}`;

// "Sub name (CODE)" when the line is for a sub-product, otherwise null
const getSubProductLabel = (item?: SellItem | null): string | null => {
  const sub = item?.subProduct;
  if (!sub?.name) return null;
  return sub.subProductCode ? `${sub.name} (${sub.subProductCode})` : sub.name;
};

interface BatchSelection {
  batchId: string;
  quantity: number;
  maxQuantity: number;
}

interface SelectedBatches {
  [itemId: string]: BatchSelection[];
}

export default function SellDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { sellId } = useLocalSearchParams<{ sellId: string }>();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeItem, setActiveItem] = useState<SellItem | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<SelectedBatches>({});
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  // TanStack Query for fetching sell details
  const {
    data: sellData,
    isLoading: loading,
    error: sellError,
    refetch: refetchSell,
  } = useQuery({
    queryKey: ['sell', sellId],
    queryFn: () => getSellByIdByUser({
      id: sellId!,
      status: undefined,
      salesPersonName: undefined,
      customerName: undefined,
      userId: ''
    }),
    enabled: !!sellId,
  });

  const sell = sellData?.sells?.[0];

  // TanStack Query for fetching available batches
  const {
    data: batchesData,
    isLoading: batchesLoading,
    error: batchesError,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: [
      'availableBatches',
      activeItem?.shopId,
      activeItem?.productId,
      activeItem?.subProductId ?? null,
    ],
    queryFn: () => {
      if (!activeItem?.shopId || !activeItem?.productId) {
        throw new Error('Missing shop or product information');
      }
      // A sub-product line may only use that sub-product's batches
      return getAvailableBatchesByProductAndShop(
        activeItem.shopId,
        activeItem.productId,
        activeItem.subProductId
      );
    },
    enabled: !!activeItem?.shopId && !!activeItem?.productId,
  });

  const availableBatches = batchesData?.batches || [];

  // TanStack Mutation for partial delivery
  const partialDeliveryMutation = useMutation({
    mutationFn: ({ id, deliveryData }: { id: string; deliveryData: DeliveryData }) =>
      partialSaleDelivery(id, deliveryData),
    onSuccess: () => {
      setShowConfirmModal(false);
      setDeliverySuccess(true);
      setShowSuccessModal(true);
      // Clear selected batches
      setSelectedBatches({});
    },
    onError: (error: Error) => {
      // e.g. "already delivered" / "changed by another request" / insufficient stock:
      // close the confirm modal and reload so the user sees the current state
      setShowConfirmModal(false);
      Alert.alert('Delivery Error', error.message || 'Failed to process delivery');
    },
    onSettled: () => {
      refetchSell();
      queryClient.invalidateQueries({ queryKey: ['sell', sellId] });
      queryClient.invalidateQueries({ queryKey: ['sells'] });
      queryClient.invalidateQueries({ queryKey: ['availableBatches'] });
    },
  });

  const deliveryProcessing = partialDeliveryMutation.isPending;

  // Helper functions
  const getSelectedBatchesForItem = useMemo(() => (itemId: string) => {
    return selectedBatches[itemId] || [];
  }, [selectedBatches]);

  const getTotalSelectedQuantity = useMemo(() => (itemId: string) => {
    const batches = selectedBatches[itemId] || [];
    return batches.reduce((total, batch) => total + batch.quantity, 0);
  }, [selectedBatches]);

  const isItemFullyAllocated = useMemo(() => (itemId: string, requiredQuantity: number) => {
    const totalSelected = getTotalSelectedQuantity(itemId);
    return totalSelected === requiredQuantity;
  }, [getTotalSelectedQuantity]);

  // Get remaining quantity needed for active item
  const getRemainingQuantityNeeded = useMemo(() => {
    if (!activeItem) return 0;
    const totalSelected = getTotalSelectedQuantity(activeItem.id);
    return Math.max(0, activeItem.quantity - totalSelected);
  }, [activeItem, getTotalSelectedQuantity]);

  // Calculate available quantity considering already selected batches
  const getAvailableQuantityForBatch = useMemo(() => (batch: ProductBatch) => {
    // availableQuantity = what this shop holds of the batch
    const batchStock = batch.availableQuantity || 0;
    if (!activeItem) return batchStock;

    const selectedBatch = getSelectedBatchesForItem(activeItem.id)
      .find(b => b.batchId === batch.id);
    
    if (selectedBatch) {
      // If already selected, available = total stock - already selected quantity
      return Math.max(0, batchStock - selectedBatch.quantity);
    }
    
    return batchStock;
  }, [activeItem, getSelectedBatchesForItem]);

  // Validate if entered quantity is valid for a batch
  const isValidQuantity = useMemo(() => (batchId: string, quantity: number) => {
    if (quantity <= 0) return false;
    
    const batch = availableBatches.find(b => b.id === batchId);
    if (!batch) return false;
    
    const availableQuantity = getAvailableQuantityForBatch(batch);
    return quantity <= availableQuantity;
  }, [availableBatches, getAvailableQuantityForBatch]);

  useEffect(() => {
    if (sellError) {
      Alert.alert('Error', sellError.message);
    }
  }, [sellError]);

  useEffect(() => {
    if (deliverySuccess) {
      setShowSuccessModal(true);
    }
  }, [deliverySuccess]);

  const handleRefresh = async () => {
    if (!sellId) return;
    setRefreshing(true);
    await refetchSell();
    setRefreshing(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleOpenBatchModal = (item: SellItem) => {
    if (!item.shopId || !item.productId) {
      Alert.alert('Error', 'Item missing shop or product information');
      return;
    }
    
    if (activeItem?.id === item.id) {
      // Same query key: reload so the quantities are current
      refetchBatches();
    }
    setActiveItem(item);
    setShowBatchModal(true);
  };

  const handleBatchQuantityChange = (batchId: string, value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Don't allow starting with 0 unless it's just 0
    if (numericValue.length > 1 && numericValue.startsWith('0')) {
      setBatchQuantities(prev => ({
        ...prev,
        [batchId]: numericValue.substring(1),
      }));
      return;
    }
    
    setBatchQuantities(prev => ({
      ...prev,
      [batchId]: numericValue,
    }));
  };

  const handleSelectBatch = (batch: ProductBatch) => {
    if (!activeItem) return;
    
    const quantity = parseInt(batchQuantities[batch.id] || '0');
    
    if (quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity greater than 0');
      return;
    }
    
    // Check if quantity exceeds available stock
    const availableQuantity = getAvailableQuantityForBatch(batch);
    
    if (quantity > availableQuantity) {
      Alert.alert('Insufficient Stock', 
        `Maximum available quantity is ${availableQuantity} units. ` +
        `You're trying to allocate ${quantity} units.`);
      return;
    }
    
    // Check if quantity exceeds remaining needed
    const remainingNeeded = getRemainingQuantityNeeded;
    if (quantity > remainingNeeded) {
      Alert.alert('Quantity Exceeds Need',
        `Item only needs ${remainingNeeded} more units. ` +
        `You're trying to allocate ${quantity} units.`);
      return;
    }
    
    setSelectedBatches(prev => {
      const itemBatches = prev[activeItem.id] || [];
      const existingBatchIndex = itemBatches.findIndex(b => b.batchId === batch.id);
      
      if (existingBatchIndex >= 0) {
        // Update existing batch quantity
        const updatedBatches = [...itemBatches];
        updatedBatches[existingBatchIndex] = {
          ...updatedBatches[existingBatchIndex],
          quantity: updatedBatches[existingBatchIndex].quantity + quantity,
        };
        return {
          ...prev,
          [activeItem.id]: updatedBatches,
        };
      } else {
        // Add new batch
        return {
          ...prev,
          [activeItem.id]: [
            ...itemBatches,
            {
              batchId: batch.id,
              quantity,
              maxQuantity: availableQuantity,
            },
          ],
        };
      }
    });
    
    // Clear input for this batch
    setBatchQuantities(prev => ({
      ...prev,
      [batch.id]: '',
    }));
  };

  // Handle assigning all remaining needed quantity
  const handleAssignAllRemaining = (batch: ProductBatch) => {
    if (!activeItem) return;
    
    const remainingNeeded = getRemainingQuantityNeeded;
    const availableQuantity = getAvailableQuantityForBatch(batch);
    
    if (remainingNeeded <= 0) {
      Alert.alert('Info', 'Item is already fully allocated');
      return;
    }
    
    if (availableQuantity < remainingNeeded) {
      Alert.alert('Insufficient Stock', 
        `Only ${availableQuantity} units available, but need ${remainingNeeded}. ` +
        'Will allocate as much as possible.');
      
      // Allocate what's available
      if (availableQuantity > 0) {
        setSelectedBatches(prev => {
          const itemBatches = prev[activeItem.id] || [];
          const existingBatchIndex = itemBatches.findIndex(b => b.batchId === batch.id);
          
          if (existingBatchIndex >= 0) {
            const updatedBatches = [...itemBatches];
            updatedBatches[existingBatchIndex] = {
              ...updatedBatches[existingBatchIndex],
              quantity: updatedBatches[existingBatchIndex].quantity + availableQuantity,
            };
            return {
              ...prev,
              [activeItem.id]: updatedBatches,
            };
          } else {
            return {
              ...prev,
              [activeItem.id]: [
                ...itemBatches,
                {
                  batchId: batch.id,
                  quantity: availableQuantity,
                  maxQuantity: availableQuantity,
                },
              ],
            };
          }
        });
      }
      return;
    }
    
    setSelectedBatches(prev => {
      const itemBatches = prev[activeItem.id] || [];
      const existingBatchIndex = itemBatches.findIndex(b => b.batchId === batch.id);
      
      if (existingBatchIndex >= 0) {
        const updatedBatches = [...itemBatches];
        updatedBatches[existingBatchIndex] = {
          ...updatedBatches[existingBatchIndex],
          quantity: updatedBatches[existingBatchIndex].quantity + remainingNeeded,
        };
        return {
          ...prev,
          [activeItem.id]: updatedBatches,
        };
      } else {
        return {
          ...prev,
          [activeItem.id]: [
            ...itemBatches,
            {
              batchId: batch.id,
              quantity: remainingNeeded,
              maxQuantity: availableQuantity,
            },
          ],
        };
      }
    });
    
    // Clear any input for this batch
    setBatchQuantities(prev => ({
      ...prev,
      [batch.id]: '',
    }));
  };

  const handleRemoveBatch = (batchId: string) => {
    if (!activeItem) return;
    
    setSelectedBatches(prev => {
      const itemBatches = prev[activeItem.id] || [];
      const updatedBatches = itemBatches.filter(b => b.batchId !== batchId);
      
      if (updatedBatches.length === 0) {
        const newState = { ...prev };
        delete newState[activeItem.id];
        return newState;
      }
      
      return {
        ...prev,
        [activeItem.id]: updatedBatches,
      };
    });
  };

  const handleClearItemBatches = (itemId: string) => {
    setSelectedBatches(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  const prepareDeliveryData = (): DeliveryData | null => {
    if (!sell) return null;
    
    const items: { itemId: string; batches: { batchId: string; quantity: number }[] }[] = [];
    
    sell.items?.forEach(item => {
      const selectedBatchesForItem = getSelectedBatchesForItem(item.id);
      
      if (selectedBatchesForItem.length > 0) {
        items.push({
          itemId: item.id,
          batches: selectedBatchesForItem.map(batch => ({
            batchId: batch.batchId,
            quantity: batch.quantity,
          })),
        });
      }
    });
    
    if (items.length === 0) {
      return null;
    }
    
    return { items };
  };

  const handleSubmitDelivery = () => {
    if (!sellId || partialDeliveryMutation.isPending) return;
    
    const deliveryData = prepareDeliveryData();
    if (!deliveryData) {
      Alert.alert('Error', 'No batches selected for delivery');
      return;
    }
    
    const allItemsAllocated = sell?.items?.every(item => {
      const selectedQuantity = getTotalSelectedQuantity(item.id);
      return selectedQuantity === item.quantity;
    });
    
    if (!allItemsAllocated) {
      Alert.alert(
        'Incomplete Allocation',
        'Some items are not fully allocated with batches. Please allocate batches for all items before delivery.',
        [
          { text: 'Continue Anyway', onPress: () => setShowConfirmModal(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmDelivery = () => {
    // Guard against double taps: the backend also rejects a second delivery
    if (!sellId || partialDeliveryMutation.isPending) return;

    const deliveryData = prepareDeliveryData();
    if (!deliveryData) return;

    // The confirm modal stays open (button shows a spinner) until the
    // mutation settles; onSuccess/onError close it.
    partialDeliveryMutation.mutate({
      id: sellId,
      deliveryData,
    });
  };

  const closeConfirmModal = () => {
    if (partialDeliveryMutation.isPending) return;
    setShowConfirmModal(false);
  };


  const getStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Delivered';
      case 'NOT_APPROVED': return 'Not Approved';
      case 'PARTIALLY_DELIVERED': return 'Partially Delivered';
      case 'APPROVED': return 'Approved';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getItemStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Delivered';
      case 'PENDING': return 'Pending';
      default: return status;
    }
  };

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
        <Spinner size="large" color={C.accent} />
        <Text marginTop="$4" color={C.muted} fontSize={15} fontWeight="500">
          Loading sale details...
        </Text>
      </YStack>
    );
  }

  if (!sell) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="white" padding={16} gap={12}>
        <YStack
          width={56}
          height={56}
          borderRadius={999}
          backgroundColor={C.accentTint}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name="receipt-outline" size={26} color={C.accent} />
        </YStack>
        <Text fontSize={16} fontWeight="600" color={C.text} textAlign="center">
          Loading sale details...
        </Text>
        <Button {...primaryBtn} onPress={handleGoBack}>
          <Text color="white" fontWeight="700">Go Back</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="white">
      {/* Header */}
      <XStack
        backgroundColor="white"
        borderBottomWidth={1}
        borderBottomColor={C.border}
        padding={16}
        alignItems="center"
        gap={12}
      >
        <Button
          size="$3"
          circular
          {...secondaryBtn}
          onPress={handleGoBack}
          icon={<Ionicons name="arrow-back" size={18} color={C.text} />}
        />
        <YStack flex={1}>
          <Text color={C.text} fontSize={24} fontWeight="700">
            Sale Details
          </Text>
          <Text fontSize={13} color={C.muted} numberOfLines={1}>
            {sell.invoiceNo}
          </Text>
        </YStack>
        <StatusPill status={sell.saleStatus} label={getStatusText(sell.saleStatus)} />
      </XStack>

      {/* Content */}
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <YStack gap={12}>
          {/* Sale Information Card */}
          <SectionCard>
            <Text color={C.text} fontSize={16} fontWeight="700">
              Sale Information
            </Text>

            <InfoRow label="Invoice Number">
              <Text color={C.text} fontWeight="600">{sell.invoiceNo}</Text>
            </InfoRow>

            <InfoRow label="Sale Date">
              <Text color={C.text} flexShrink={1} textAlign="right">
                {new Date(sell.saleDate).toLocaleDateString()} at {new Date(sell.saleDate).toLocaleTimeString()}
              </Text>
            </InfoRow>

            {sell.branch ? (
              <InfoRow label="Branch">
                <Text color={C.text}>{sell.branch.name}</Text>
              </InfoRow>
            ) : null}

            {sell.customer ? (
              <InfoRow label="Customer">
                <YStack alignItems="flex-end" flexShrink={1}>
                  <Text color={C.text} fontWeight="600">{sell.customer.name}</Text>
                  {sell.customer.phone ? (
                    <Text color={C.muted} fontSize={12}>{sell.customer.phone}</Text>
                  ) : null}
                </YStack>
              </InfoRow>
            ) : null}

            <InfoRow label="Total Products">
              <Text color={C.text}>{sell.totalProducts}</Text>
            </InfoRow>
          </SectionCard>

          {/* Items List with Batch Management */}
          <YStack gap={10}>
            <Text color={C.text} fontSize={16} fontWeight="700">
              Order Items ({sell.items?.length || 0})
            </Text>
            {sell.items?.map((item) => {
              const selectedBatchesForItem = getSelectedBatchesForItem(item.id);
              const totalSelected = getTotalSelectedQuantity(item.id);
              const isFullyAllocated = isItemFullyAllocated(item.id, item.quantity);
              const subLabel = getSubProductLabel(item);

              return (
                <YStack
                  key={item.id}
                  backgroundColor="white"
                  borderWidth={1}
                  borderColor={C.border}
                  borderRadius={12}
                  padding={12}
                  gap={12}
                >
                  {/* Item Header with Image */}
                  <XStack gap={12} alignItems="flex-start">
                    <AppImage path={item.subProduct?.imageUrl || item.product?.imageUrl} size={72} radius={10} zoomable title={getProductName(item)} />
                    <YStack flex={1} gap={2}>
                      <Text fontWeight="700" color={C.text} numberOfLines={2}>
                        {getProductName(item)}
                      </Text>
                      {subLabel ? (
                        <Text fontSize={12} fontWeight="600" color={C.label} numberOfLines={1}>
                          {subLabel}
                        </Text>
                      ) : null}
                      <Text fontSize={12} color={C.muted}>
                        Shop: {item.shop?.name || 'Unknown Shop'}
                      </Text>
                      <Text fontSize={12} color={C.muted}>
                        Unit: {item.unitOfMeasure?.name || item.unitOfMeasure?.symbol || 'unit'}
                      </Text>
                      <XStack justifyContent="space-between" marginTop={4}>
                        <Text fontWeight="600" color={C.text}>
                          {formatMoney(item.unitPrice)}
                        </Text>
                        <Text fontSize={12} color={C.muted}>
                          x{item.quantity || 0}
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>

                  {/* Item Status */}
                  <XStack justifyContent="space-between" alignItems="center">
                    <StatusPill
                      status={item.itemSaleStatus || 'PENDING'}
                      label={getItemStatusText(item.itemSaleStatus || 'PENDING')}
                    />
                    <Text fontWeight="700" color={C.text}>
                      {formatMoney(item.totalPrice)}
                    </Text>
                  </XStack>

                  {/* Batch Allocation Status */}
                  <YStack gap={8} borderTopWidth={1} borderTopColor={C.border} paddingTop={10}>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={13} color={C.label} fontWeight="600">
                        Batch Allocation
                      </Text>
                      <XStack alignItems="center" gap={4}>
                        {isFullyAllocated ? (
                          <Ionicons name="checkmark-circle" size={16} color={C.success} />
                        ) : null}
                        <Text
                          fontSize={13}
                          fontWeight="600"
                          color={isFullyAllocated ? C.success : C.label}
                        >
                          {totalSelected}/{item.quantity} units allocated
                        </Text>
                      </XStack>
                    </XStack>

                    {/* Selected Batches */}
                    {selectedBatchesForItem.length > 0 ? (
                      <YStack gap={6}>
                        {selectedBatchesForItem.map((batch, idx) => (
                          <XStack
                            key={idx}
                            justifyContent="space-between"
                            alignItems="center"
                            backgroundColor={C.subtle}
                            borderWidth={1}
                            borderColor={C.border}
                            borderRadius={8}
                            paddingHorizontal={10}
                            paddingVertical={6}
                          >
                            <XStack alignItems="center" gap={6} flex={1}>
                              <Ionicons name="cube-outline" size={14} color={C.muted} />
                              <Text fontSize={12} fontWeight="600" color={C.text}>
                                Batch {batch.batchId.slice(-6)}
                              </Text>
                            </XStack>
                            <XStack alignItems="center" gap={8}>
                              <Text fontSize={12} color={C.muted}>
                                {batch.quantity} units
                              </Text>
                              <Button
                                size="$2"
                                {...dangerBtn}
                                onPress={() => handleRemoveBatch(batch.batchId)}
                              >
                                <Text fontSize={12} fontWeight="600" color={C.danger}>Remove</Text>
                              </Button>
                            </XStack>
                          </XStack>
                        ))}
                      </YStack>
                    ) : null}

                    {/* Allocate Batch Button */}
                    {item.itemSaleStatus === 'PENDING' ? (
                      <XStack gap={8}>
                        <Button
                          flex={1}
                          size="$3"
                          {...secondaryBtn}
                          onPress={() => handleOpenBatchModal(item)}
                          icon={<Ionicons name="layers-outline" size={16} color={C.accent} />}
                        >
                          <Text color={C.text} fontWeight="600" fontSize={13}>
                            {selectedBatchesForItem.length > 0 ? 'Add More Batches' : 'Allocate Batches'}
                          </Text>
                        </Button>
                        {selectedBatchesForItem.length > 0 ? (
                          <Button
                            size="$3"
                            {...dangerBtn}
                            onPress={() => handleClearItemBatches(item.id)}
                          >
                            <Text color={C.danger} fontWeight="600" fontSize={13}>Clear</Text>
                          </Button>
                        ) : null}
                      </XStack>
                    ) : null}
                  </YStack>
                </YStack>
              );
            })}
          </YStack>

          {/* Totals */}
          <SectionCard gap={8}>
            <InfoRow label="Subtotal">
              <Text color={C.text}>{formatMoney(sell.subTotal)}</Text>
            </InfoRow>
            <InfoRow label="Discount">
              <Text color={C.danger}>-{formatMoney(sell.discount)}</Text>
            </InfoRow>
            <InfoRow label="VAT">
              <Text color={C.text}>{formatMoney(sell.vat)}</Text>
            </InfoRow>
            <XStack
              justifyContent="space-between"
              alignItems="center"
              borderTopWidth={1}
              borderTopColor={C.border}
              paddingTop={10}
              marginTop={2}
            >
              <Text fontWeight="700" color={C.text} fontSize={16}>Grand Total</Text>
              <Text fontWeight="800" color={C.accent} fontSize={18}>
                {formatMoney(sell.grandTotal)}
              </Text>
            </XStack>
            {sell.NetTotal != null ? (
              <InfoRow label="Net Total">
                <Text color={C.text}>{formatMoney(sell.NetTotal)}</Text>
              </InfoRow>
            ) : null}
          </SectionCard>

          {/* Returns / extra deliveries raised on this sale */}
          {sellId ? <SaleCorrections sellId={sellId} onChanged={refetchSell} /> : null}

          {/* Delivery Action */}
          {(sell.saleStatus === 'APPROVED' || sell.saleStatus === 'PARTIALLY_DELIVERED') &&
          sell.items?.some(item => item.itemSaleStatus === 'PENDING') ? (
            <SectionCard gap={12}>
              <XStack alignItems="center" gap={10}>
                <YStack
                  width={36}
                  height={36}
                  borderRadius={999}
                  backgroundColor={C.accentTint}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="cube-outline" size={18} color={C.accent} />
                </YStack>
                <YStack flex={1}>
                  <Text color={C.text} fontSize={16} fontWeight="700">
                    {sell.saleStatus === 'PARTIALLY_DELIVERED' ? 'Continue Delivery' : 'Ready for Delivery'}
                  </Text>
                  <Text color={C.muted} fontSize={13}>
                    {sell.saleStatus === 'PARTIALLY_DELIVERED'
                      ? 'Some items are still pending. Allocate remaining batches and submit for delivery.'
                      : 'Allocate batches for all items, then submit for delivery.'}
                  </Text>
                </YStack>
              </XStack>
              <Button
                size="$4"
                {...primaryBtn}
                onPress={handleSubmitDelivery}
                disabled={deliveryProcessing}
                opacity={deliveryProcessing ? 0.7 : 1}
              >
                {deliveryProcessing ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <Text color="white" fontWeight="700" fontSize={15}>
                    {sell.saleStatus === 'PARTIALLY_DELIVERED' ? 'Continue Delivery' : 'Submit Delivery'}
                  </Text>
                )}
              </Button>
            </SectionCard>
          ) : null}

          {/* Action Buttons */}
          <XStack gap={12} marginBottom={insets.bottom + 8}>
            <Button
              flex={1}
              {...secondaryBtn}
              onPress={handleGoBack}
            >
              <Text color={C.text} fontWeight="600">Back to List</Text>
            </Button>

            <Button
              flex={1}
              {...primaryBtn}
              onPress={handleRefresh}
              disabled={refreshing}
              icon={refreshing ? undefined : <Ionicons name="refresh" size={16} color="white" />}
            >
              {refreshing ? (
                <Spinner size="small" color="white" />
              ) : (
                <Text color="white" fontWeight="700">Refresh</Text>
              )}
            </Button>
          </XStack>
        </YStack>
      </ScrollView>

      {/* Batch Selection Modal */}
      <RNModal
        visible={showBatchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowBatchModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <YStack
              flex={1}
              backgroundColor="rgba(0,0,0,0.4)"
              justifyContent="flex-end"
            >
              <TouchableWithoutFeedback>
                <YStack
                  backgroundColor="white"
                  borderTopLeftRadius={20}
                  borderTopRightRadius={20}
                  padding={16}
                  maxHeight="85%"
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <YStack gap={12}>
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text color={C.text} fontSize={20} fontWeight="700">Available Batches</Text>
                        <Button
                          size="$3"
                          circular
                          {...secondaryBtn}
                          onPress={() => {
                            Keyboard.dismiss();
                            setShowBatchModal(false);
                          }}
                          icon={<Ionicons name="close" size={18} color={C.text} />}
                        />
                      </XStack>

                      {/* Product Information with Image */}
                      {activeItem ? (
                        <XStack
                          gap={12}
                          alignItems="center"
                          borderWidth={1}
                          borderColor={C.border}
                          borderRadius={12}
                          padding={12}
                          backgroundColor={C.subtle}
                        >
                          <AppImage path={activeItem?.subProduct?.imageUrl || activeItem?.product?.imageUrl} size={56} radius={8} zoomable title={getProductName(activeItem)} />
                          <YStack flex={1} gap={2}>
                            <Text fontWeight="700" color={C.text} numberOfLines={2}>
                              {getProductName(activeItem)}
                              {getSubProductLabel(activeItem) ? ` — ${getSubProductLabel(activeItem)}` : ''}
                            </Text>
                            {activeItem.shop?.name ? (
                              <Text fontSize={12} color={C.muted} numberOfLines={1}>
                                Shop: {activeItem.shop.name}
                              </Text>
                            ) : null}
                            <XStack justifyContent="space-between" marginTop={2}>
                              <Text fontSize={12} color={C.label}>
                                Needed: {activeItem.quantity} units
                              </Text>
                              <Text fontSize={12} color={C.accent} fontWeight="700">
                                Remaining: {getRemainingQuantityNeeded} units
                              </Text>
                            </XStack>
                          </YStack>
                        </XStack>
                      ) : null}

                      {batchesLoading ? (
                        <YStack alignItems="center" padding="$8">
                          <Spinner size="large" color={C.accent} />
                          <Text marginTop="$4" color={C.muted}>
                            Loading available batches...
                          </Text>
                        </YStack>
                      ) : batchesError ? (
                        <XStack
                          alignItems="center"
                          gap={8}
                          borderWidth={1}
                          borderColor={C.border}
                          borderRadius={12}
                          padding={12}
                        >
                          <Ionicons name="alert-circle-outline" size={18} color={C.danger} />
                          <Text color={C.text} flex={1}>
                            Error loading batches: {batchesError.message}
                          </Text>
                        </XStack>
                      ) : availableBatches.length === 0 ? (
                        <YStack
                          alignItems="center"
                          gap={8}
                          borderWidth={1}
                          borderColor={C.border}
                          borderRadius={12}
                          padding={16}
                        >
                          <Ionicons name="cube-outline" size={22} color={C.muted} />
                          <Text color={C.muted} textAlign="center">
                            No batches available for this product in the selected shop.
                          </Text>
                        </YStack>
                      ) : (
                        <YStack gap={10}>
                          {availableBatches.map((batch) => {
                            const selected = activeItem && getSelectedBatchesForItem(activeItem.id)
                              .some(b => b.batchId === batch.id);
                            const availableQuantity = getAvailableQuantityForBatch(batch);
                            const enteredQuantity = parseInt(batchQuantities[batch.id] || '0');
                            const isQuantityValid = isValidQuantity(batch.id, enteredQuantity);
                            const remainingNeeded = getRemainingQuantityNeeded;

                            // Check if entered quantity exceeds remaining needed
                            const exceedsRemaining = enteredQuantity > remainingNeeded;
                            const canAllocate = enteredQuantity > 0 && isQuantityValid;
                            const inputInvalid = exceedsRemaining || !(isQuantityValid || enteredQuantity === 0);

                            return (
                              <YStack
                                key={batch.id}
                                backgroundColor="white"
                                borderWidth={1}
                                borderColor={selected ? C.accent : C.border}
                                borderRadius={12}
                                padding={12}
                                gap={10}
                              >
                                <XStack justifyContent="space-between" alignItems="center" gap={8}>
                                  <YStack flex={1}>
                                    <Text fontWeight="700" color={C.text}>
                                      Batch #{batch.batchNumber || batch.id.slice(-6)}
                                    </Text>
                                    <XStack alignItems="center" gap={4}>
                                      <Ionicons name="calendar-outline" size={12} color={C.muted} />
                                      <Text fontSize={12} color={C.muted}>
                                        Expiry: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                                      </Text>
                                    </XStack>
                                  </YStack>
                                  <YStack
                                    backgroundColor={availableQuantity > 0 ? '#DCFCE7' : '#FEE2E2'}
                                    paddingHorizontal={10}
                                    paddingVertical={3}
                                    borderRadius={999}
                                  >
                                    <Text
                                      fontSize={12}
                                      fontWeight="700"
                                      color={availableQuantity > 0 ? '#166534' : '#991B1B'}
                                    >
                                      {availableQuantity} available
                                    </Text>
                                  </YStack>
                                </XStack>

                                {selected ? (
                                  <XStack
                                    alignItems="center"
                                    justifyContent="center"
                                    gap={6}
                                    backgroundColor={C.accentTint}
                                    padding={8}
                                    borderRadius={10}
                                  >
                                    <Ionicons name="checkmark-circle" size={16} color={C.accent} />
                                    <Text color={C.text} fontSize={13} fontWeight="600">
                                      Selected for allocation
                                    </Text>
                                  </XStack>
                                ) : availableQuantity > 0 ? (
                                  <YStack gap={8}>
                                    {/* Manual Quantity Input with red styling when exceeding */}
                                    <YStack gap={6}>
                                      <Input
                                        placeholder={`Enter quantity (max: ${availableQuantity})`}
                                        placeholderTextColor={C.placeholder}
                                        value={batchQuantities[batch.id] || ''}
                                        onChangeText={(value) => handleBatchQuantityChange(batch.id, value)}
                                        keyboardType="numeric"
                                        backgroundColor="white"
                                        borderRadius={10}
                                        borderWidth={1}
                                        borderColor={inputInvalid ? C.danger : C.border}
                                        focusStyle={{ borderColor: inputInvalid ? C.danger : C.accent }}
                                        color={C.text}
                                        onSubmitEditing={Keyboard.dismiss}
                                        onBlur={() => {
                                          // Automatically allocate when user finishes typing
                                          if (enteredQuantity > 0 && isQuantityValid && !exceedsRemaining) {
                                            handleSelectBatch(batch);
                                          } else if (exceedsRemaining) {
                                            Alert.alert(
                                              "Quantity Exceeds Need",
                                              `Only ${remainingNeeded} units remaining needed. ` +
                                              `You entered ${enteredQuantity} units.`
                                            );
                                          }
                                        }}
                                      />

                                      {/* Warning message for exceeding */}
                                      {exceedsRemaining ? (
                                        <XStack alignItems="center" gap={6}>
                                          <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
                                          <Text fontSize={12} color={C.danger} fontWeight="600">
                                            Exceeds remaining needed by {enteredQuantity - remainingNeeded} units
                                          </Text>
                                        </XStack>
                                      ) : null}

                                      {/* Allocate button with conditional styling */}
                                      <Button
                                        {...(exceedsRemaining ? dangerBtn : canAllocate ? primaryBtn : secondaryBtn)}
                                        onPress={() => {
                                          if (exceedsRemaining) {
                                            Alert.alert(
                                              "Quantity Exceeds Need",
                                              `Only ${remainingNeeded} units remaining needed. ` +
                                              `Please reduce quantity to ${remainingNeeded} or less.`
                                            );
                                          } else if (enteredQuantity > 0 && isQuantityValid) {
                                            handleSelectBatch(batch);
                                          } else if (enteredQuantity > 0) {
                                            Alert.alert(
                                              "Invalid Quantity",
                                              `Maximum available quantity is ${availableQuantity} units.`
                                            );
                                          } else {
                                            Alert.alert("Error", "Please enter a quantity greater than 0");
                                          }
                                        }}
                                        disabled={exceedsRemaining}
                                        opacity={exceedsRemaining ? 0.7 : 1}
                                      >
                                        <Text
                                          fontWeight="700"
                                          color={exceedsRemaining ? C.danger : canAllocate ? 'white' : C.text}
                                        >
                                          {exceedsRemaining ? "Exceeds Allocation" : "Allocate"}
                                        </Text>
                                      </Button>
                                    </YStack>

                                    {/* Quick Action Button for remaining needed */}
                                    {availableQuantity >= remainingNeeded && remainingNeeded > 0 ? (
                                      <Button
                                        {...secondaryBtn}
                                        onPress={() => handleAssignAllRemaining(batch)}
                                        icon={<Ionicons name="flash-outline" size={16} color={C.accent} />}
                                      >
                                        <Text color={C.text} fontWeight="600">
                                          Assign All Remaining Needed
                                        </Text>
                                      </Button>
                                    ) : null}
                                  </YStack>
                                ) : (
                                  <XStack
                                    alignItems="center"
                                    justifyContent="center"
                                    gap={6}
                                    backgroundColor={C.subtle}
                                    padding={8}
                                    borderRadius={10}
                                  >
                                    <Ionicons name="close-circle-outline" size={16} color={C.danger} />
                                    <Text color={C.label} fontSize={13}>
                                      No stock available
                                    </Text>
                                  </XStack>
                                )}
                              </YStack>
                            );
                          })}
                        </YStack>
                      )}

                      <Button
                        {...secondaryBtn}
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowBatchModal(false);
                        }}
                      >
                        <Text color={C.text} fontWeight="600">Close</Text>
                      </Button>
                    </YStack>
                  </ScrollView>
                </YStack>
              </TouchableWithoutFeedback>
            </YStack>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Confirmation Modal */}
      <RNModal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeConfirmModal}
      >
        <TouchableWithoutFeedback onPress={closeConfirmModal}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 }}>
            <TouchableWithoutFeedback>
              <YStack
                backgroundColor="white"
                borderColor={C.border}
                borderWidth={1}
                borderRadius={16}
                padding={20}
                width="100%"
                maxWidth={400}
                gap={12}
              >
                <YStack alignItems="center" gap={8}>
                  <YStack
                    width={48}
                    height={48}
                    borderRadius={999}
                    backgroundColor={C.accentTint}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name="cube-outline" size={24} color={C.accent} />
                  </YStack>
                  <Text color={C.text} fontSize={18} fontWeight="700" textAlign="center">
                    Confirm Delivery
                  </Text>
                  <Text color={C.muted} fontSize={14} textAlign="center">
                    Are you sure you want to submit this delivery? This action cannot be undone.
                  </Text>
                </YStack>
                {/* Items included in this delivery */}
                <YStack gap={6} borderWidth={1} borderColor={C.border} borderRadius={12} padding={12}>
                  {sell.items
                    ?.filter(item => getTotalSelectedQuantity(item.id) > 0)
                    .map(item => {
                      const subLabel = getSubProductLabel(item);
                      return (
                        <XStack key={item.id} justifyContent="space-between" gap={8}>
                          <Text flex={1} fontSize={13} color={C.text} numberOfLines={2}>
                            {getProductName(item)}
                            {subLabel ? ` — ${subLabel}` : ''}
                          </Text>
                          <Text fontSize={13} fontWeight="700" color={C.accent}>
                            {getTotalSelectedQuantity(item.id)}/{item.quantity}
                          </Text>
                        </XStack>
                      );
                    })}
                </YStack>
                <XStack gap={12} marginTop={4}>
                  <Button
                    flex={1}
                    {...secondaryBtn}
                    onPress={closeConfirmModal}
                    disabled={deliveryProcessing}
                  >
                    <Text color={C.text} fontWeight="600">Cancel</Text>
                  </Button>
                  <Button
                    flex={1}
                    {...primaryBtn}
                    onPress={confirmDelivery}
                    disabled={deliveryProcessing}
                    opacity={deliveryProcessing ? 0.7 : 1}
                  >
                    {deliveryProcessing ? (
                      <Spinner size="small" color="white" />
                    ) : (
                      <Text color="white" fontWeight="700">Confirm</Text>
                    )}
                  </Button>
                </XStack>
              </YStack>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Success Modal */}
      <RNModal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSuccessModal(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 }}>
            <TouchableWithoutFeedback>
              <YStack
                backgroundColor="white"
                borderColor={C.border}
                borderWidth={1}
                borderRadius={16}
                padding={20}
                width="100%"
                maxWidth={400}
                gap={12}
                alignItems="center"
              >
                <YStack
                  width={56}
                  height={56}
                  borderRadius={999}
                  backgroundColor="#DCFCE7"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="checkmark-circle" size={30} color={C.success} />
                </YStack>
                <Text color={C.text} fontSize={18} fontWeight="700" textAlign="center">
                  Delivery Successful
                </Text>
                <Text color={C.muted} fontSize={14} textAlign="center">
                  The delivery has been processed successfully.
                </Text>
                <Button
                  width="100%"
                  {...primaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    setDeliverySuccess(false);
                  }}
                  marginTop={4}
                >
                  <Text color="white" fontWeight="700">Continue</Text>
                </Button>
              </YStack>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </YStack>
  );
}
