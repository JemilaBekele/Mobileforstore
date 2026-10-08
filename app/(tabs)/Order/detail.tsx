import React, { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  YStack,
  XStack,
  Text,
  Card,
  H4,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SellItem, ProductBatch, DeliveryData } from '@/(utils)/types';
import {
  getSellByIdByUser,
  getAvailableBatchesByProductAndShop,
  partialSaleDelivery,
} from '@/(services)/api/sell';
import { formatMoney } from '@/(utils)/format';
import { AppColors } from '@/constants/colors';

// Status badge colours (white/orange theme)
const SALE_STATUS_COLORS: Record<string, string> = {
  DELIVERED: AppColors.success,
  PARTIALLY_DELIVERED: AppColors.warning,
  APPROVED: AppColors.info,
  CANCELLED: AppColors.error,
  NOT_APPROVED: AppColors.textSecondary,
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  DELIVERED: AppColors.success,
  PENDING: AppColors.primary,
};

const getProductName = (item: SellItem) =>
  item.product?.name || `Product ${item.productId?.slice(-8) || 'Unknown'}`;

// "Sub name (CODE)" when the line is for a sub-product, otherwise null
const getSubProductLabel = (item?: SellItem | null): string | null => {
  const sub = item?.subProduct;
  if (!sub?.name) return null;
  return sub.subProductCode ? `${sub.name} (${sub.subProductCode})` : sub.name;
};

