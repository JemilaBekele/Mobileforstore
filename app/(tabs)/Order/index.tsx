import React, { useState, useCallback, useEffect, useRef } from 'react'; // Add useEffect and useRef
import {
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
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
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/(utils)/config';
import type { GetAllSellsUserParams, Sell, SellItem, SellItemBatch } from '@/(utils)/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { getAllSellsUser } from '@/(services)/api/sell';
import { formatMoney } from '@/(utils)/format';

// Presentation palette for this screen (white, black text, orange accent)
const C = {
  accent: '#FF6B00',
  accentTint: '#FFF7ED',
  text: '#111827',
  label: '#374151',
  muted: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#DC2626',
};

const softShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
} as const;

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

// Small light-orange pill used for counts and active-filter chips
const Badge = ({ children }: { children: React.ReactNode }) => (
  <YStack
    backgroundColor={C.accentTint}
    paddingHorizontal={8}
    paddingVertical={2}
    borderRadius={999}
    alignItems="center"
    justifyContent="center"
  >
    <Text fontSize={12} fontWeight="600" color="#C2410C">
      {children}
    </Text>
  </YStack>
);

const inputStyle = {
  backgroundColor: 'white',
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 10,
  color: C.text,
  placeholderTextColor: C.placeholder,
  focusStyle: { borderColor: C.accent },
} as const;

const secondaryButton = {
  backgroundColor: 'white',
  borderColor: C.border,
  borderWidth: 1,
  borderRadius: 10,
  pressStyle: { backgroundColor: '#F9FAFB', borderColor: C.border },
} as const;

const primaryButton = {
  backgroundColor: C.accent,
  borderWidth: 0,
  borderRadius: 10,
  pressStyle: { backgroundColor: '$orange10' },
} as const;

// "Sub name (CODE)" when the line is for a sub-product, otherwise null
const getSubProductLabel = (item?: SellItem | null): string | null => {
  const sub = item?.subProduct;
  if (!sub?.name) return null;
  return sub.subProductCode ? `${sub.name} (${sub.subProductCode})` : sub.name;
};

// Import the API function

