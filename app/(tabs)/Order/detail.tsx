import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import type { AppDispatch, RootState } from '@/(redux)/store';
import {
  fetchUserSellById,
  selectCurrentSell,
  selectCurrentSellLoading,
  selectCurrentSellError,
  clearCurrentSell,
} from '@/(redux)/sell';
import {
  fetchAvailableBatches,
  processPartialSaleDelivery,
  selectBatch,
  removeBatchSelection,
  clearItemBatchSelections,
  selectAvailableBatches,
  selectAvailableBatchesLoading,
  selectAvailableBatchesError,
  selectPartialDeliveryProcessing,
  selectPartialDeliverySuccess,
  selectPartialDeliveryError,
  clearAllDeliveryState,
  resetSuccessState,
} from '@/(redux)/delivery';
import type {  SellItem, ProductBatch } from '@/(utils)/types';

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

export default function SellDetailPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { sellId } = useLocalSearchParams<{ sellId: string }>();
  
  // Sell details state
  const sell = useSelector(selectCurrentSell);
  const loading = useSelector(selectCurrentSellLoading);
  const sellError = useSelector(selectCurrentSellError);
  
  // Delivery state
  const availableBatches = useSelector(selectAvailableBatches);
  const batchesLoading = useSelector(selectAvailableBatchesLoading);
  const batchesError = useSelector(selectAvailableBatchesError);
  const deliveryProcessing = useSelector(selectPartialDeliveryProcessing);
  const deliverySuccess = useSelector(selectPartialDeliverySuccess);
  const deliveryError = useSelector(selectPartialDeliveryError);
  
  // Get all selected batches once
  const selectedBatches = useSelector((state: RootState) => state.sellDelivery.selectedBatches);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeItem, setActiveItem] = useState<SellItem | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [batchQuantities, setBatchQuantities] = useState<Record<string, string>>({});

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
    if (!activeItem?.product?.imageUrl) return null;
    return normalizeImagePath(activeItem.product.imageUrl);
  }, [activeItem]);

  // Calculate available quantity considering already selected batches
  const getAvailableQuantityForBatch = useMemo(() => (batch: ProductBatch) => {
    if (!activeItem) return batch.stock || batch.quantity || batch.availableQuantity || 0;
    
    const batchStock = batch.stock || batch.quantity || batch.availableQuantity || 0;
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
    if (sellId) {
      dispatch(fetchUserSellById({ id: sellId }));
      dispatch(clearAllDeliveryState());
    }
  }, [dispatch, sellId]);

  useEffect(() => {
    if (sellError) {
      Alert.alert('Error', sellError);
    }
    if (deliveryError) {
      Alert.alert('Delivery Error', deliveryError);
    }
  }, [sellError, deliveryError]);

  useEffect(() => {
    if (deliverySuccess) {
      setShowSuccessModal(true);
      if (sellId) {
        dispatch(fetchUserSellById({ id: sellId }));
      }
    }
  }, [deliverySuccess, dispatch, sellId]);

  useEffect(() => {
    return () => {
      dispatch(clearCurrentSell());
      dispatch(clearAllDeliveryState());
    };
  }, [dispatch]);

  const handleRefresh = async () => {
    if (!sellId) return;
    setRefreshing(true);
    await dispatch(fetchUserSellById({ id: sellId }));
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
    
    setActiveItem(item);
    dispatch(fetchAvailableBatches({
      shopId: item.shopId!,
      productId: item.productId!,
    }));
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
    
    dispatch(selectBatch({
      itemId: activeItem.id,
      batchId: batch.id,
      quantity,
      maxQuantity: availableQuantity,
    }));
    
    // Clear input for this batch
    setBatchQuantities(prev => ({
      ...prev,
      [batch.id]: '',
    }));
  };

  // Handle assigning all available from this batch
  const handleAssignAllFromBatch = (batch: ProductBatch) => {
    if (!activeItem) return;
    
    const availableQuantity = getAvailableQuantityForBatch(batch);
    const remainingNeeded = getRemainingQuantityNeeded;
    
    if (availableQuantity <= 0) {
      Alert.alert('Error', 'This batch has no available stock');
      return;
    }
    
    // Calculate how much to assign (minimum of available and needed)
    const quantityToAssign = Math.min(availableQuantity, remainingNeeded);
    
    if (quantityToAssign <= 0) {
      Alert.alert('Info', 'Item is already fully allocated');
      return;
    }
    
    dispatch(selectBatch({
      itemId: activeItem.id,
      batchId: batch.id,
      quantity: quantityToAssign,
      maxQuantity: availableQuantity,
    }));
    
    // Clear any input for this batch
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
        dispatch(selectBatch({
          itemId: activeItem.id,
          batchId: batch.id,
          quantity: availableQuantity,
          maxQuantity: availableQuantity,
        }));
      }
      return;
    }
    
    dispatch(selectBatch({
      itemId: activeItem.id,
      batchId: batch.id,
      quantity: remainingNeeded,
      maxQuantity: availableQuantity,
    }));
    
    // Clear any input for this batch
    setBatchQuantities(prev => ({
      ...prev,
      [batch.id]: '',
    }));
  };

  const handleRemoveBatch = (batchId: string) => {
    if (!activeItem) return;
    dispatch(removeBatchSelection({
      itemId: activeItem.id,
      batchId,
    }));
  };

  const handleClearItemBatches = (itemId: string) => {
    dispatch(clearItemBatchSelections(itemId));
  };

  const prepareDeliveryData = () => {
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
    if (!sellId) return;
    
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
    if (!sellId) return;
    
    const deliveryData = prepareDeliveryData();
    if (!deliveryData) return;
    
    dispatch(processPartialSaleDelivery({
      id: sellId,
      deliveryData,
    }));
    setShowConfirmModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '$green9';
      case 'NOT_APPROVED': return '$orange9';
      case 'PARTIALLY_DELIVERED': return '$yellow9';
      case 'APPROVED': return '$blue9';
      case 'CANCELLED': return '$red9';
      default: return '$gray9';
    }
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

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '$green9';
      case 'PENDING': return '$orange9';
      default: return '$gray9';
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
        backgroundColor="$orange1" 
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
          <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
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
          <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
            <H4 color="$orange12" marginBottom="$3">Order Items</H4>
            <YStack space="$4">
              {sell.items?.map((item, index) => {
                const selectedBatchesForItem = getSelectedBatchesForItem(item.id);
                const totalSelected = getTotalSelectedQuantity(item.id);
                const isFullyAllocated = isItemFullyAllocated(item.id, item.quantity);
                
                return (
                  <Card key={item.id} backgroundColor="$orange1" padding="$3" borderRadius="$3">
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
                            {item.product?.name || `Product ${item.productId?.slice(-8) || 'Unknown'}`}
                          </Text>
                          <Text fontSize="$2" color="$orange10">
                            Shop: {item.shop?.name || 'Unknown Shop'}
                          </Text>
                          <Text fontSize="$2" color="$orange10">
                            Unit: {item.unitOfMeasure?.name || item.unitOfMeasure?.symbol || 'unit'}
                          </Text>
                          <XStack justifyContent="space-between" marginTop="$2">
                            <Text fontWeight="700" color="$green10">
                              ${item.unitPrice?.toFixed(2) || '0.00'}
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
                          ${item.totalPrice?.toFixed(2) || '0.00'}
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
          <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
            <YStack space="$2">
              <XStack justifyContent="space-between">
                <Text color="$orange11">Subtotal:</Text>
                <Text color="$orange12">${sell.subTotal?.toFixed(2) || '0.00'}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$orange11">Discount:</Text>
                <Text color="$red10">-${sell.discount?.toFixed(2) || '0.00'}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$orange11">VAT:</Text>
                <Text color="$orange12">${sell.vat?.toFixed(2) || '0.00'}</Text>
              </XStack>
              <XStack justifyContent="space-between" borderTopWidth={1} borderTopColor="$orange4" paddingTop="$2">
                <Text fontWeight="700" color="$orange12" fontSize="$5">Grand Total:</Text>
                <Text fontWeight="700" color="$green10" fontSize="$5">
                  ${sell.grandTotal?.toFixed(2) || '0.00'}
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Delivery Action */}
       {(sell.saleStatus === 'APPROVED' || sell.saleStatus === 'PARTIALLY_DELIVERED') && 
 sell.items?.some(item => item.itemSaleStatus === 'PENDING') && (
  <Card backgroundColor="$green2" padding="$4" borderRadius="$4">
    <YStack space="$3" alignItems="center">
      <H4 color="$green12">
        {sell.saleStatus === 'PARTIALLY_DELIVERED' ? 'Continue Delivery' : 'Ready for Delivery'}
      </H4>
      <Text color="$green11" textAlign="center">
        {sell.saleStatus === 'PARTIALLY_DELIVERED' 
          ? 'Some items are still pending. Allocate remaining batches and submit for delivery.'
          : 'Allocate batches for all items, then submit for delivery.'}
      </Text>
      <Button
        size="$4"
        backgroundColor="$green9"
        borderColor="$green10"
        borderWidth={1}
        borderRadius="$4"
        onPress={handleSubmitDelivery}
        disabled={deliveryProcessing}
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
                        <Card backgroundColor="$blue1" padding="$3" borderRadius="$3">
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
                              <Text fontWeight="700" color="$blue12" numberOfLines={2}>
                                {activeItem.product?.name || `Product ${activeItem.productId?.slice(-8) || 'Unknown'}`}
                              </Text>
                              <XStack justifyContent="space-between" marginTop="$1">
                                <Text fontSize="$2" color="$blue11">
                                  Needed: {activeItem.quantity} units
                                </Text>
                                <Text fontSize="$2" color="$blue11" fontWeight="600">
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
                            Error loading batches: {batchesError}
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
    <Card key={batch.id} backgroundColor="$orange2" padding="$3" borderRadius="$3">
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
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowConfirmModal(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback>
              <Card backgroundColor="$orange1" borderColor="$orange4" borderWidth={1} padding="$4" width="85%" maxWidth={400}>
                <YStack space="$3">
                  <H4 color="$orange12">Confirm Delivery</H4>
                  <Text color="$orange11">
                    Are you sure you want to submit this delivery? This action cannot be undone.
                  </Text>
                  <XStack space="$3" marginTop="$4">
                    <Button
                      flex={1}
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      onPress={() => setShowConfirmModal(false)}
                    >
                      <Text color="$orange11">Cancel</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$green9"
                      borderColor="$green10"
                      onPress={confirmDelivery}
                      disabled={deliveryProcessing}
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
                      dispatch(resetSuccessState());
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