// Add the normalizeImagePath function
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

  // Get product image URL
  const getProductImageUrl = useMemo(() => {
    const imageUrl = activeItem?.subProduct?.imageUrl || activeItem?.product?.imageUrl;
    if (!imageUrl) return null;
    return normalizeImagePath(imageUrl);
  }, [activeItem]);

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

  const getStatusColor = (status: string) =>
    SALE_STATUS_COLORS[status] || AppColors.textMuted;

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

  const getItemStatusColor = (status: string) =>
    ITEM_STATUS_COLORS[status] || AppColors.textMuted;

  const getItemStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Delivered';
      case 'PENDING': return 'Pending';
      default: return status;
    }
  };

  if (loading && !refreshing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Loading sale details...
        </Text>
      </YStack>
    );
  }

  if (!sell) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1" padding="$4">
        <Text fontSize="$6" color="$orange9">📊</Text>
        <Text fontSize="$5" fontWeight="600" color="$orange11" textAlign="center" marginVertical="$4">
          Loading sale details...
        </Text>
        <Button
          backgroundColor="$orange9"
          onPress={handleGoBack}
        >
          <Text color="white" fontWeight="600">Go Back</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$orange1" paddingTop={insets.top}>
      {/* Header */}
      <Card
        backgroundColor="white"
        borderBottomWidth={1}
        borderBottomColor="$orange4"
        borderRadius={0}
        padding="$4"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Button
            size="$2"
            circular
            backgroundColor="$orange3"
            onPress={handleGoBack}
          >
            <Text color="$orange11">←</Text>
          </Button>
          
          <YStack alignItems="center" flex={1}>
            <H4 color="$orange12">Sale Details</H4>
            <Text fontSize="$1" color="$orange10">
              {sell.invoiceNo}
            </Text>
          </YStack>
          
          <XStack
            backgroundColor={getStatusColor(sell.saleStatus)}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
          >
            <Text color="white" fontSize="$1" fontWeight="700">
              {getStatusText(sell.saleStatus)}
            </Text>
          </XStack>
        </XStack>
      </Card>

      {/* Content */}
      <ScrollView 
        flex={1} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <YStack space="$4">
          {/* Sale Information Card */}
          <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$4" borderRadius="$4">
            <YStack space="$3">
              <H4 color="$orange12" borderBottomWidth={1} borderBottomColor="$orange4" paddingBottom="$2">
                Sale Information
              </H4>
              
              <XStack justifyContent="space-between">
                <Text fontWeight="600" color="$orange11">Invoice Number:</Text>
                <Text color="$orange12">{sell.invoiceNo}</Text>
              </XStack>
              
              <XStack justifyContent="space-between">
                <Text fontWeight="600" color="$orange11">Sale Date:</Text>
                <Text color="$orange12">
                  {new Date(sell.saleDate).toLocaleDateString()} at {new Date(sell.saleDate).toLocaleTimeString()}
                </Text>
              </XStack>
              
              {sell.branch && (
                <XStack justifyContent="space-between">
                  <Text fontWeight="600" color="$orange11">Branch:</Text>
                  <Text color="$orange12">{sell.branch.name}</Text>
                </XStack>
              )}
              
              {sell.customer && (
                <XStack justifyContent="space-between">
                  <Text fontWeight="600" color="$orange11">Customer:</Text>
                  <Text color="$orange12">{sell.customer.name}</Text>
                  {sell.customer.phone && (
                    <Text color="$orange10">{sell.customer.phone}</Text>
                  )}
                </XStack>
              )}
              
              <XStack justifyContent="space-between">
                <Text fontWeight="600" color="$orange11">Total Products:</Text>
                <Text color="$orange12">{sell.totalProducts}</Text>
              </XStack>
            </YStack>
          </Card>

          {/* Items List with Batch Management */}
          <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$4" borderRadius="$4">
            <H4 color="$orange12" marginBottom="$3">Order Items</H4>
            <YStack space="$4">
              {sell.items?.map((item, index) => {
                const selectedBatchesForItem = getSelectedBatchesForItem(item.id);
                const totalSelected = getTotalSelectedQuantity(item.id);
                const isFullyAllocated = isItemFullyAllocated(item.id, item.quantity);
                
                return (
                  <Card key={item.id} backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$3" borderRadius="$3">
                    <YStack space="$3">
                      {/* Item Header with Image */}
                      <XStack space="$3" alignItems="flex-start">
                        {item.product?.imageUrl && (
                          <Image
                            source={{ uri: normalizeImagePath(item.product.imageUrl) }}
                            width={80}
                            height={80}
                            borderRadius="$3"
                            resizeMode="cover"
                            backgroundColor="$orange2"
                          />
                        )}
                        <YStack flex={1}>
                          <Text fontWeight="700" color="$orange12" numberOfLines={2}>
                            {getProductName(item)}
                          </Text>
                          {getSubProductLabel(item) && (
                            <Text fontSize="$2" fontWeight="600" color="$orange10" numberOfLines={1}>
                              {getSubProductLabel(item)}
                            </Text>
                          )}
                          <Text fontSize="$2" color="$orange11">
                            Shop: {item.shop?.name || 'Unknown Shop'}
                          </Text>
                          <Text fontSize="$2" color="$orange11">
                            Unit: {item.unitOfMeasure?.name || item.unitOfMeasure?.symbol || 'unit'}
                          </Text>
                          <XStack justifyContent="space-between" marginTop="$2">
                            <Text fontWeight="700" color="$orange10">
                              {formatMoney(item.unitPrice)}
                            </Text>
                            <Text fontSize="$2" color="$orange10">
                              x{item.quantity || 0}
                            </Text>
                          </XStack>
                        </YStack>
                      </XStack>
                      
                      {/* Item Status */}
                      <XStack justifyContent="space-between" alignItems="center">
                        <XStack
                          backgroundColor={getItemStatusColor(item.itemSaleStatus || 'PENDING')}
                          paddingHorizontal="$2"
                          paddingVertical="$1"
                          borderRadius="$2"
                        >
                          <Text color="white" fontSize="$1" fontWeight="700">
                            {getItemStatusText(item.itemSaleStatus || 'PENDING')}
                          </Text>
                        </XStack>
                        <Text fontWeight="600" color="$orange12">
                          {formatMoney(item.totalPrice)}
                        </Text>
                      </XStack>
                      
                      {/* Batch Allocation Status */}
                      <YStack space="$2">
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text fontSize="$2" color="$orange11" fontWeight="600">
                            Batch Allocation:
                          </Text>
                          <Text fontSize="$2" color={isFullyAllocated ? "$green10" : "$orange10"}>
                            {totalSelected}/{item.quantity} units allocated
                          </Text>
                        </XStack>
                        
                        {/* Selected Batches */}
                        {selectedBatchesForItem.length > 0 && (
                          <YStack space="$1">
                            {selectedBatchesForItem.map((batch, idx) => (
                              <XStack key={idx} justifyContent="space-between" alignItems="center">
                                <Text fontSize="$1" color="$blue10">
                                  Batch {batch.batchId.slice(-6)}
                                </Text>
                                <XStack alignItems="center" space="$2">
                                  <Text fontSize="$1" color="$orange10">
                                    {batch.quantity} units
                                  </Text>
                                  <Button
                                    size="$1"
                                    backgroundColor="$red3"
                                    onPress={() => handleRemoveBatch(batch.batchId)}
                                  >
                                    <Text fontSize="$1" color="$red11">Remove</Text>
                                  </Button>
                                </XStack>
                              </XStack>
                            ))}
                          </YStack>
                        )}
                        
                        {/* Allocate Batch Button */}
                        {item.itemSaleStatus === 'PENDING' && (
                          <XStack space="$2">
                            <Button
                              flex={1}
                              size="$2"
                              backgroundColor="$blue3"
                              borderColor="$blue6"
                              onPress={() => handleOpenBatchModal(item)}
                            >
                              <Text color="$blue11" fontSize="$2">
                                {selectedBatchesForItem.length > 0 ? 'Add More Batches' : 'Allocate Batches'}
                              </Text>
                            </Button>
                            {selectedBatchesForItem.length > 0 && (
                              <Button
                                size="$2"
                                backgroundColor="$red3"
                                borderColor="$red6"
                                onPress={() => handleClearItemBatches(item.id)}
                              >
                                <Text color="$red11" fontSize="$2">Clear</Text>
                              </Button>
                            )}
                          </XStack>
                        )}
                      </YStack>
                    </YStack>
                  </Card>
                );
              })}
            </YStack>
          </Card>

          {/* Totals */}
          <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$4" borderRadius="$4">
            <YStack space="$2">
              <XStack justifyContent="space-between">
                <Text color="$orange11">Subtotal:</Text>
                <Text color="$orange12">{formatMoney(sell.subTotal)}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$orange11">Discount:</Text>
                <Text color="$red10">-{formatMoney(sell.discount)}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$orange11">VAT:</Text>
                <Text color="$orange12">{formatMoney(sell.vat)}</Text>
              </XStack>
              <XStack justifyContent="space-between" borderTopWidth={1} borderTopColor="$orange4" paddingTop="$2">
                <Text fontWeight="700" color="$orange12" fontSize="$5">Grand Total:</Text>
                <Text fontWeight="700" color="$orange10" fontSize="$5">
                  {formatMoney(sell.grandTotal)}
                </Text>
              </XStack>
              {sell.NetTotal != null && (
                <XStack justifyContent="space-between">
                  <Text color="$orange11">Net Total:</Text>
                  <Text color="$orange12">{formatMoney(sell.NetTotal)}</Text>
                </XStack>
              )}
            </YStack>
          </Card>

          {/* Delivery Action */}
       {(sell.saleStatus === 'APPROVED' || sell.saleStatus === 'PARTIALLY_DELIVERED') && 
 sell.items?.some(item => item.itemSaleStatus === 'PENDING') && (
  <Card backgroundColor="$orange2" borderColor="$orange5" borderWidth={1} padding="$4" borderRadius="$4">
    <YStack space="$3" alignItems="center">
      <H4 color="$orange12">
        {sell.saleStatus === 'PARTIALLY_DELIVERED' ? 'Continue Delivery' : 'Ready for Delivery'}
      </H4>
      <Text color="$orange11" textAlign="center">
        {sell.saleStatus === 'PARTIALLY_DELIVERED'
          ? 'Some items are still pending. Allocate remaining batches and submit for delivery.'
          : 'Allocate batches for all items, then submit for delivery.'}
      </Text>
      <Button
        size="$4"
        backgroundColor="$orange9"
        borderColor="$orange9"
        borderWidth={1}
        borderRadius="$4"
        pressStyle={{ backgroundColor: "$orange10" }}
        onPress={handleSubmitDelivery}
        disabled={deliveryProcessing}
        opacity={deliveryProcessing ? 0.7 : 1}
      >
        {deliveryProcessing ? (
          <Spinner size="small" color="white" />
        ) : (
          <Text color="white" fontWeight="700" fontSize="$4">
            {sell.saleStatus === 'PARTIALLY_DELIVERED' ? 'Continue Delivery' : 'Submit Delivery'}
          </Text>
        )}
      </Button>
    </YStack>
  </Card>
)}

          {/* Action Buttons */}
          <XStack space="$3">
            <Button
              flex={1}
              backgroundColor="$orange3"
              borderColor="$orange6"
              borderWidth={1}
              borderRadius="$4"
              onPress={handleGoBack}
            >
              <Text color="$orange11" fontWeight="600">Back to List</Text>
            </Button>
            
            <Button
              flex={1}
              backgroundColor="$orange9"
              borderColor="$orange10"
              borderWidth={1}
              borderRadius="$4"
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Spinner size="small" color="white" />
              ) : (
                <Text color="white" fontWeight="600">Refresh</Text>
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
              backgroundColor="rgba(0,0,0,0.5)" 
              justifyContent="flex-end"
            >
              <TouchableWithoutFeedback>
                <YStack 
                  backgroundColor="$orange1" 
                  borderTopLeftRadius="$4" 
                  borderTopRightRadius="$4" 
                  padding="$4"
                  maxHeight="85%"
                  borderWidth={1}
                  borderColor="$orange4"
                >
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <YStack space="$4">
                      <XStack justifyContent="space-between" alignItems="center">
                        <H4 color="$orange12">Available Batches</H4>
                        <Button
                          size="$2"
                          circular
                          backgroundColor="$orange3"
                          onPress={() => {
                            Keyboard.dismiss();
                            setShowBatchModal(false);
                          }}
                        >
                          <Text color="$orange11">✕</Text>
                        </Button>
                      </XStack>
                      
                      {/* Product Information with Image */}
                      {activeItem && (
                        <Card backgroundColor="$orange2" borderColor="$orange5" borderWidth={1} padding="$3" borderRadius="$3">
                          <XStack space="$3" alignItems="center">
                            {getProductImageUrl && (
                              <Image
                                source={{ uri: getProductImageUrl }}
                                width={60}
                                height={60}
                                borderRadius="$2"
                                resizeMode="cover"
                                backgroundColor="$orange2"
                              />
                            )}
                            <YStack flex={1}>
                              <Text fontWeight="700" color="$orange12" numberOfLines={2}>
                                {getProductName(activeItem)}
                                {getSubProductLabel(activeItem) ? ` — ${getSubProductLabel(activeItem)}` : ''}
                              </Text>
                              {activeItem.shop?.name ? (
                                <Text fontSize="$2" color="$orange11" numberOfLines={1}>
                                  Shop: {activeItem.shop.name}
                                </Text>
                              ) : null}
                              <XStack justifyContent="space-between" marginTop="$1">
                                <Text fontSize="$2" color="$orange11">
                                  Needed: {activeItem.quantity} units
                                </Text>
                                <Text fontSize="$2" color="$orange10" fontWeight="600">
                                  Remaining: {getRemainingQuantityNeeded} units
                                </Text>
                              </XStack>
                            </YStack>
                          </XStack>
                        </Card>
                      )}
                      
                      {batchesLoading ? (
                        <YStack alignItems="center" padding="$8">
                          <Spinner size="large" color="$orange9" />
                          <Text marginTop="$4" color="$orange11">
                            Loading available batches...
                          </Text>
                        </YStack>
                      ) : batchesError ? (
                        <Card backgroundColor="$red2" padding="$4" borderRadius="$4">
                          <Text color="$red11" textAlign="center">
                            Error loading batches: {batchesError.message}
                          </Text>
                        </Card>
                      ) : availableBatches.length === 0 ? (
                        <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                          <Text color="$orange11" textAlign="center">
                            No batches available for this product in the selected shop.
                          </Text>
                        </Card>
                      ) : (
                        <YStack space="$3">
                          {availableBatches.map((batch) => {
  const selected = activeItem && getSelectedBatchesForItem(activeItem.id)
    .some(b => b.batchId === batch.id);
  const availableQuantity = getAvailableQuantityForBatch(batch);
  const enteredQuantity = parseInt(batchQuantities[batch.id] || '0');
  const isQuantityValid = isValidQuantity(batch.id, enteredQuantity);
  const remainingNeeded = getRemainingQuantityNeeded;
  
  // Check if entered quantity exceeds remaining needed
  const exceedsRemaining = enteredQuantity > remainingNeeded;
  
  return (
    <Card key={batch.id} backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$3" borderRadius="$3">
      <YStack space="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text fontWeight="700" color="$orange12">
              Batch #{batch.batchNumber || batch.id.slice(-6)}
            </Text>
            <Text fontSize="$2" color="$orange10">
              Expiry: {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
            </Text>
          </YStack>
          <Text fontWeight="600" color={availableQuantity > 0 ? "$green10" : "$red10"}>
            {availableQuantity} available
          </Text>
        </XStack>
        
        {selected ? (
          <Card backgroundColor="$green1" padding="$2" borderRadius="$2">
            <Text color="$green11" fontSize="$2" textAlign="center" fontWeight="600">
              ✓ Selected for allocation
            </Text>
          </Card>
        ) : availableQuantity > 0 ? (
          <YStack space="$2">
            {/* Manual Quantity Input with red styling when exceeding */}
            <YStack space="$1">
              <Input
                placeholder={`Enter quantity (max: ${availableQuantity})`}
                value={batchQuantities[batch.id] || ''}
                onChangeText={(value) => handleBatchQuantityChange(batch.id, value)}
                keyboardType="numeric"
                borderColor={
                  exceedsRemaining ? "$red8" : 
                  (isQuantityValid || enteredQuantity === 0) ? "$orange5" : "$red5"
                }
                backgroundColor={exceedsRemaining ? "$red1" : "$orange1"}
                color={exceedsRemaining ? "$red12" : "$orange12"}
                borderWidth={exceedsRemaining ? 2 : 1}
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
              {exceedsRemaining && (
                <Text fontSize="$1" color="$red10" fontWeight="600">
                  ⚠️ Exceeds remaining needed by {enteredQuantity - remainingNeeded} units
                </Text>
              )}
              
              {/* Allocate button with conditional styling */}
              <Button
                backgroundColor={
                  exceedsRemaining ? "$red8" : 
                  enteredQuantity > 0 && isQuantityValid ? "$blue8" : "$gray8"
                }
                color="white"
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
                {exceedsRemaining ? "Exceeds Allocation" : "Allocate"}
              </Button>
            </YStack>
            
           
            
            {/* Quick Action Button for remaining needed */}
            {availableQuantity >= remainingNeeded && remainingNeeded > 0 && (
              <Button
                backgroundColor="$purple3"
                borderColor="$purple6"
                onPress={() => handleAssignAllRemaining(batch)}
              >
                <Text color="$purple11" fontWeight="600">
                  Assign All Remaining Needed 
                </Text>
              </Button>
            )}
          </YStack>
        ) : (
          <Card backgroundColor="$red1" padding="$2" borderRadius="$2">
            <Text color="$red11" fontSize="$2" textAlign="center">
              No stock available
            </Text>
          </Card>
        )}
      </YStack>
    </Card>
  );
})}
                        </YStack>
                      )}
                      
                      <Button
                        backgroundColor="$orange3"
                        borderColor="$orange6"
                        borderWidth={1}
                        borderRadius="$4"
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowBatchModal(false);
                        }}
                      >
                        <Text color="$orange11" fontWeight="600">Close</Text>
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
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} borderRadius="$4" padding="$4" width="85%" maxWidth={400}>
                <YStack space="$3">
                  <H4 color="$orange12">Confirm Delivery</H4>
                  <Text color="$orange11">
                    Are you sure you want to submit this delivery? This action cannot be undone.
                  </Text>
                  {/* Items included in this delivery */}
                  <YStack space="$1">
                    {sell.items
                      ?.filter(item => getTotalSelectedQuantity(item.id) > 0)
                      .map(item => {
                        const subLabel = getSubProductLabel(item);
                        return (
                          <XStack key={item.id} justifyContent="space-between" space="$2">
                            <Text flex={1} fontSize="$2" color="$orange12" numberOfLines={2}>
                              {getProductName(item)}
                              {subLabel ? ` — ${subLabel}` : ''}
                            </Text>
                            <Text fontSize="$2" fontWeight="600" color="$orange10">
                              {getTotalSelectedQuantity(item.id)}/{item.quantity}
                            </Text>
                          </XStack>
                        );
                      })}
                  </YStack>
                  <XStack space="$3" marginTop="$4">
                    <Button
                      flex={1}
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      onPress={closeConfirmModal}
                      disabled={deliveryProcessing}
                    >
                      <Text color="$orange11">Cancel</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange9"
                      borderColor="$orange9"
                      pressStyle={{ backgroundColor: "$orange10" }}
                      onPress={confirmDelivery}
                      disabled={deliveryProcessing}
                      opacity={deliveryProcessing ? 0.7 : 1}
                    >
                      {deliveryProcessing ? (
                        <Spinner size="small" color="white" />
                      ) : (
                        <Text color="white" fontWeight="600">Confirm</Text>
                      )}
                    </Button>
                  </XStack>
                </YStack>
              </Card>
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
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <Card backgroundColor="$green1" borderColor="$green4" borderWidth={1} padding="$4" width="85%" maxWidth={400}>
                <YStack space="$3" alignItems="center">
                  <H4 color="$green12">Delivery Successful! 🎉</H4>
                  <Text color="$green11" textAlign="center">
                    The delivery has been processed successfully.
                  </Text>
                  <Button
                    backgroundColor="$green9"
                    borderColor="$green10"
                    onPress={() => {
                      setShowSuccessModal(false);
                      setDeliverySuccess(false);
                    }}
                    marginTop="$4"
                  >
                    <Text color="white" fontWeight="600">Continue</Text>
                  </Button>
                </YStack>
              </Card>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </YStack>
  );
}