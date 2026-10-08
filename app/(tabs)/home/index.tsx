import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
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
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

// React Query imports
import { useSocketSafe } from '@/(redux)/notification';
import { Notification } from '@/(services)/socket';
import { getUserDashboardSummary } from '@/(services)/api/dashboard';
import { formatMoney, formatQty, toNumber } from '@/(utils)/format';

type AlertType = 'expired' | 'lowStock' | 'expiringSoon';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Severity look: only shown through the small pill / icon
const SEVERITY: Record<AlertType, { label: string; bg: string; fg: string; icon: IconName }> = {
  expired: { label: 'Expired', bg: '#FEE2E2', fg: '#991B1B', icon: 'close-circle-outline' },
  lowStock: { label: 'Low stock', bg: '#FEF3C7', fg: '#92400E', icon: 'trending-down-outline' },
  expiringSoon: { label: 'Expiring soon', bg: '#FEF3C7', fg: '#92400E', icon: 'time-outline' },
};

// White card with a light border, used for every section
const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <YStack
    backgroundColor="#FFFFFF"
    borderWidth={1}
    borderColor="#E5E7EB"
    borderRadius={16}
    padding={16}
    gap={12}
  >
    {children}
  </YStack>
);

// Section heading with a small coloured icon badge
const SectionTitle = ({
  icon,
  title,
  iconColor = '#FF6B00',
  iconBg = '#FFF7ED',
  count,
}: {
  icon: IconName;
  title: string;
  iconColor?: string;
  iconBg?: string;
  count?: number;
}) => (
  <XStack alignItems="center" gap={10}>
    <YStack width={32} height={32} borderRadius={10} alignItems="center" justifyContent="center" backgroundColor={iconBg}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </YStack>
    <Text flex={1} fontSize={16} fontWeight="700" color="#111827">
      {title}
    </Text>
    {typeof count === 'number' ? (
      <Text fontSize={14} fontWeight="700" color="#FF6B00">
        {formatQty(count)}
      </Text>
    ) : null}
  </XStack>
);

// Small tinted pill
const Pill = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <YStack paddingHorizontal={8} paddingVertical={3} borderRadius={999} backgroundColor={bg}>
    <Text fontSize={11} fontWeight="700" color={fg}>
      {label}
    </Text>
  </YStack>
);

// Secondary (outlined) button
const OutlineButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Button
    backgroundColor="#FFFFFF"
    borderWidth={1}
    borderColor="#E5E7EB"
    borderRadius={12}
    pressStyle={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
    onPress={onPress}
  >
    <Text color="#111827" fontWeight="600">
      {label}
    </Text>
  </Button>
);

// Alert Item Component
const AlertItem = ({ alert, type }: { alert: any; type: AlertType }) => {
  const severity = SEVERITY[type];
  const unit = alert.unit || 'unit';
  const quantity = toNumber(alert.quantity);
  const warningQuantity = toNumber(alert.warningQuantity);

  return (
    <YStack
      backgroundColor="#F9FAFB"
      borderWidth={1}
      borderColor="#F3F4F6"
      padding={12}
      borderRadius={12}
      gap={4}
    >
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="600" color="#111827" numberOfLines={2}>
          {alert.name || 'Unknown Product'}
        </Text>
        <Pill label={severity.label} bg={severity.bg} fg={severity.fg} />
      </XStack>
      <Text fontSize={12} color="#6B7280">
        {alert.locationName || 'Unknown Location'} · {alert.productCode || 'N/A'}
      </Text>
      {type === 'lowStock' ? (
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} fontWeight="700" color="#111827">
            {formatQty(quantity)} {unit} left
          </Text>
          <Text fontSize={12} color="#6B7280">
            Alert at {formatQty(warningQuantity)} {unit}
          </Text>
        </XStack>
      ) : (
        <Text fontSize={12} color="#6B7280">
          Batch: {alert.batchNumber || 'N/A'} · Qty: {formatQty(quantity)} {unit}
        </Text>
      )}
      {type === 'expired' ? (
        <Text fontSize={12} color="#374151">
          Expired: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
        </Text>
      ) : null}
      {type === 'expiringSoon' ? (
        <Text fontSize={12} color="#374151">
          Expires: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
        </Text>
      ) : null}
    </YStack>
  );
};