// Add lock/unlock API function
const toggleSellLock = async (id: string, lock: boolean): Promise<void> => {
  try {
    const response = await api.patch(
      `/sells/With/Lock/${id}`,
      { locked: lock }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Failed to ${lock ? 'lock' : 'unlock'} sell`);
    }

    return response.data;
  } catch (error) {
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
  type = 'warning',
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
  const isDanger = type === 'danger';
  const iconName = isDanger ? 'alert-circle-outline' : type === 'info' ? 'information-circle-outline' : 'lock-open-outline';
  const iconColor = isDanger ? C.danger : C.accent;
  const iconBg = isDanger ? '#FEE2E2' : C.accentTint;

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
          backgroundColor="rgba(0,0,0,0.4)"
          padding="$4"
        >
          <TouchableWithoutFeedback>
            <YStack
              backgroundColor="white"
              borderRadius={16}
              padding={20}
              width="100%"
              maxWidth={400}
              borderWidth={1}
              borderColor={C.border}
            >
              <YStack gap={12} alignItems="center">
                <YStack
                  width={48}
                  height={48}
                  borderRadius={999}
                  backgroundColor={iconBg}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name={iconName} size={24} color={iconColor} />
                </YStack>
                <Text textAlign="center" color={C.text} fontSize={18} fontWeight="700">
                  {title}
                </Text>

                <Text fontSize={14} textAlign="center" color={C.muted}>
                  {message}
                </Text>

                <XStack gap={12} marginTop={4} width="100%">
                  <Button
                    flex={1}
                    {...secondaryButton}
                    onPress={onClose}
                  >
                    <Text color={C.text} fontWeight="600">{cancelText}</Text>
                  </Button>
                  <Button
                    flex={1}
                    {...primaryButton}
                    backgroundColor={isDanger ? C.danger : C.accent}
                    onPress={onConfirm}
                  >
                    <Text color="white" fontWeight="700">{confirmText}</Text>
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
      <XStack
        onPress={showDateInput}
        backgroundColor="white"
        borderColor={C.border}
        borderWidth={1}
        borderRadius={10}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        height={44}
        pressStyle={{ backgroundColor: '#F9FAFB' }}
        cursor="pointer"
      >
        <Text
          color={value ? C.text : C.placeholder}
          fontWeight="500"
          fontSize={14}
          numberOfLines={1}
          flex={1}
          textAlign="left"
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={C.muted} />
      </XStack>

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
                >
                  <YStack gap={12}>
                    <Text color={C.text} fontSize={18} fontWeight="700" textAlign="center">
                      Enter Date
                    </Text>

                    <Fieldset gap={6}>
                      <Label htmlFor="dateInput" fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
                        Date (YYYY-MM-DD)
                      </Label>
                      <Input
                        id="dateInput"
                        value={tempValue}
                        onChangeText={handleDateChange}
                        placeholder="2024-01-15"
                        keyboardType="numbers-and-punctuation"
                        {...inputStyle}
                        fontSize={16}
                        fontWeight="600"
                        textAlign="center"
                      />
                    </Fieldset>

                    <Text fontSize={12} color={C.muted} textAlign="center">
                      Format: YYYY-MM-DD (e.g., 2024-01-15)
                    </Text>

                    {tempValue && !validateDate(tempValue) ? (
                      <XStack alignItems="center" justifyContent="center" gap={6}>
                        <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
                        <Text fontSize={13} color={C.danger}>
                          Invalid date format
                        </Text>
                      </XStack>
                    ) : null}

                    {tempValue && validateDate(tempValue) ? (
                      <XStack
                        alignItems="center"
                        justifyContent="center"
                        gap={6}
                        backgroundColor={C.accentTint}
                        padding={8}
                        borderRadius={10}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={C.accent} />
                        <Text fontSize={13} color={C.text} fontWeight="600">
                          {formatDisplayDate(tempValue)}
                        </Text>
                      </XStack>
                    ) : null}

                    <XStack gap={12} marginTop={4}>
                      <Button
                        flex={1}
                        {...secondaryButton}
                        onPress={handleCancel}
                      >
                        <Text color={C.text} fontWeight="600">Cancel</Text>
                      </Button>
                      <Button
                        flex={1}
                        {...primaryButton}
                        onPress={handleConfirm}
                        disabled={!validateDate(tempValue)}
                        opacity={validateDate(tempValue) ? 1 : 0.5}
                      >
                        <Text color="white" fontWeight="700">Confirm</Text>
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
      label: 'Last 3 Days',
      start: datePresets.last3Days,
      onPress: () => applyQuickFilter(datePresets.last3Days, datePresets.current),
      description: 'Last 3 days including today'
    },
    {
      label: 'Last Week',
      start: datePresets.lastWeek,
      onPress: () => applyQuickFilter(datePresets.lastWeek, datePresets.current),
      description: 'Last 7 days including today'
    },
    {
      label: 'Last Month',
      start: datePresets.lastMonth,
      onPress: () => applyQuickFilter(datePresets.lastMonth, datePresets.current),
      description: 'Last 30 days including today'
    },
    {
      label: 'Last 3 Months',
      start: datePresets.last3Months,
      onPress: () => applyQuickFilter(datePresets.last3Months, datePresets.current),
      description: 'Last 90 days including today'
    },
    {
      label: 'This Month',
      start: datePresets.startOfMonth,
      onPress: () => applyQuickFilter(datePresets.startOfMonth, datePresets.current),
      description: 'From start of month to today'
    },
    {
      label: 'This Year',
      start: datePresets.startOfYear,
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
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text color={C.text} fontSize={18} fontWeight="700">
                      Filter by Date Range
                    </Text>
                    <Button
                      size="$2"
                      circular
                      chromeless
                      borderWidth={0}
                      onPress={onClose}
                      icon={<Ionicons name="close" size={20} color={C.muted} />}
                    />
                  </XStack>

                  {/* Quick Date Presets */}
                  <YStack gap={8}>
                    <Text fontSize={13} fontWeight="600" color={C.label}>
                      Quick Filters
                    </Text>
                    <XStack flexWrap="wrap" gap={8}>
                      {getQuickFilterButtons().map((filter, index) => {
                        const selected = startDate === filter.start && endDate === datePresets.current;
                        return (
                          <XStack
                            key={index}
                            onPress={filter.onPress}
                            backgroundColor={selected ? C.accentTint : 'white'}
                            borderColor={selected ? C.accent : C.border}
                            borderWidth={1}
                            borderRadius={999}
                            paddingHorizontal={12}
                            paddingVertical={8}
                            pressStyle={{ opacity: 0.8 }}
                            cursor="pointer"
                          >
                            <Text color={selected ? C.accent : C.text} fontWeight="600" fontSize={13}>
                              {filter.label}
                            </Text>
                          </XStack>
                        );
                      })}
                    </XStack>
                  </YStack>

                  {/* Custom Date Range */}
                  <YStack gap={12}>
                    <Text fontSize={13} fontWeight="600" color={C.label}>
                      Custom Date Range
                    </Text>

                    <Fieldset gap={6}>
                      <Label htmlFor="startDate" fontSize={13} fontWeight="500" color={C.muted} lineHeight={18}>
                        Start Date
                      </Label>
                      <DateInput
                        value={startDate}
                        onDateChange={setStartDate}
                        placeholder="Select start date"
                      />
                    </Fieldset>

                    <Fieldset gap={6}>
                      <Label htmlFor="endDate" fontSize={13} fontWeight="500" color={C.muted} lineHeight={18}>
                        End Date
                      </Label>
                      <DateInput
                        value={endDate}
                        onDateChange={setEndDate}
                        placeholder="Select end date"
                      />
                    </Fieldset>

                    {/* Date Range Summary */}
                    {startDate && endDate ? (
                      <XStack
                        alignItems="center"
                        justifyContent="center"
                        gap={6}
                        backgroundColor={C.accentTint}
                        padding={10}
                        borderRadius={10}
                      >
                        <Ionicons name="calendar-outline" size={16} color={C.accent} />
                        <Text fontSize={13} fontWeight="600" color={C.text}>
                          {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
                        </Text>
                      </XStack>
                    ) : null}
                  </YStack>

                  <XStack gap={12}>
                    <Button
                      flex={1}
                      {...secondaryButton}
                      onPress={handleClear}
                    >
                      <Text color={C.text} fontWeight="600">Clear All</Text>
                    </Button>
                    <Button
                      flex={1}
                      {...primaryButton}
                      onPress={handleApply}
                      disabled={!startDate && !endDate}
                      opacity={!startDate && !endDate ? 0.5 : 1}
                    >
                      <Text color="white" fontWeight="700">
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
      <XStack
        onPress={() => setShowDetails(!showDetails)}
        alignSelf="flex-start"
        alignItems="center"
        gap={4}
        paddingHorizontal={10}
        paddingVertical={4}
        borderRadius={999}
        borderWidth={1}
        borderColor={C.border}
        backgroundColor="white"
        pressStyle={{ backgroundColor: '#F9FAFB' }}
        cursor="pointer"
      >
        <Ionicons name="cube-outline" size={14} color={C.muted} />
        <Text color={C.label} fontSize={12} fontWeight="600">
          {batches.length} batch{batches.length > 1 ? 'es' : ''}
        </Text>
        <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
      </XStack>

      {showDetails && (
        <YStack marginTop={8} gap={6}>
          {batches.map((batchItem) => (
            <XStack
              key={batchItem.id}
              backgroundColor="#F9FAFB"
              borderWidth={1}
              borderColor={C.border}
              padding={8}
              borderRadius={8}
              justifyContent="space-between"
              alignItems="center"
            >
              <YStack flex={1}>
                <Text fontSize={12} fontWeight="600" color={C.text}>
                  Batch #{batchItem.batch?.batchNumber || batchItem.batchId?.slice(-6) || 'N/A'}
                </Text>
                <Text fontSize={12} color={C.muted}>
                  Qty: {batchItem.quantity}
                </Text>
              </YStack>
              {batchItem.batch?.expiryDate ? (
                <Text fontSize={12} color={C.muted}>
                  {new Date(batchItem.batch.expiryDate).toLocaleDateString()}
                </Text>
              ) : null}
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
};

const SellDetailModal = ({
  sell,
  visible,
  onClose,
}: {
  sell: Sell;
  visible: boolean;
  onClose: () => void;
}) => {
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

  const getProductName = (item: SellItem) => {
    return item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`;
  };

  const getShopName = (item: SellItem) => {
    return item?.shop?.name || 'Unknown Shop';
  };

  const getUnitOfMeasure = (item: SellItem) => {
    return item?.unitOfMeasure?.name || item?.unitOfMeasure?.symbol || 'unit';
  };

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
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={C.text} fontSize={20} fontWeight="700">Order Details</Text>
                <Button
                  size="$3"
                  circular
                  {...secondaryButton}
                  onPress={onClose}
                  icon={<Ionicons name="close" size={18} color={C.text} />}
                />
              </XStack>

              {/* Order Summary */}
              <YStack gap={10} borderWidth={1} borderColor={C.border} borderRadius={12} padding={14}>
                <InfoRow label="Invoice No">
                  <Text color={C.text} fontWeight="600">{sell.invoiceNo}</Text>
                </InfoRow>
                <InfoRow label="Date">
                  <Text color={C.text}>
                    {new Date(sell.saleDate).toLocaleDateString()}
                  </Text>
                </InfoRow>
                <InfoRow label="Status">
                  <StatusPill status={sell.saleStatus} label={getStatusText(sell.saleStatus)} />
                </InfoRow>
                {sell.branch ? (
                  <InfoRow label="Branch">
                    <Text color={C.text}>{sell.branch.name}</Text>
                  </InfoRow>
                ) : null}
                {sell.customer ? (
                  <InfoRow label="Customer">
                    <Text color={C.text} fontWeight="600">{sell.customer.name}</Text>
                  </InfoRow>
                ) : null}
                <InfoRow label="Total Products">
                  <Text color={C.text}>{sell.totalProducts}</Text>
                </InfoRow>
              </YStack>

              {/* Items */}
              <YStack gap={10}>
                <Text fontWeight="700" color={C.text} fontSize={16}>
                  Items ({sell.items?.length || 0})
                </Text>
                {sell.items?.map((item, index) => {
                  const subLabel = getSubProductLabel(item);
                  return (
                    <YStack
                      key={item?.id || index}
                      gap={10}
                      borderWidth={1}
                      borderColor={C.border}
                      borderRadius={12}
                      padding={12}
                      backgroundColor="white"
                    >
                      {/* Item Header */}
                      <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
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
                            Shop: {getShopName(item)}
                          </Text>
                          <Text fontSize={12} color={C.muted}>
                            Unit: {getUnitOfMeasure(item)}
                          </Text>
                        </YStack>
                        <YStack alignItems="flex-end" gap={2}>
                          <Text fontWeight="600" color={C.text}>
                            {formatMoney(item?.unitPrice)}
                          </Text>
                          <Text fontSize={12} color={C.muted}>
                            x{item?.quantity || 0}
                          </Text>
                        </YStack>
                      </XStack>

                      {/* Batch Details */}
                      {getItemBatches(item).length > 0 ? (
                        <BatchDetails batches={getItemBatches(item)} />
                      ) : null}

                      {/* Item Footer */}
                      <XStack justifyContent="space-between" alignItems="center">
                        <StatusPill
                          status={item?.itemSaleStatus || 'PENDING'}
                          label={getItemStatusText(item?.itemSaleStatus || 'PENDING')}
                        />
                        <Text fontWeight="700" color={C.text}>
                          {formatMoney(item?.totalPrice)}
                        </Text>
                      </XStack>
                    </YStack>
                  );
                })}
              </YStack>

              {/* Totals */}
              <YStack gap={8} borderWidth={1} borderColor={C.border} borderRadius={12} padding={14}>
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
              </YStack>

              {sell.notes ? (
                <YStack gap={6} borderWidth={1} borderColor={C.border} borderRadius={12} padding={14}>
                  <Text fontWeight="600" color={C.label}>Notes</Text>
                  <Text color={C.text}>{sell.notes}</Text>
                </YStack>
              ) : null}
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
};

export default function OrderScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Local state for filters
  const [filters, setFilters] = useState<GetAllSellsUserParams>({} as GetAllSellsUserParams);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSell, setSelectedSell] = useState<Sell | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [sellToUnlock, setSellToUnlock] = useState<Sell | null>(null);
  const [processingLock, setProcessingLock] = useState<string | null>(null);

  // Add debounced states for search inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [salesPersonNameInput, setSalesPersonNameInput] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Add refs for debouncing
  const customerNameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salesPersonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React Query for fetching sells
  const {
    data: sellsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sells', filters],
    queryFn: () => getAllSellsUser(filters),
  });

  const sells = sellsData?.sells || [];
  const totalCount = sellsData?.count || 0;

  // Mutation for lock/unlock
  const lockMutation = useMutation({
    mutationFn: ({ id, lock }: { id: string; lock: boolean }) => toggleSellLock(id, lock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sells'] });
    },
  });

  // Debounced customer name handler
  useEffect(() => {
    if (customerNameTimeoutRef.current) {
      clearTimeout(customerNameTimeoutRef.current);
    }

    customerNameTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        customerName: customerNameInput.trim() || undefined
      }));
    }, 500); // 500ms delay

    return () => {
      if (customerNameTimeoutRef.current) {
        clearTimeout(customerNameTimeoutRef.current);
      }
    };
  }, [customerNameInput]);

  // Debounced salesperson name handler
  useEffect(() => {
    if (salesPersonTimeoutRef.current) {
      clearTimeout(salesPersonTimeoutRef.current);
    }

    salesPersonTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        salesPersonName: salesPersonNameInput.trim() || undefined
      }));
    }, 500); // 500ms delay

    return () => {
      if (salesPersonTimeoutRef.current) {
        clearTimeout(salesPersonTimeoutRef.current);
      }
    };
  }, [salesPersonNameInput]);

  // Debounced search handler
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300); // 300ms delay for search

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || searchQuery || customerNameInput || salesPersonNameInput || filters.startDate || filters.endDate;

  // Refresh sells data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Handle errors
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message || 'Failed to fetch sales');
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApplyFilters = (newFilters: { startDate?: string; endDate?: string }) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle customer name filter change - update local state only
  const handleCustomerNameChange = (name: string) => {
    setCustomerNameInput(name);
  };

  // Handle salesperson name filter change - update local state only
  const handleSalesPersonNameChange = (name: string) => {
    setSalesPersonNameInput(name);
  };

  // Handle search input change - update local state only
  const handleSearchChange = (text: string) => {
    setSearchInput(text);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilters(prev => ({ ...prev, status: status === 'all' ? undefined : status as any }));
  };

  // Reset all filters
  const handleResetAllFilters = () => {
    setFilters({} as GetAllSellsUserParams);
    setStatusFilter('all');
    setSearchQuery('');
    setSearchInput('');
    setCustomerNameInput('');
    setSalesPersonNameInput('');
    setShowFilterModal(false);

    // Clear any pending timeouts
    if (customerNameTimeoutRef.current) {
      clearTimeout(customerNameTimeoutRef.current);
    }
    if (salesPersonTimeoutRef.current) {
      clearTimeout(salesPersonTimeoutRef.current);
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    Alert.alert('Filters Reset', 'All filters have been cleared');
  };

  const handleViewDetails = (sell: Sell) => {
    setSelectedSell(sell);
    setShowDetailModal(true);
  };

  // Lock/Unlock functionality
  const handleLockToggle = async (sell: Sell) => {
    if (sell.locked) {
      setSellToUnlock(sell);
      setShowConfirmationModal(true);
    } else {
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
      await lockMutation.mutateAsync({ id, lock });
      Alert.alert(
        'Success',
        `Sell has been ${lock ? 'locked' : 'unlocked'} successfully`
      );
    } catch (error) {
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
      const name = item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`;
      const sub = item?.subProduct;
      return [name, sub?.name, sub?.subProductCode].filter(Boolean).join(' ');
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

  // SAFE Helper function to check if any item has batches
  const hasBatches = (sell: Sell) => {
    return sell.items?.some(item => item?.batches && item.batches.length > 0) || false;
  };

  if (isLoading && !refreshing && sells.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
        <Spinner size="large" color={C.accent} />
        <Text marginTop={16} color={C.muted} fontSize={15}>
          Loading your sales...
        </Text>
      </YStack>
    );
  }

  const dateRangeLabel = formatDateRangeDisplay();
  const filtersApplied = !!(filters.startDate || filters.endDate || customerNameInput || salesPersonNameInput || filters.status);

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
            Orders
          </Text>
          <Text fontSize={13} color={C.muted}>
            Sales orders to review, lock and deliver
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
            {sells.length === 0 ? (
              <YStack alignItems="center" gap={8} paddingVertical={16}>
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
                <Text fontSize={16} fontWeight="700" color={C.text} textAlign="center">
                  No sales found
                </Text>
                {filtersApplied ? (
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
                    Your sales will appear here
                  </Text>
                )}
              </YStack>
            ) : (
              <YStack gap={10} width="100%">
                <XStack justifyContent="space-between" alignItems="center" width="100%">
                  <XStack alignItems="center" gap={8}>
                    <Ionicons name="receipt-outline" size={18} color={C.accent} />
                    <Text fontSize={14} color={C.label}>
                      Total Orders
                    </Text>
                  </XStack>
                  <Text fontSize={20} fontWeight="800" color={C.text}>
                    {totalCount}
                  </Text>
                </XStack>
                {dateRangeLabel ? (
                  <XStack alignItems="center" gap={6}>
                    <Ionicons name="calendar-outline" size={14} color={C.muted} />
                    <Text fontSize={13} color={C.muted}>
                      {dateRangeLabel}
                    </Text>
                  </XStack>
                ) : null}
              </YStack>
            )}
          </YStack>

          {/* Filters */}
          {sells.length > 0 ? (
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
                    placeholder="Order ID, invoice or product..."
                    value={searchInput}
                    onChangeText={handleSearchChange}
                    borderWidth={0}
                    backgroundColor="transparent"
                    color={C.text}
                    placeholderTextColor={C.placeholder}
                    focusStyle={{ borderWidth: 0 }}
                  />
                </XStack>
              </Fieldset>

              {/* Customer Name Filter */}
              <Fieldset gap={6}>
                <Label htmlFor="customerName" fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  placeholder="Filter by customer name..."
                  value={customerNameInput}
                  onChangeText={handleCustomerNameChange}
                  {...inputStyle}
                />
              </Fieldset>

              {/* Salesperson Name Filter */}
              <Fieldset gap={6}>
                <Label htmlFor="salesPersonName" fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
                  Salesperson Name
                </Label>
                <Input
                  id="salesPersonName"
                  placeholder="Filter by salesperson name..."
                  value={salesPersonNameInput}
                  onChangeText={handleSalesPersonNameChange}
                  {...inputStyle}
                />
              </Fieldset>

              {/* Status Filter */}
              <Fieldset gap={6}>
                <Label htmlFor="status" fontSize={13} fontWeight="600" color={C.label} lineHeight={18}>
                  Status
                </Label>
                <XStack gap={8} flexWrap="wrap">
                  {['all', 'DELIVERED', 'PARTIALLY_DELIVERED', 'APPROVED'].map((status) => {
                    const selected = statusFilter === status;
                    return (
                      <XStack
                        key={status}
                        onPress={() => handleStatusFilterChange(status)}
                        backgroundColor={selected ? C.accentTint : 'white'}
                        borderColor={selected ? C.accent : C.border}
                        borderWidth={1}
                        borderRadius={999}
                        paddingHorizontal={12}
                        paddingVertical={7}
                        pressStyle={{ opacity: 0.8 }}
                        cursor="pointer"
                      >
                        <Text
                          color={selected ? C.accent : C.text}
                          fontWeight="600"
                          fontSize={13}
                        >
                          {status === 'all' ? 'All' : getStatusText(status)}
                        </Text>
                      </XStack>
                    );
                  })}
                </XStack>
              </Fieldset>

              {/* Filter Actions */}
              <XStack gap={8}>
                <Button
                  flex={1}
                  {...secondaryButton}
                  onPress={() => setShowFilterModal(true)}
                  icon={<Ionicons name="calendar-outline" size={16} color={C.accent} />}
                >
                  <Text color={C.text} fontWeight="600">Date Range</Text>
                </Button>
                <Button
                  backgroundColor="white"
                  borderColor={C.danger}
                  borderWidth={1}
                  borderRadius={10}
                  onPress={handleResetAllFilters}
                  pressStyle={{ backgroundColor: '#FEF2F2', borderColor: C.danger }}
                  icon={<Ionicons name="trash-outline" size={16} color={C.danger} />}
                >
                  <Text color={C.danger} fontWeight="600">Clear All</Text>
                </Button>
              </XStack>

              {/* Active Filters Summary */}
              {hasActiveFilters ? (
                <YStack gap={6}>
                  <Text fontSize={12} fontWeight="600" color={C.muted}>
                    Active filters
                  </Text>
                  <XStack flexWrap="wrap" gap={6}>
                    {statusFilter !== 'all' ? (
                      <Badge>Status: {getStatusText(statusFilter)}</Badge>
                    ) : null}
                    {searchInput ? (
                      <Badge>Search: {searchInput}</Badge>
                    ) : null}
                    {customerNameInput ? (
                      <Badge>Customer: {customerNameInput}</Badge>
                    ) : null}
                    {salesPersonNameInput ? (
                      <Badge>Salesperson: {salesPersonNameInput}</Badge>
                    ) : null}
                    {filters.startDate && filters.endDate ? (
                      <Badge>Date Range</Badge>
                    ) : null}
                  </XStack>
                </YStack>
              ) : null}
            </YStack>
          ) : null}

          {/* Sales by Date */}
          {Object.entries(sellsByDate).map(([date, dateSells]) => (
            <YStack key={date} gap={10}>
              {/* Date Header */}
              <XStack alignItems="center" gap={8} paddingHorizontal={4} marginTop={4}>
                <Ionicons name="calendar-outline" size={16} color={C.muted} />
                <Text fontSize={15} fontWeight="700" color={C.text}>
                  {date}
                </Text>
                <Badge>
                  {dateSells.length} {dateSells.length === 1 ? 'sale' : 'sales'}
                </Badge>
              </XStack>

              {/* Sales for this date */}
              {dateSells.map((sell) => {
                const isProcessing = processingLock === sell.id;
                return (
                  <YStack
                    key={sell.id}
                    backgroundColor="white"
                    borderWidth={1}
                    borderColor={C.border}
                    borderRadius={14}
                    padding={14}
                    gap={12}
                    {...softShadow}
                    onPress={() => handleViewDetails(sell)}
                    pressStyle={{ backgroundColor: '#FAFAFA' }}
                    cursor="pointer"
                  >
                    {/* Sale Header */}
                    <XStack justifyContent="space-between" alignItems="flex-start" gap={12}>
                      <YStack flex={1} gap={4}>
                        <Text fontSize={15} fontWeight="700" color={C.text}>
                          {sell.invoiceNo}
                        </Text>
                        <XStack alignItems="center" gap={6}>
                          <Ionicons name="time-outline" size={14} color={C.muted} />
                          <Text fontSize={12} color={C.muted}>
                            {new Date(sell.saleDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })} at {new Date(sell.saleDate).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Text>
                        </XStack>
                        {/* Customer and Salesperson Info */}
                        {sell.customer?.name ? (
                          <XStack alignItems="center" gap={6}>
                            <Ionicons name="person-outline" size={14} color={C.muted} />
                            <Text fontSize={13} color={C.muted}>Customer:</Text>
                            <Text fontSize={13} color={C.text} numberOfLines={1} flexShrink={1}>
                              {sell.customer.name}
                            </Text>
                          </XStack>
                        ) : null}
                        {sell.createdBy?.name ? (
                          <XStack alignItems="center" gap={6}>
                            <Ionicons name="briefcase-outline" size={14} color={C.muted} />
                            <Text fontSize={13} color={C.muted}>Salesperson:</Text>
                            <Text fontSize={13} color={C.text} numberOfLines={1} flexShrink={1}>
                              {sell.createdBy.name}
                            </Text>
                          </XStack>
                        ) : null}
                      </YStack>
                      <YStack alignItems="flex-end" gap={6}>
                        <StatusPill status={sell.saleStatus} label={getStatusText(sell.saleStatus)} />
                        {hasBatches(sell) ? (
                          <XStack alignItems="center" gap={4}>
                            <Ionicons name="cube-outline" size={13} color={C.muted} />
                            <Text fontSize={12} color={C.muted}>Batches</Text>
                          </XStack>
                        ) : null}
                        {/* Lock Status */}
                        {sell.locked ? (
                          <XStack alignItems="center" gap={4}>
                            <Ionicons name="lock-closed-outline" size={13} color={C.danger} />
                            <Text fontSize={12} color={C.danger} fontWeight="600">
                              {sell.lockedAt
                                ? `Locked (${new Date(sell.lockedAt).toLocaleDateString()})`
                                : 'Locked'}
                            </Text>
                          </XStack>
                        ) : null}
                      </YStack>
                    </XStack>

                    {/* Items summary (admins can see items from several shops) */}
                    {sell.items && sell.items.length > 0 ? (
                      <YStack
                        gap={6}
                        borderTopWidth={1}
                        borderTopColor="#F3F4F6"
                        paddingTop={10}
                      >
                        {sell.items.slice(0, 3).map((item, idx) => {
                          const subLabel = getSubProductLabel(item);
                          return (
                            <XStack key={item?.id || idx} justifyContent="space-between" alignItems="flex-start" gap={8}>
                              <YStack flex={1}>
                                <Text fontSize={13} fontWeight="600" color={C.text} numberOfLines={1}>
                                  {item?.product?.name || `Product ${item?.productId?.slice(-8) || 'Unknown'}`}
                                  {subLabel ? ` — ${subLabel}` : ''}
                                </Text>
                                {item?.shop?.name ? (
                                  <Text fontSize={12} color={C.muted} numberOfLines={1}>
                                    {item.shop.name}
                                  </Text>
                                ) : null}
                              </YStack>
                              <Text fontSize={13} color={C.label}>
                                x{item?.quantity || 0}
                              </Text>
                            </XStack>
                          );
                        })}
                        {sell.items.length > 3 ? (
                          <Text fontSize={12} color={C.muted}>
                            +{sell.items.length - 3} more item{sell.items.length - 3 > 1 ? 's' : ''}
                          </Text>
                        ) : null}
                      </YStack>
                    ) : null}

                    {/* Totals */}
                    <XStack
                      justifyContent="space-between"
                      alignItems="center"
                      borderTopWidth={1}
                      borderTopColor="#F3F4F6"
                      paddingTop={10}
                    >
                      <Text fontSize={14} color={C.label}>
                        Total
                      </Text>
                      <Text fontSize={17} fontWeight="800" color={C.accent}>
                        {formatMoney(sell.grandTotal)}
                      </Text>
                    </XStack>

                    {/* Action Buttons */}
                    <XStack gap={8}>
                      {/* View Details Button */}
                      <Button
                        flex={1}
                        size="$3"
                        {...secondaryButton}
                        onPress={() => handleViewDetails(sell)}
                        icon={<Ionicons name="eye-outline" size={16} color={C.text} />}
                      >
                        <Text color={C.text} fontWeight="600" fontSize={13}>
                          View
                        </Text>
                      </Button>

                      {/* Lock/Unlock Button */}
                      <Button
                        flex={1}
                        size="$3"
                        backgroundColor="white"
                        borderColor={sell.locked ? C.border : C.danger}
                        borderWidth={1}
                        borderRadius={10}
                        onPress={() => handleLockToggle(sell)}
                        pressStyle={{
                          backgroundColor: sell.locked ? '#F9FAFB' : '#FEF2F2',
                          borderColor: sell.locked ? C.border : C.danger,
                        }}
                        disabled={isProcessing}
                        icon={
                          isProcessing ? undefined : (
                            <Ionicons
                              name={sell.locked ? 'lock-open-outline' : 'lock-closed-outline'}
                              size={16}
                              color={sell.locked ? C.text : C.danger}
                            />
                          )
                        }
                      >
                        {isProcessing ? (
                          <Spinner size="small" color={sell.locked ? C.text : C.danger} />
                        ) : (
                          <Text
                            color={sell.locked ? C.text : C.danger}
                            fontWeight="600"
                            fontSize={13}
                          >
                            {sell.locked ? 'Unlock' : 'Lock'}
                          </Text>
                        )}
                      </Button>
                    </XStack>

                    {/* View Full Details Button */}
                    <Button
                      size="$3"
                      {...primaryButton}
                      onPress={() => handleGoToDetailPage(sell)}
                      icon={<Ionicons name="document-text-outline" size={16} color="white" />}
                    >
                      <Text color="white" fontWeight="700" fontSize={13}>
                        View Full Details
                      </Text>
                    </Button>
                  </YStack>
                );
              })}
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
}
