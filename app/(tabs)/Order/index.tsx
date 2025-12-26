import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
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
} from 'tamagui';
import type { AppDispatch } from '@/(redux)/store';
import { useFocusEffect, useRouter } from 'expo-router';

// Redux imports
import {
  fetchUserSells,
  updateFilters,
  clearFilters,
  selectUserSells,
  selectUserSellsLoading,
  selectUserSellsError,
  selectUserSellsCount,
  selectUserSellsFilters,
} from '@/(redux)/sell';

// Import the actual Sell type from your API
import type { Sell, SellItem, SellItemBatch } from '@/(utils)/types';
import api from '@/(utils)/config';

// const BACKEND_URL = "https://ordere.net";

// Add lock/unlock API function
const toggleSellLock = async (id: string, lock: boolean): Promise<void> => {
  try {
    const response = await api.patch(
      `/sells/With/Lock/${id}`,
      { locked: lock } // Send the lock status in request body
    );
    
    // With axios, we check response status instead of response.ok
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to ${lock ? 'lock' : 'unlock'} sell`);
    }

    return response.data; // Use response.data instead of response.json()
  } catch (error) {
    // Something else happened
    throw error;
  }
};

// Confirmation Modal Component
const ConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'danger': return '$red2';
      case 'info': return '$blue2';
      default: return '$orange2';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'danger': return '$red6';
      case 'info': return '$blue6';
      default: return '$orange6';
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'danger': return '$red9';
      case 'info': return '$blue9';
      default: return '$orange9';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <YStack 
          flex={1} 
          justifyContent="center" 
          alignItems="center" 
          backgroundColor="rgba(0,0,0,0.5)"
          padding="$4"
        >
          <TouchableWithoutFeedback>
            <YStack 
              backgroundColor={getBackgroundColor()} 
              borderRadius="$4" 
              padding="$4" 
              width="100%"
              maxWidth={400}
              borderWidth={2}
              borderColor={getBorderColor()}
            >
              <YStack space="$4">
                <H4 textAlign="center" color="$orange12">
                  {title}
                </H4>
                
                <Text fontSize="$4" textAlign="center" color="$orange11">
                  {message}
                </Text>

                <XStack space="$3" marginTop="$2">
                  <Button
                    flex={1}
                    backgroundColor="$orange3"
                    borderColor="$orange6"
                    borderWidth={1}
                    borderRadius="$4"
                    onPress={onClose}
                    pressStyle={{ backgroundColor: "$orange4" }}
                  >
                    <Text color="$orange11" fontWeight="600">{cancelText}</Text>
                  </Button>
                  <Button
                    flex={1}
                    backgroundColor={getConfirmButtonColor()}
                    borderColor="$orange10"
                    borderWidth={1}
                    borderRadius="$4"
                    pressStyle={{ opacity: 0.8 }}
                    onPress={onConfirm}
                  >
                    <Text color="white" fontWeight="600">{confirmText}</Text>
                  </Button>
                </XStack>
              </YStack>
            </YStack>
          </TouchableWithoutFeedback>
        </YStack>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
// Date utility functions
const formatDateForBackend = (date: Date): string => {
  // Format: YYYY-MM-DD (ISO 8601 format - professional standard for APIs)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDatePresets = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const last3Days = new Date(today);
  last3Days.setDate(today.getDate() - 3);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);
  
  const last3Months = new Date(today);
  last3Months.setMonth(today.getMonth() - 3);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return {
    today: formatDateForBackend(today),
    yesterday: formatDateForBackend(yesterday),
    last3Days: formatDateForBackend(last3Days),
    lastWeek: formatDateForBackend(lastWeek),
    lastMonth: formatDateForBackend(lastMonth),
    last3Months: formatDateForBackend(last3Months),
    startOfMonth: formatDateForBackend(startOfMonth),
    startOfYear: formatDateForBackend(startOfYear),
    current: formatDateForBackend(today),
  };
};



// Enhanced Date Input Component with Validation
const DateInput = ({ 
  value, 
  onDateChange, 
  placeholder 
}: { 
  value?: string;
  onDateChange: (date: string) => void;
  placeholder: string;
}) => {
  const [tempValue, setTempValue] = useState(value || '');
  const [showManualInput, setShowManualInput] = useState(false);

  const validateDate = (dateString: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleDateChange = (text: string) => {
    setTempValue(text);
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const showDateInput = () => {
    setShowManualInput(true);
    setTempValue(value || '');
  };

  const handleCancel = () => {
    setShowManualInput(false);
    setTempValue(value || '');
  };

  const handleConfirm = () => {
    if (validateDate(tempValue)) {
      onDateChange(tempValue);
      setShowManualInput(false);
    } else {
      Alert.alert('Invalid Date', 'Please use format: YYYY-MM-DD (e.g., 2024-01-15)');
    }
  };

  return (
    <YStack>
      <Button
        onPress={showDateInput}
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
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Text color="$orange8" fontSize="$2">📅</Text>
      </Button>

      {showManualInput && (
        <Modal
          visible={showManualInput}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCancel}
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
                >
                  <YStack space="$4">
                    <H4 textAlign="center" color="$orange12">
                      Enter Date
                    </H4>

                    <Fieldset>
                      <Label htmlFor="dateInput" fontSize="$4" fontWeight="600" color="$orange12">
                        Date (YYYY-MM-DD)
                      </Label>
                      <Input
                        id="dateInput"
                        value={tempValue}
                        onChangeText={handleDateChange}
                        placeholder="2024-01-15"
                        keyboardType="numbers-and-punctuation"
                        borderColor="$orange5"
                        backgroundColor="white"
                        fontSize="$5"
                        fontWeight="600"
                        textAlign="center"
                      />
                    </Fieldset>

                    <Text fontSize="$2" color="$orange10" textAlign="center">
                      Format: YYYY-MM-DD (e.g., 2024-01-15)
                    </Text>

                    {tempValue && !validateDate(tempValue) && (
                      <Text fontSize="$2" color="$red10" textAlign="center">
                        ❌ Invalid date format
                      </Text>
                    )}

                    {tempValue && validateDate(tempValue) && (
                      <Card backgroundColor="$green1" padding="$2" borderRadius="$2">
                        <Text fontSize="$2" color="$green10" textAlign="center" fontWeight="600">
                          ✅ {formatDisplayDate(tempValue)}
                        </Text>
                      </Card>
                    )}

                    <XStack space="$3" marginTop="$2">
                      <Button
                        flex={1}
                        backgroundColor="$orange3"
                        borderColor="$orange6"
                        borderWidth={1}
                        borderRadius="$4"
                        onPress={handleCancel}
                      >
                        <Text color="$orange11" fontWeight="600">Cancel</Text>
                      </Button>
                      <Button
                        flex={1}
                        backgroundColor="$orange9"
                        borderColor="$orange10"
                        borderWidth={1}
                        borderRadius="$4"
                        onPress={handleConfirm}
                        disabled={!validateDate(tempValue)}
                      >
                        <Text color="white" fontWeight="600">Confirm</Text>
                      </Button>
                    </XStack>
                  </YStack>
                </YStack>
              </TouchableWithoutFeedback>
            </YStack>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </YStack>
  );
};

// Enhanced Date Filter Modal with Quick Presets
const DateFilterModal = ({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
}: {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: { startDate?: string; endDate?: string }) => void;
  currentFilters: { startDate?: string; endDate?: string };
}) => {
  const [startDate, setStartDate] = useState<string>(currentFilters.startDate || '');
  const [endDate, setEndDate] = useState<string>(currentFilters.endDate || '');
  const datePresets = getDatePresets();

  const handleApply = () => {
    // Validate date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        Alert.alert('Invalid Date Range', 'Start date cannot be after end date');
        return;
      }
    }

    onApplyFilters({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onApplyFilters({});
    onClose();
  };

  const applyQuickFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'Not selected';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getQuickFilterButtons = () => [
    { 
      label: '📅 Last 3 Days', 
      onPress: () => applyQuickFilter(datePresets.last3Days, datePresets.current),
      description: 'Last 3 days including today'
    },
    { 
      label: '📅 Last Week', 
      onPress: () => applyQuickFilter(datePresets.lastWeek, datePresets.current),
      description: 'Last 7 days including today'
    },
    { 
      label: '📅 Last Month', 
      onPress: () => applyQuickFilter(datePresets.lastMonth, datePresets.current),
      description: 'Last 30 days including today'
    },
    { 
      label: '📅 Last 3 Months', 
      onPress: () => applyQuickFilter(datePresets.last3Months, datePresets.current),
      description: 'Last 90 days including today'
    },
    { 
      label: '📅 This Month', 
      onPress: () => applyQuickFilter(datePresets.startOfMonth, datePresets.current),
      description: 'From start of month to today'
    },
    { 
      label: '📅 This Year', 
      onPress: () => applyQuickFilter(datePresets.startOfYear, datePresets.current),
      description: 'From start of year to today'
    },
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
                    Filter by Date Range
                  </H4>

                  {/* Quick Date Presets */}
                  <YStack space="$3">
                    <Text fontSize="$4" fontWeight="600" color="$orange11" textAlign="center">
                      Quick Filters
                    </Text>
                    <YStack space="$2">
                      {getQuickFilterButtons().map((filter, index) => (
                        <Button
                          key={index}
                          onPress={filter.onPress}
                          backgroundColor="$blue3"
                          borderColor="$blue6"
                          borderWidth={1}
                          borderRadius="$3"
                          pressStyle={{ backgroundColor: "$blue4" }}
                        >
                          <YStack alignItems="center" width="100%">
                            <Text color="$blue11" fontWeight="600" fontSize="$3">
                              {filter.label}
                            </Text>
                            <Text color="$blue9" fontSize="$1" textAlign="center">
                              {filter.description}
                            </Text>
                          </YStack>
                        </Button>
                      ))}
                    </YStack>
                  </YStack>

                  {/* Custom Date Range */}
                  <YStack space="$3">
                    <Text fontSize="$4" fontWeight="600" color="$orange11" textAlign="center">
                      Custom Date Range
                    </Text>
                    
                    <Fieldset>
                      <Label htmlFor="startDate" fontSize="$4" fontWeight="600" color="$orange12">
                        Start Date
                      </Label>
                      <DateInput
                        value={startDate}
                        onDateChange={setStartDate}
                        placeholder="Select start date"
                      />
                      {startDate && (
                        <Text fontSize="$2" color="$orange10" marginTop="$1">
                          Selected: {formatDisplayDate(startDate)}
                        </Text>
                      )}
                    </Fieldset>

                    <Fieldset>
                      <Label htmlFor="endDate" fontSize="$4" fontWeight="600" color="$orange12">
                        End Date
                      </Label>
                      <DateInput
                        value={endDate}
                        onDateChange={setEndDate}
                        placeholder="Select end date"
                      />
                      {endDate && (
                        <Text fontSize="$2" color="$orange10" marginTop="$1">
                          Selected: {formatDisplayDate(endDate)}
                        </Text>
                      )}
                    </Fieldset>

                    {/* Date Range Summary */}
                    {startDate && endDate && (
                      <Card backgroundColor="$orange2" padding="$3" borderRadius="$3">
                        <Text fontSize="$3" fontWeight="600" color="$orange12" textAlign="center">
                          📅 {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
                        </Text>
                      </Card>
                    )}
                  </YStack>

                  <XStack space="$3" marginTop="$2">
                    <Button
                      flex={1}
                      backgroundColor="$orange3"
                      borderColor="$orange6"
                      borderWidth={1}
                      borderRadius="$4"
                      onPress={handleClear}
                      pressStyle={{ backgroundColor: "$orange4" }}
                    >
                      <Text color="$orange11" fontWeight="600">Clear All</Text>
                    </Button>
                    <Button
                      flex={1}
                      backgroundColor="$orange9"
                      borderColor="$orange10"
                      borderWidth={1}
                      borderRadius="$4"
                      pressStyle={{ backgroundColor: "$orange10" }}
                      onPress={handleApply}
                      disabled={!startDate && !endDate}
                    >
                      <Text color="white" fontWeight="600">
                        {startDate && endDate ? 'Apply Filters' : 'Select Dates'}
                      </Text>
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
const BatchDetails = ({ batches }: { batches: SellItemBatch[] }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!batches || batches.length === 0) {
    return null;
  }

  return (
    <YStack>
      <Button
        size="$1"
        backgroundColor="$blue3"
        borderColor="$blue6"
        borderWidth={1}
        borderRadius="$2"
        onPress={() => setShowDetails(!showDetails)}
        alignSelf="flex-start"
      >
        <Text color="$blue11" fontSize="$1" fontWeight="600">
          📦 {batches.length} batch{batches.length > 1 ? 'es' : ''}
        </Text>
      </Button>

      {showDetails && (
        <YStack marginTop="$2" space="$1">
          {batches.map((batchItem, index) => (
            <Card key={batchItem.id} backgroundColor="$blue1" padding="$2" borderRadius="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  <Text fontSize="$1" fontWeight="600" color="$blue12">
                    Batch #{batchItem.batch?.batchNumber || batchItem.batchId?.slice(-6) || 'N/A'}
                  </Text>
                  <Text fontSize="$1" color="$blue10">
                    Qty: {batchItem.quantity}
                  </Text>
                </YStack>
                {batchItem.batch?.expiryDate && (
                  <Text fontSize="$1" color="$blue10">
                    {new Date(batchItem.batch.expiryDate).toLocaleDateString()}
                  </Text>
                )}
              </XStack>
            </Card>
          ))}
        </YStack>
      )}
    </YStack>
  );
};
// Add missing SellDetailModal component (placeholder)
const SellDetailModal = ({
  sell,
  visible,
  onClose,
}: {
  sell: Sell;
  visible: boolean;
  onClose: () => void;
}) => {
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

  // SAFE Helper function to get product name from sell item
  const getProductName = (item: SellItem) => {
    return item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`;
  };

  // SAFE Helper function to get shop name
  const getShopName = (item: SellItem) => {
    return item?.shop?.name || 'Unknown Shop';
  };

  // SAFE Helper function to get unit of measure
  const getUnitOfMeasure = (item: SellItem) => {
    return item?.unitOfMeasure?.name || item?.unitOfMeasure?.symbol || 'unit';
  };

  // SAFE Helper function to get item batches
  const getItemBatches = (item: SellItem) => {
    return item?.batches || [];
  };

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
                <H4 color="$orange12">Order Details</H4>
                <Button
                  size="$2"
                  circular
                  backgroundColor="$orange3"
                  onPress={onClose}
                >
                  <Text color="$orange11">✕</Text>
                </Button>
              </XStack>

              {/* Order Summary */}
              <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                <YStack space="$3">
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Invoice No:</Text>
                    <Text color="$orange12">{sell.invoiceNo}</Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Date:</Text>
                    <Text color="$orange12">
                      {new Date(sell.saleDate).toLocaleDateString()}
                    </Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Status:</Text>
                    <YStack
                      backgroundColor={getStatusColor(sell.saleStatus)}
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius="$2"
                    >
                      <Text color="white" fontSize="$1" fontWeight="700">
                        {getStatusText(sell.saleStatus)}
                      </Text>
                    </YStack>
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
                    </XStack>
                  )}
                  <XStack justifyContent="space-between">
                    <Text fontWeight="600" color="$orange11">Total Products:</Text>
                    <Text color="$orange12">{sell.totalProducts}</Text>
                  </XStack>
                </YStack>
              </Card>

              {/* Items */}
              <YStack space="$3">
                <Text fontWeight="700" color="$orange12" fontSize="$5">
                  Items ({sell.items?.length || 0})
                </Text>
                {sell.items?.map((item, index) => (
                  <Card key={item?.id || index} backgroundColor="$orange2" padding="$3" borderRadius="$3">
                    <YStack space="$3">
                      {/* Item Header */}
                      <XStack justifyContent="space-between" alignItems="flex-start">
                        <YStack flex={1}>
                          <Text fontWeight="700" color="$orange12" numberOfLines={2}>
                            {getProductName(item)}
                          </Text>
                          <Text fontSize="$2" color="$orange10">
                            Shop: {getShopName(item)}
                          </Text>
                          <Text fontSize="$2" color="$orange10">
                            Unit: {getUnitOfMeasure(item)}
                          </Text>
                        </YStack>
                        <YStack alignItems="flex-end">
                          <Text fontWeight="700" color="$green10">
                            ${item?.unitPrice?.toFixed(2) || '0.00'}
                          </Text>
                          <Text fontSize="$2" color="$orange10">
                            x{item?.quantity || 0}
                          </Text>
                        </YStack>
                      </XStack>
                      
                      {/* Batch Details */}
                      {getItemBatches(item).length > 0 && (
                        <BatchDetails batches={getItemBatches(item)} />
                      )}
                      
                      {/* Item Footer */}
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack
                          backgroundColor={getItemStatusColor(item?.itemSaleStatus || 'PENDING')}
                          paddingHorizontal="$2"
                          paddingVertical="$1"
                          borderRadius="$2"
                        >
                          <Text color="white" fontSize="$1" fontWeight="700">
                            {getItemStatusText(item?.itemSaleStatus || 'PENDING')}
                          </Text>
                        </YStack>
                        <Text fontWeight="600" color="$orange12">
                          ${item?.totalPrice?.toFixed(2) || '0.00'}
                        </Text>
                      </XStack>
                    </YStack>
                  </Card>
                ))}
              </YStack>

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
                  {sell.NetTotal && (
                    <XStack justifyContent="space-between">
                      <Text color="$orange11">Net Total:</Text>
                      <Text color="$orange12">${sell.NetTotal.toFixed(2)}</Text>
                    </XStack>
                  )}
                </YStack>
              </Card>

              {sell.notes && (
                <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                  <YStack space="$2">
                    <Text fontWeight="600" color="$orange11">Notes:</Text>
                    <Text color="$orange12">{sell.notes}</Text>
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

// FIXED OrderScreen with lock/unlock functionality
export default function OrderScreen() { 
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const sells = useSelector(selectUserSells);
  const loading = useSelector(selectUserSellsLoading);
  const error = useSelector(selectUserSellsError);
  const totalCount = useSelector(selectUserSellsCount);
  const filters = useSelector(selectUserSellsFilters);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSell, setSelectedSell] = useState<Sell | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [sellToUnlock, setSellToUnlock] = useState<Sell | null>(null);
  const [processingLock, setProcessingLock] = useState<string | null>(null);
  const router = useRouter();

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || searchQuery || filters.startDate || filters.endDate || filters.customerName || filters.salesPersonName;

  // Build proper parameters for fetching sells - wrapped in useCallback
  const buildFetchParams = useCallback(() => {
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status || undefined,
      salesPersonName: filters.salesPersonName,
      customerName: filters.customerName,
    };

    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    return params;
  }, [filters]);

  // Load sells data
  useEffect(() => {
    console.log('🔄 Initial sales data load...');
    const params = buildFetchParams();
    dispatch(fetchUserSells(params));
  }, [dispatch, buildFetchParams]);

  // Refresh sells data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const params = buildFetchParams();
      dispatch(fetchUserSells(params));
    }, [dispatch, buildFetchParams])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const params = buildFetchParams();
    await dispatch(fetchUserSells(params));
    setRefreshing(false);
  };

  const handleApplyFilters = (newFilters: { startDate?: string; endDate?: string }) => {
    dispatch(updateFilters(newFilters));
  };

  // Handle customer name filter change
  const handleCustomerNameChange = (name: string) => {
    dispatch(updateFilters({ customerName: name || undefined }));
  };

  // Handle salesperson name filter change
  const handleSalesPersonNameChange = (name: string) => {
    dispatch(updateFilters({ salesPersonName: name || undefined }));
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    dispatch(updateFilters({ status: status === 'all' ? undefined : status as any }));
  };

  // FIXED: Properly reset all filters
  const handleResetAllFilters = () => {
    dispatch(clearFilters());
    setStatusFilter('all');
    setSearchQuery('');
    setShowFilterModal(false);
    
    Alert.alert('Filters Reset', 'All filters have been cleared');
  };

  const handleViewDetails = (sell: Sell) => {
    setSelectedSell(sell);
    setShowDetailModal(true);
  };

  // Lock/Unlock functionality
  const handleLockToggle = async (sell: Sell) => {
    if (sell.locked) {
      // Show confirmation before unlocking
      setSellToUnlock(sell);
      setShowConfirmationModal(true);
    } else {
      // Lock immediately
      await handleLockAction(sell.id, true);
    }
  };

  const handleConfirmUnlock = async () => {
    if (sellToUnlock) {
      await handleLockAction(sellToUnlock.id, false);
      setShowConfirmationModal(false);
      setSellToUnlock(null);
    }
  };

  const handleLockAction = async (id: string, lock: boolean) => {
    setProcessingLock(id);
    try {
      await toggleSellLock(id, lock);
      
      // Refresh the sells list to get updated data
      const params = buildFetchParams();
      await dispatch(fetchUserSells(params));
      
      Alert.alert(
        'Success',
        `Sell has been ${lock ? 'locked' : 'unlocked'} successfully`
      );
    } catch  {
      Alert.alert(
        'Error',
        `Failed to ${lock ? 'lock' : 'unlock'} sell. Please try again.`
      );
    } finally {
      setProcessingLock(null);
    }
  };

  const handleGoToDetailPage = (sell: Sell) => {
    router.push({
      pathname: '/(tabs)/Order/detail',
      params: { sellId: sell.id }
    });
  };

  // Format date range for display
  const formatDateRangeDisplay = () => {
    if (!filters.startDate && !filters.endDate) return null;
    
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    if (filters.startDate && filters.endDate) {
      return `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;
    } else if (filters.startDate) {
      return `From ${formatDate(filters.startDate)}`;
    } else if (filters.endDate) {
      return `Until ${formatDate(filters.endDate)}`;
    }
  };

  // SAFE Helper function to get product names for search and display
  const getProductNames = (sell: Sell) => {
    if (!sell.items || !Array.isArray(sell.items)) return '';
    return sell.items.map(item => {
      return item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`;
    }).join(' ');
  };

  // Filter sells based on status and search
  const filteredSells = sells.filter(sell => {
    const matchesStatus = statusFilter === 'all' || sell.saleStatus === statusFilter;
    const matchesSearch = searchQuery === '' || 
      sell.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sell.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProductNames(sell).toLowerCase().includes(searchQuery.toLowerCase()) ||
      sell.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sell.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group sells by date
  const sellsByDate = filteredSells.reduce((acc, sell) => {
    const date = new Date(sell.saleDate).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(sell);
    return acc;
  }, {} as Record<string, Sell[]>);

  // Custom Badge Component
  const Badge = ({ children, backgroundColor, ...props }: any) => (
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

  // SAFE Helper function to get product display names
  // const getProductDisplayNames = (sell: Sell) => {
  //   if (!sell.items || !Array.isArray(sell.items) || sell.items.length === 0) return 'No items';
    
  //   const productNames = sell.items.map(item => {
  //     return item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`;
  //   });
    
  //   if (productNames.length <= 2) {
  //     return productNames.join(', ');
  //   } else {
  //     return `${productNames.slice(0, 2).join(', ')} +${productNames.length - 2} more`;
  //   }
  // };

  // SAFE Helper function to check if any item has batches
  const hasBatches = (sell: Sell) => {
    return sell.items?.some(item => item?.batches && item.batches.length > 0) || false;
  };

  if (loading && !refreshing && sells.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Loading your sales...
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
                  📊 Orders
                </H3>
                
                {sells.length === 0 ? (
                  <YStack alignItems="center" space="$3" paddingVertical="$4">
                    <Text fontSize="$6" color="$orange9">📊</Text>
                    <Text fontSize="$5" fontWeight="600" color="$orange11" textAlign="center">
                      No sales found
                    </Text>
                    <Text fontSize="$3" color="$orange9" textAlign="center">
                      {filters.startDate || filters.endDate || filters.customerName || filters.salesPersonName || filters.status
                        ? (
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
                        ) 
                        : 'Your sales will appear here'
                      }
                    </Text>
                  </YStack>
                ) : (
                  <YStack space="$3" width="100%">
                    <XStack justifyContent="space-between" width="100%">
                      <Text fontSize="$4" fontWeight="600" color="$orange11">
                        Total Orders:
                      </Text>
                      <Text fontSize="$4" fontWeight="700" color="$orange12">
                        {totalCount}
                      </Text>
                    </XStack>
               
                    {filters.startDate || filters.endDate ? (
                      <Text fontSize="$2" color="$orange10" textAlign="center">
                        {formatDateRangeDisplay()}
                      </Text>
                    ) : null}
                  </YStack>
                )}
              </YStack>
            </Card.Header>
          </Card>

          {/* Filters */}
          {sells.length > 0 && (
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
                      Filters
                    </Text>
                    {hasActiveFilters && (
                      <Button
                        size="$2"
                        backgroundColor="$red3"
                        borderColor="$red6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={handleResetAllFilters}
                        pressStyle={{ backgroundColor: "$red4" }}
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
                      Search
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search by order ID, invoice, or product..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                    />
                  </Fieldset>

                  {/* Customer Name Filter */}
                  <Fieldset>
                    <Label htmlFor="customerName" fontSize="$3" fontWeight="600" color="$orange11">
                      Customer Name
                    </Label>
                    <Input
                      id="customerName"
                      placeholder="Filter by customer name..."
                      value={filters.customerName || ''}
                      onChangeText={handleCustomerNameChange}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                    />
                  </Fieldset>

                  {/* Salesperson Name Filter */}
                  <Fieldset>
                    <Label htmlFor="salesPersonName" fontSize="$3" fontWeight="600" color="$orange11">
                      Salesperson Name
                    </Label>
                    <Input
                      id="salesPersonName"
                      placeholder="Filter by salesperson name..."
                      value={filters.salesPersonName || ''}
                      onChangeText={handleSalesPersonNameChange}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                    />
                  </Fieldset>

                  {/* Status Filter */}
                  <Fieldset>
                    <Label htmlFor="status" fontSize="$3" fontWeight="600" color="$orange11">
                      Status
                    </Label>
                    <XStack space="$2" flexWrap="wrap">
                      {['all', 'DELIVERED', 'PARTIALLY_DELIVERED', 'APPROVED'].map((status) => (
                        <Button
                          key={status}
                          size="$2"
                          backgroundColor={statusFilter === status ? "$orange9" : "$orange3"}
                          borderColor="$orange6"
                          borderWidth={1}
                          borderRadius="$3"
                          onPress={() => handleStatusFilterChange(status)}
                          pressStyle={{ backgroundColor: statusFilter === status ? "$orange10" : "$orange4" }}
                        >
                          <Text 
                            color={statusFilter === status ? "white" : "$orange11"} 
                            fontWeight="600" 
                            fontSize="$2"
                          >
                            {status === 'all' ? 'All' : getStatusText(status)}
                          </Text>
                        </Button>
                      ))}
                    </XStack>
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
                      pressStyle={{ backgroundColor: "$orange4" }}
                    >
                      <Text color="$orange11" fontWeight="600">📅 Date Range</Text>
                    </Button>
                    <Button
                      backgroundColor="$red3"
                      borderColor="$red6"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={handleResetAllFilters}
                      pressStyle={{ backgroundColor: "$red4" }}
                    >
                      <Text color="$red11" fontWeight="600">🗑️ Clear All</Text>
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
                          {statusFilter !== 'all' && (
                            <Badge backgroundColor="$orange8" size="$1">
                              Status: {getStatusText(statusFilter)}
                            </Badge>
                          )}
                          {searchQuery && (
                            <Badge backgroundColor="$blue8" size="$1">
                              Search: {searchQuery}
                            </Badge>
                          )}
                          {filters.customerName && (
                            <Badge backgroundColor="$purple8" size="$1">
                              Customer: {filters.customerName}
                            </Badge>
                          )}
                          {filters.salesPersonName && (
                            <Badge backgroundColor="$teal8" size="$1">
                              Salesperson: {filters.salesPersonName}
                            </Badge>
                          )}
                          {filters.startDate && filters.endDate && (
                            <Badge backgroundColor="$green8" size="$1">
                              Date Range
                            </Badge>
                          )}
                        </XStack>
                      </YStack>
                    </Card>
                  )}
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Sales by Date */}
          {Object.entries(sellsByDate).map(([date, dateSells]) => (
            <YStack key={date} space="$3">
              {/* Date Header */}
              <XStack alignItems="center" space="$3" paddingHorizontal="$2">
                <Text fontSize="$5" fontWeight="700" color="$orange12">
                  📅 {date}
                </Text>
                <Badge backgroundColor="$orange9">
                  {dateSells.length} {dateSells.length === 1 ? 'sale' : 'sales'}
                </Badge>
              </XStack>

              {/* Sales for this date */}
              {dateSells.map((sell) => (
                <Card 
                  key={sell.id}
                  elevate 
                  bordered 
                  borderRadius="$4" 
                  backgroundColor="$orange1"
                  borderColor="$orange4"
                  shadowColor="$orange7"
                  onPress={() => handleViewDetails(sell)}
                >
                  <Card.Header padded>
                    <YStack space="$3">
                      {/* Sale Header */}
                      <XStack justifyContent="space-between" alignItems="flex-start">
                        <YStack flex={1} space="$1">
                          <Text fontSize="$4" fontWeight="700" color="$orange12">
                            {sell.invoiceNo}
                          </Text>
                      
                          <Text fontSize="$2" color="$orange10">
{new Date(sell.saleDate).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})} at {new Date(sell.saleDate).toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}                       </Text>
                          {/* Customer and Salesperson Info */}
                          {sell.customer?.name && (
                            <Text fontSize="$2" color="$orange9">
                              👤 Customer: {sell.customer.name}
                            </Text>
                          )}
                          {sell.createdBy?.name && (
                            <Text fontSize="$2" color="$orange9">
                              👨‍💼 Salesperson: {sell.createdBy.name}
                            </Text>
                          )}
                          {/* Lock Status Badge */}
                          {sell.locked && (
                            <Badge backgroundColor="$red9" marginTop="$1" size="$1">
                              🔒 Locked
                              {sell.lockedAt && (
                                <Text fontSize="$1" color="white" opacity={0.9}>
                                  {' '}({new Date(sell.lockedAt).toLocaleDateString()})
                                </Text>
                              )}
                            </Badge>
                          )}
                        </YStack>
                        <YStack alignItems="flex-end" space="$1">
                          <YStack
                            backgroundColor={getStatusColor(sell.saleStatus)}
                            paddingHorizontal="$2"
                            paddingVertical="$1"
                            borderRadius="$2"
                          >
                            <Text color="white" fontSize="$1" fontWeight="700">
                              {getStatusText(sell.saleStatus)}
                            </Text>
                          </YStack>
                          {hasBatches(sell) && (
                            <Badge backgroundColor="$blue9" size="$1">
                              📦 Batches
                            </Badge>
                          )}
                        </YStack>
                      </XStack>

                     

                      {/* Totals */}
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text fontSize="$3" fontWeight="600" color="$orange11">
                          Total:
                        </Text>
                        <Text fontSize="$4" fontWeight="800" color="$green10">
                          {sell.grandTotal?.toFixed(2) || '0.00'}
                        </Text>
                      </XStack>

                      {/* Action Buttons */}
                      <XStack space="$2">
                        {/* View Details Button */}
                        <Button
                          flex={1}
                          size="$2"
                          backgroundColor="$orange3"
                          borderColor="$orange6"
                          borderWidth={1}
                          borderRadius="$3"
                          onPress={() => handleViewDetails(sell)}
                          pressStyle={{ backgroundColor: "$orange4" }}
                        >
                          <Text color="$orange11" fontWeight="600" fontSize="$2">
                            👁️ View
                          </Text>
                        </Button>

                        {/* Lock/Unlock Button */}
                        <Button
                          flex={1}
                          size="$2"
                          backgroundColor={sell.locked ? "$green3" : "$red3"}
                          borderColor={sell.locked ? "$green6" : "$red6"}
                          borderWidth={1}
                          borderRadius="$3"
                          onPress={() => handleLockToggle(sell)}
                          pressStyle={{ 
                            backgroundColor: sell.locked ? "$green4" : "$red4" 
                          }}
                          disabled={processingLock === sell.id}
                        >
                          {processingLock === sell.id ? (
                            <Spinner size="small" color={sell.locked ? "$green11" : "$red11"} />
                          ) : (
                            <XStack alignItems="center" space="$1">
                              <Text>{sell.locked ? "🔓" : "🔒"}</Text>
                              <Text 
                                color={sell.locked ? "$green11" : "$red11"} 
                                fontWeight="600" 
                                fontSize="$2"
                              >
                                {sell.locked ? "Unlock" : "Lock"}
                              </Text>
                            </XStack>
                          )}
                        </Button>
                      </XStack>

                      {/* View Full Details Button */}
                      <Button
                        size="$2"
                        backgroundColor="$blue3"
                        borderColor="$blue6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={() => handleGoToDetailPage(sell)}
                        pressStyle={{ backgroundColor: "$blue4" }}
                      >
                        <XStack alignItems="center" space="$2">
                          <Text>📄</Text>
                          <Text color="$blue11" fontWeight="600" fontSize="$2">
                            View Full Details
                          </Text>
                        </XStack>
                      </Button>
                    </YStack>
                  </Card.Header>
                </Card>
              ))}
            </YStack>
          ))}
        </YStack>
      </ScrollView>

      {/* Updated Filter Modal with Quick Presets */}
      <DateFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Confirmation Modal for Unlock */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setSellToUnlock(null);
        }}
        onConfirm={handleConfirmUnlock}
        title="Confirm Unlock"
        message="Are you sure you want to unlock this sale? This will allow modifications to the order."
        confirmText="Yes, Unlock"
        cancelText="Cancel"
        type="warning"
      />

      {/* Detail Modal */}
      {selectedSell && (
        <SellDetailModal
          sell={selectedSell}
          visible={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSell(null);
          }}
        />
      )}
    </YStack>
  );
};