// Full List Modal Component
const FullListModal = ({
  visible,
  onClose,
  title,
  items,
  type,
  searchQuery,
  setSearchQuery,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  type: AlertType;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  const [filteredItems, setFilteredItems] = useState(items);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter(item =>
        (item.name || '').toLowerCase().includes(query) ||
        (item.productCode || '').toLowerCase().includes(query) ||
        (item.batchNumber || '').toLowerCase().includes(query) ||
        (item.locationName || '').toLowerCase().includes(query)
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, items]);

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
          backgroundColor="rgba(0,0,0,0.5)"
          justifyContent="flex-end"
        >
          <TouchableWithoutFeedback>
            <YStack
              backgroundColor="#FFFFFF"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
              padding={16}
              maxHeight="85%"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={12}>
                  <XStack justifyContent="space-between" alignItems="center" gap={12}>
                    <YStack flex={1}>
                      <Text fontSize={18} fontWeight="700" color="#111827">{title}</Text>
                      <Text fontSize={13} color="#6B7280">
                        Total: {formatQty(items.length)} items
                      </Text>
                    </YStack>
                    <TouchableOpacity
                      onPress={onClose}
                      accessibilityLabel="Close"
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>
                  </XStack>

                  {/* Search Input */}
                  <XStack
                    alignItems="center"
                    backgroundColor="#FFFFFF"
                    borderWidth={1}
                    borderColor={searchFocused ? '#FF6B00' : '#E5E7EB'}
                    borderRadius={12}
                    paddingLeft={12}
                  >
                    <Ionicons name="search" size={18} color="#6B7280" />
                    <Input
                      flex={1}
                      placeholder="Search by name, code, batch, or location..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      backgroundColor="transparent"
                      borderWidth={0}
                      focusStyle={{ borderWidth: 0 }}
                      color="#111827"
                      fontSize={15}
                      paddingHorizontal={10}
                      placeholderTextColor="#9CA3AF"
                    />
                  </XStack>

                  {/* Search Results Summary */}
                  {searchQuery ? (
                    <Text fontSize={13} color="#6B7280">
                      Found {filteredItems.length} items matching &quot;{searchQuery}&quot;
                    </Text>
                  ) : null}

                  {/* Items List */}
                  <YStack gap={8}>
                    {filteredItems.length === 0 ? (
                      <YStack alignItems="center" padding={20} gap={8}>
                        <Ionicons name="search-outline" size={28} color="#9CA3AF" />
                        <Text color="#6B7280" textAlign="center">
                          No items found{searchQuery ? ' matching your search' : ''}
                        </Text>
                      </YStack>
                    ) : (
                      filteredItems.map((alert, index) => (
                        <AlertItem key={`${type}-${alert.id || index}-${alert.batchId || ''}-${alert.locationName || ''}`} alert={alert} type={type} />
                      ))
                    )}
                  </YStack>

                  <OutlineButton label="Close" onPress={onClose} />
                </YStack>
              </ScrollView>
            </YStack>
          </TouchableWithoutFeedback>
        </YStack>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Small stat tile used in the summary cards
const StatTile = ({
  value,
  label,
  valueColor = '#111827',
  icon,
  iconColor,
}: {
  value: string;
  label: string;
  valueColor?: string;
  icon?: IconName;
  iconColor?: string;
}) => (
  <YStack
    flex={1}
    minWidth={90}
    padding={12}
    backgroundColor="#FFFFFF"
    borderWidth={1}
    borderColor="#E5E7EB"
    borderRadius={12}
    gap={4}
  >
    {icon ? <Ionicons name={icon} size={18} color={iconColor || '#6B7280'} /> : null}
    <Text fontSize={20} fontWeight="800" color={valueColor} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text fontSize={12} color="#6B7280" fontWeight="600">
      {label}
    </Text>
  </YStack>
);

const DashboardScreen = () => {
  const queryClient = useQueryClient();

  // React Query for dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getUserDashboardSummary({}),
  });

  // Socket hook
  const { onNotification, isConnected } = useSocketSafe();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationBadge, setShowNotificationBadge] = useState(false);

  // Modal states
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showExpiringSoonModal, setShowExpiringSoonModal] = useState(false);

  // Search states for modals
  const [expiredSearchQuery, setExpiredSearchQuery] = useState('');
  const [lowStockSearchQuery, setLowStockSearchQuery] = useState('');
  const [expiringSoonSearchQuery, setExpiringSoonSearchQuery] = useState('');

  // Generate unique key for alert items
  const generateAlertKey = (alert: any, index: number) => {
    const parts = [
      alert.id,
      alert.productId,
      alert.productCode,
      alert.batchNumber,
      alert.locationId,
      index.toString()
    ];
    return parts.filter(Boolean).join('-') || `alert-${Date.now()}-${index}`;
  };

  // Setup real-time notification listener
  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      console.log('Real-time notification received on dashboard:', notification);

      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      setShowNotificationBadge(true);

      Alert.alert(
        'New Sale Approved',
        notification.message,
        [
          {
            text: 'View',
            onPress: () => {
              setShowNotificationBadge(false);
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }
          },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 1000);
    };

    onNotification(handleNewNotification);
  }, [onNotification, queryClient]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowNotificationBadge(false);
    }, [queryClient])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message || 'Failed to load dashboard');
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      // Error is already handled by the React Query
    } finally {
      setRefreshing(false);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotificationBadge(false);
  };

  // Extract data from dashboard response
  const summary = dashboardData || {};

  // Extract alert summary with safe defaults
  const alertSummary = summary.alertSummary || {
    expired: 0,
    lowStock: 0,
    expiringSoon: 0
  };

  // Extract stock alerts with safe defaults
  const stockAlerts = summary.stockAlerts || {
    expiredProducts: [],
    lowStockProducts: [],
    expiringSoonProducts: []
  };

  // Sales stats (money comes as JSON numbers)
  const salesStats = summary.salesStats;

  // Calculate totals
  const totalAlerts = (stockAlerts.expiredProducts?.length || 0) +
                     (stockAlerts.lowStockProducts?.length || 0) +
                     (stockAlerts.expiringSoonProducts?.length || 0);

  const criticalAlerts = (stockAlerts.expiredProducts?.length || 0) +
                        (stockAlerts.expiringSoonProducts?.length || 0);

  const userShopsCount = summary.userShopsCount || 0;
  const userStoresCount = summary.userStoresCount || 0;

  // Show empty state when no data after loading
  if (!isLoading && !refreshing && !dashboardData) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FFFFFF" padding={16} gap={12}>
        <Ionicons name="bar-chart-outline" size={40} color="#9CA3AF" />
        <Text fontSize={18} color="#111827" fontWeight="700" textAlign="center">
          No Dashboard Data
        </Text>
        <Text color="#6B7280" fontSize={14} textAlign="center">
          Unable to load dashboard information. Please check your connection and try again.
        </Text>
        <Button
          backgroundColor="#FF6B00"
          borderWidth={0}
          borderRadius={12}
          pressStyle={{ backgroundColor: '#EA580C' }}
          onPress={handleRefresh}
        >
          <Text color="white" fontWeight="700">
            Try Again
          </Text>
        </Button>
      </YStack>
    );
  }

  // Show loading state during initial load
  if (isLoading && !refreshing && !dashboardData) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FFFFFF" gap={8}>
        <Spinner size="large" color="#FF6B00" />
        <Text color="#111827" fontSize={16} fontWeight="600">
          Loading alerts...
        </Text>
        <Text color="#6B7280" fontSize={13} textAlign="center">
          Fetching your alert data
        </Text>
      </YStack>
    );
  }

  const expiredCount = stockAlerts.expiredProducts?.length || 0;
  const lowStockCount = stockAlerts.lowStockProducts?.length || 0;
  const expiringCount = stockAlerts.expiringSoonProducts?.length || 0;

  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      {/* Header */}
      <YStack
        paddingHorizontal={16}
        paddingTop={16}
        paddingBottom={12}
        borderBottomWidth={1}
        borderBottomColor="#E5E7EB"
        backgroundColor="#FFFFFF"
        gap={2}
      >
        <Text fontSize={24} fontWeight="700" color="#111827">
          Alerts Dashboard
        </Text>
        <Text fontSize={14} color="#6B7280">
          {formatQty(userShopsCount)} shop{userShopsCount === 1 ? '' : 's'} · {formatQty(userStoresCount)} store{userStoresCount === 1 ? '' : 's'}
        </Text>
      </YStack>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B00']} tintColor="#FF6B00" />
        }
      >
        {/* Show refreshing indicator at top */}
        {refreshing ? (
          <XStack justifyContent="center" alignItems="center" padding={8} gap={8}>
            <Spinner size="small" color="#FF6B00" />
            <Text color="#6B7280" fontSize={13}>
              Refreshing alerts...
            </Text>
          </XStack>
        ) : null}

        <YStack gap={12} padding={16}>
          {/* Sales overview */}
          {salesStats ? (
            <SectionCard>
              <SectionTitle icon="stats-chart-outline" title="Sales Overview" />
              <XStack gap={12} flexWrap="wrap">
                <StatTile
                  value={formatMoney(salesStats.totalRevenue)}
                  label="Net revenue"
                  valueColor="#FF6B00"
                />
                <StatTile
                  value={formatQty(toNumber(salesStats.totalSales))}
                  label="Sales"
                />
              </XStack>
              {toNumber(salesStats.totalGrossRevenue) > 0 ? (
                <XStack justifyContent="space-between">
                  <Text fontSize={13} color="#6B7280">Gross revenue</Text>
                  <Text fontSize={13} fontWeight="700" color="#111827">
                    {formatMoney(salesStats.totalGrossRevenue)}
                  </Text>
                </XStack>
              ) : null}
            </SectionCard>
          ) : null}

          {/* Real-time notifications */}
          {notifications.length > 0 ? (
            <SectionCard>
              <XStack justifyContent="space-between" alignItems="center" gap={8}>
                <YStack flex={1}>
                  <SectionTitle icon="notifications-outline" title="Real-time Updates" />
                </YStack>
                <TouchableOpacity onPress={clearNotifications} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Text color="#FF6B00" fontSize={13} fontWeight="700">
                    Clear
                  </Text>
                </TouchableOpacity>
              </XStack>

              {notifications.slice(0, 3).map((notification, index) => (
                <YStack
                  key={`notification-${notification.id || notification.createdAt || index}`}
                  backgroundColor="#F9FAFB"
                  borderWidth={1}
                  borderColor="#F3F4F6"
                  padding={12}
                  borderRadius={12}
                  gap={2}
                >
                  <Text fontSize={14} fontWeight="600" color="#111827">
                    {notification.title}
                  </Text>
                  <Text fontSize={13} color="#374151">
                    {notification.message}
                  </Text>
                  <Text fontSize={12} color="#6B7280">
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </Text>
                </YStack>
              ))}

              {notifications.length > 3 ? (
                <Text fontSize={12} color="#6B7280" textAlign="center">
                  +{notifications.length - 3} more notifications
                </Text>
              ) : null}
            </SectionCard>
          ) : null}

          {/* Show loading overlay during refresh */}
          {refreshing ? (
            <XStack alignItems="center" justifyContent="center" gap={8} padding={12} borderWidth={1} borderColor="#E5E7EB" borderRadius={12}>
              <Spinner size="small" color="#FF6B00" />
              <Text color="#6B7280" fontSize={14} fontWeight="600">
                Updating alert data...
              </Text>
            </XStack>
          ) : null}

          {/* Alert Summary */}
          <SectionCard>
            <SectionTitle icon="warning-outline" title="Alert Summary" count={totalAlerts} />
            <XStack gap={8} flexWrap="wrap">
              <StatTile
                value={formatQty(expiredCount)}
                label="Expired"
                icon={SEVERITY.expired.icon}
                iconColor="#DC2626"
              />
              <StatTile
                value={formatQty(lowStockCount)}
                label="Low Stock"
                icon={SEVERITY.lowStock.icon}
                iconColor="#D97706"
              />
              <StatTile
                value={formatQty(expiringCount)}
                label="Expiring Soon"
                icon={SEVERITY.expiringSoon.icon}
                iconColor="#D97706"
              />
            </XStack>
          </SectionCard>

          {/* Show empty state if no alerts */}
          {totalAlerts === 0 ? (
            <SectionCard>
              <YStack alignItems="center" gap={6} paddingVertical={8}>
                <YStack width={44} height={44} borderRadius={22} backgroundColor="#DCFCE7" alignItems="center" justifyContent="center">
                  <Ionicons name="checkmark-circle-outline" size={24} color="#166534" />
                </YStack>
                <Text fontSize={16} fontWeight="700" color="#111827" textAlign="center">
                  No Active Alerts
                </Text>
                <Text fontSize={13} color="#6B7280" textAlign="center">
                  Great job! All systems are running smoothly.
                </Text>
              </YStack>
            </SectionCard>
          ) : null}

          {/* Expired Products */}
          {expiredCount > 0 ? (
            <SectionCard>
              <SectionTitle
                icon={SEVERITY.expired.icon}
                iconColor="#DC2626"
                iconBg="#FEE2E2"
                title="Expired Products"
                count={expiredCount}
              />

              {stockAlerts.expiredProducts.slice(0, 5).map((alert: unknown, index: number) => (
                <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expired" />
              ))}

              {expiredCount > 5 ? (
                <OutlineButton
                  label={`View all ${expiredCount} expired items`}
                  onPress={() => setShowExpiredModal(true)}
                />
              ) : null}
            </SectionCard>
          ) : null}

          {/* Low Stock Products */}
          {lowStockCount > 0 ? (
            <SectionCard>
              <SectionTitle
                icon={SEVERITY.lowStock.icon}
                iconColor="#D97706"
                iconBg="#FEF3C7"
                title="Low Stock Products"
                count={lowStockCount}
              />

              {stockAlerts.lowStockProducts.slice(0, 10).map((alert: unknown, index: number) => (
                <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="lowStock" />
              ))}

              {lowStockCount > 10 ? (
                <OutlineButton
                  label={`View all ${lowStockCount} low stock items`}
                  onPress={() => setShowLowStockModal(true)}
                />
              ) : null}
            </SectionCard>
          ) : null}

          {/* Expiring Soon Products */}
          {expiringCount > 0 ? (
            <SectionCard>
              <SectionTitle
                icon={SEVERITY.expiringSoon.icon}
                iconColor="#D97706"
                iconBg="#FEF3C7"
                title="Expiring Soon"
                count={expiringCount}
              />

              {stockAlerts.expiringSoonProducts.slice(0, 10).map((alert: unknown, index: number) => (
                <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expiringSoon" />
              ))}

              {expiringCount > 10 ? (
                <OutlineButton
                  label={`View all ${expiringCount} expiring items`}
                  onPress={() => setShowExpiringSoonModal(true)}
                />
              ) : null}
            </SectionCard>
          ) : null}
        </YStack>
      </ScrollView>

      {/* Full List Modals */}
      <FullListModal
        visible={showExpiredModal}
        onClose={() => {
          setShowExpiredModal(false);
          setExpiredSearchQuery('');
        }}
        title="All Expired Products"
        items={stockAlerts.expiredProducts || []}
        type="expired"
        searchQuery={expiredSearchQuery}
        setSearchQuery={setExpiredSearchQuery}
      />

      <FullListModal
        visible={showLowStockModal}
        onClose={() => {
          setShowLowStockModal(false);
          setLowStockSearchQuery('');
        }}
        title="All Low Stock Products"
        items={stockAlerts.lowStockProducts || []}
        type="lowStock"
        searchQuery={lowStockSearchQuery}
        setSearchQuery={setLowStockSearchQuery}
      />

      <FullListModal
        visible={showExpiringSoonModal}
        onClose={() => {
          setShowExpiringSoonModal(false);
          setExpiringSoonSearchQuery('');
        }}
        title="All Expiring Soon Products"
        items={stockAlerts.expiringSoonProducts || []}
        type="expiringSoon"
        searchQuery={expiringSoonSearchQuery}
        setSearchQuery={setExpiringSoonSearchQuery}
      />
    </YStack>
  );
};

export default DashboardScreen;
