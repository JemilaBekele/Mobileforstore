import React, { useState, useCallback, useEffect } from 'react';
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
  H2,
  Input,
  Fieldset,
  Label,
} from 'tamagui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

// React Query imports
import { useSocketSafe } from '@/(redux)/notification';
import { Notification } from '@/(services)/socket';
import { getUserDashboardSummary } from '@/(services)/api/dashboard';
import { formatMoney, formatQty, toNumber } from '@/(utils)/format';

// White card with a light border, used for every section
const SectionCard = ({ children, accent }: { children: React.ReactNode; accent?: string }) => (
  <Card
    bordered
    borderRadius="$5"
    backgroundColor="$orange1"
    borderColor="$orange4"
    borderWidth={1}
    borderLeftWidth={accent ? 4 : 1}
    borderLeftColor={accent || '$orange4'}
  >
    <Card.Header padded>{children}</Card.Header>
  </Card>
);

// Alert Item Component
const AlertItem = ({ alert, type }: { alert: any; type: 'expired' | 'lowStock' | 'expiringSoon' }) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'expired': return '$red2';
      case 'lowStock': return '$orange2';
      case 'expiringSoon': return '$yellow2';
      default: return '$orange2';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'expired': return '$red11';
      case 'lowStock': return '$orange12';
      case 'expiringSoon': return '$yellow11';
      default: return '$orange12';
    }
  };

  const getSubTextColor = () => {
    switch (type) {
      case 'expired': return '$red10';
      case 'lowStock': return '$orange11';
      case 'expiringSoon': return '$yellow10';
      default: return '$orange11';
    }
  };

  const unit = alert.unit || 'unit';
  const quantity = toNumber(alert.quantity);
  const warningQuantity = toNumber(alert.warningQuantity);

  return (
    <Card
      backgroundColor={getBackgroundColor()}
      padding="$3"
      borderRadius="$3"
      marginVertical="$1"
    >
      <YStack space="$2">
        <Text fontSize="$3" fontWeight="600" color={getTextColor()}>
          {alert.name || 'Unknown Product'}
        </Text>
        <Text fontSize="$1" color={getSubTextColor()}>
          {alert.locationName || 'Unknown Location'} • {alert.productCode || 'N/A'}
        </Text>
        {type === 'lowStock' ? (
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$2" fontWeight="700" color="$orange9">
              {formatQty(quantity)} {unit} left
            </Text>
            <Text fontSize="$1" color={getSubTextColor()}>
              Alert at {formatQty(warningQuantity)} {unit}
            </Text>
          </XStack>
        ) : (
          <Text fontSize="$1" color={getSubTextColor()}>
            Batch: {alert.batchNumber || 'N/A'} • Qty: {formatQty(quantity)} {unit}
          </Text>
        )}
        {type === 'expired' ? (
          <Text fontSize="$1" color={getSubTextColor()} fontStyle="italic">
            Expired: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
          </Text>
        ) : null}
        {type === 'expiringSoon' ? (
          <Text fontSize="$1" color={getSubTextColor()} fontStyle="italic">
            Expires: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
          </Text>
        ) : null}
      </YStack>
    </Card>
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
  type: 'expired' | 'lowStock' | 'expiringSoon';
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  const [filteredItems, setFilteredItems] = useState(items);

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
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4 color="$orange12" fontWeight="800">{title}</H4>
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

                  <Text fontSize="$2" color="$orange11">
                    Total: {formatQty(items.length)} items
                  </Text>

                  {/* Search Input */}
                  <Fieldset>
                    <Label htmlFor="search" fontSize="$3" fontWeight="600" color="$orange11">
                      Search
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search by name, code, batch, or location..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      borderColor="$orange5"
                      backgroundColor="$orange1"
                      borderRadius="$4"
                      focusStyle={{ borderColor: '$orange9' }}
                    />
                  </Fieldset>

                  {/* Search Results Summary */}
                  {searchQuery ? (
                    <Card backgroundColor="$orange2" padding="$2" borderRadius="$2">
                      <Text fontSize="$2" color="$orange11">
                        Found {filteredItems.length} items matching &quot;{searchQuery}&quot;
                      </Text>
                    </Card>
                  ) : null}

                  {/* Items List */}
                  <YStack space="$2">
                    {filteredItems.length === 0 ? (
                      <Card backgroundColor="$orange2" padding="$4" borderRadius="$4">
                        <Text color="$orange11" textAlign="center">
                          No items found{searchQuery ? ' matching your search' : ''}
                        </Text>
                      </Card>
                    ) : (
                      filteredItems.map((alert, index) => (
                        <AlertItem key={`${type}-${alert.id || index}-${alert.batchId || ''}-${alert.locationName || ''}`} alert={alert} type={type} />
                      ))
                    )}
                  </YStack>

                  <Button
                    backgroundColor="$orange1"
                    borderColor="$orange9"
                    borderWidth={1}
                    borderRadius="$4"
                    onPress={onClose}
                  >
                    <Text color="$orange9" fontWeight="700">Close</Text>
                  </Button>
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
  color,
  backgroundColor,
}: {
  value: string;
  label: string;
  color: string;
  backgroundColor: string;
}) => (
  <YStack
    flex={1}
    minWidth={90}
    alignItems="center"
    padding="$3"
    backgroundColor={backgroundColor}
    borderRadius="$4"
    space="$1"
  >
    <Text fontSize="$5" fontWeight="800" color={color} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text fontSize="$1" color="$orange11" fontWeight="600" textAlign="center">
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
      console.log('📢 Real-time notification received on dashboard:', notification);

      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      setShowNotificationBadge(true);

      Alert.alert(
        '🚨 New Sale Approved!',
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
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1" padding="$4">
        <Text fontSize="$8" marginBottom="$4">📊</Text>
        <H3 color="$orange12" fontWeight="800" textAlign="center" marginBottom="$2">
          No Dashboard Data
        </H3>
        <Text color="$orange11" textAlign="center" marginBottom="$4">
          Unable to load dashboard information. Please check your connection and try again.
        </Text>
        <Button
          backgroundColor="$orange9"
          borderRadius="$4"
          pressStyle={{ backgroundColor: '$orange10' }}
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
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange12" fontSize="$5" fontWeight="600">
          Loading alerts...
        </Text>
        <Text marginTop="$2" color="$orange11" fontSize="$2" textAlign="center">
          Fetching your alert data
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
        {/* Show refreshing indicator at top */}
        {refreshing ? (
          <XStack justifyContent="center" padding="$2" backgroundColor="$orange2">
            <Spinner size="small" color="$orange9" />
            <Text marginLeft="$2" color="$orange11" fontSize="$2">
              Refreshing alerts...
            </Text>
          </XStack>
        ) : null}

        <YStack space="$4" padding="$4">
          {/* Header */}
          <YStack space="$1" paddingTop="$2">
            <H2 fontWeight="800" color="$orange12">
              Alerts Dashboard
            </H2>
            <YStack width={44} height={3} borderRadius={2} backgroundColor="$orange9" />
            <Text fontSize="$2" color="$orange11" marginTop="$1">
              {formatQty(userShopsCount)} shop{userShopsCount === 1 ? '' : 's'} · {formatQty(userStoresCount)} store{userStoresCount === 1 ? '' : 's'}
            </Text>
          </YStack>

          {/* Sales overview */}
          {salesStats ? (
            <SectionCard>
              <YStack space="$3">
                <H4 color="$orange12" fontWeight="700">Sales Overview</H4>
                <XStack space="$2" flexWrap="wrap">
                  <StatTile
                    value={formatMoney(salesStats.totalRevenue)}
                    label="Net revenue"
                    color="$orange9"
                    backgroundColor="$orange2"
                  />
                  <StatTile
                    value={formatQty(toNumber(salesStats.totalSales))}
                    label="Sales"
                    color="$orange12"
                    backgroundColor="$orange2"
                  />
                </XStack>
                {toNumber(salesStats.totalGrossRevenue) > 0 ? (
                  <XStack justifyContent="space-between">
                    <Text fontSize="$2" color="$orange11">Gross revenue</Text>
                    <Text fontSize="$2" fontWeight="700" color="$orange12">
                      {formatMoney(salesStats.totalGrossRevenue)}
                    </Text>
                  </XStack>
                ) : null}
              </YStack>
            </SectionCard>
          ) : null}

          {/* Real-time notifications */}
          {notifications.length > 0 ? (
            <SectionCard accent="$orange9">
              <YStack space="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <H4 color="$orange12" fontWeight="700">🔔 Real-time Updates</H4>
                  <Button
                    size="$2"
                    backgroundColor="$orange1"
                    borderColor="$orange9"
                    borderWidth={1}
                    borderRadius="$3"
                    onPress={clearNotifications}
                  >
                    <Text color="$orange9" fontSize="$1" fontWeight="700">
                      Clear
                    </Text>
                  </Button>
                </XStack>

                {notifications.slice(0, 3).map((notification, index) => (
                  <Card
                    key={`notification-${notification.id || notification.createdAt || index}`}
                    backgroundColor="$orange2"
                    padding="$3"
                    borderRadius="$3"
                    marginVertical="$1"
                  >
                    <YStack space="$1">
                      <Text fontSize="$3" fontWeight="600" color="$orange12">
                        {notification.title}
                      </Text>
                      <Text fontSize="$2" color="$orange11">
                        {notification.message}
                      </Text>
                      <Text fontSize="$1" color="$orange10">
                        {new Date(notification.createdAt).toLocaleTimeString()}
                      </Text>
                    </YStack>
                  </Card>
                ))}

                {notifications.length > 3 ? (
                  <Text fontSize="$1" color="$orange11" textAlign="center">
                    +{notifications.length - 3} more notifications
                  </Text>
                ) : null}
              </YStack>
            </SectionCard>
          ) : null}

          {/* Show loading overlay during refresh */}
          {refreshing ? (
            <Card backgroundColor="$orange2" padding="$3" borderRadius="$3">
              <XStack alignItems="center" justifyContent="center" space="$3">
                <Spinner size="small" color="$orange9" />
                <Text color="$orange11" fontSize="$3" fontWeight="600">
                  Updating alert data...
                </Text>
              </XStack>
            </Card>
          ) : null}

          {/* Alerts Content */}
          <YStack space="$4">
            {/* Alert Summary */}
            <SectionCard>
              <YStack space="$3">
                <H4 color="$orange12" fontWeight="700">Alert Summary</H4>

                <XStack space="$2" flexWrap="wrap">
                  <StatTile
                    value={`❌ ${formatQty(stockAlerts.expiredProducts?.length || 0)}`}
                    label="Expired"
                    color="$red10"
                    backgroundColor="$red2"
                  />
                  <StatTile
                    value={`📉 ${formatQty(stockAlerts.lowStockProducts?.length || 0)}`}
                    label="Low Stock"
                    color="$orange9"
                    backgroundColor="$orange2"
                  />
                  <StatTile
                    value={`⏰ ${formatQty(stockAlerts.expiringSoonProducts?.length || 0)}`}
                    label="Expiring Soon"
                    color="$yellow10"
                    backgroundColor="$yellow2"
                  />
                </XStack>

                <Text fontSize="$2" color="$orange11" textAlign="center">
                  Total Alerts: {formatQty(totalAlerts)}
                </Text>
              </YStack>
            </SectionCard>

            {/* Show empty state if no alerts */}
            {totalAlerts === 0 ? (
              <Card backgroundColor="$green1" borderColor="$green4" borderWidth={1} padding="$4" borderRadius="$5">
                <YStack alignItems="center" space="$2">
                  <Text fontSize="$6">✅</Text>
                  <Text fontSize="$4" fontWeight="600" color="$green11" textAlign="center">
                    No Active Alerts
                  </Text>
                  <Text fontSize="$2" color="$green10" textAlign="center">
                    Great job! All systems are running smoothly.
                  </Text>
                </YStack>
              </Card>
            ) : null}

            {/* Expired Products */}
            {stockAlerts.expiredProducts?.length > 0 ? (
              <SectionCard accent="$red9">
                <YStack space="$3">
                  <H4 color="$red11" fontWeight="700">❌ Expired Products</H4>

                  {stockAlerts.expiredProducts.slice(0, 5).map((alert: unknown, index: number) => (
                    <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expired" />
                  ))}

                  {stockAlerts.expiredProducts.length > 5 ? (
                    <Button
                      size="$3"
                      backgroundColor="$orange1"
                      borderColor="$red9"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowExpiredModal(true)}
                    >
                      <Text color="$red10" fontWeight="700">
                        View all {stockAlerts.expiredProducts.length} expired items
                      </Text>
                    </Button>
                  ) : null}
                </YStack>
              </SectionCard>
            ) : null}

            {/* Low Stock Products */}
            {stockAlerts.lowStockProducts?.length > 0 ? (
              <SectionCard accent="$orange9">
                <YStack space="$3">
                  <H4 color="$orange12" fontWeight="700">📉 Low Stock Products</H4>

                  {stockAlerts.lowStockProducts.slice(0, 10).map((alert: unknown, index: number) => (
                    <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="lowStock" />
                  ))}

                  {stockAlerts.lowStockProducts.length > 10 ? (
                    <Button
                      size="$3"
                      backgroundColor="$orange1"
                      borderColor="$orange9"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowLowStockModal(true)}
                    >
                      <Text color="$orange9" fontWeight="700">
                        View all {stockAlerts.lowStockProducts.length} low stock items
                      </Text>
                    </Button>
                  ) : null}
                </YStack>
              </SectionCard>
            ) : null}

            {/* Expiring Soon Products */}
            {stockAlerts.expiringSoonProducts?.length > 0 ? (
              <SectionCard accent="$yellow9">
                <YStack space="$3">
                  <H4 color="$yellow11" fontWeight="700">⏰ Expiring Soon</H4>

                  {stockAlerts.expiringSoonProducts.slice(0, 10).map((alert: unknown, index: number) => (
                    <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expiringSoon" />
                  ))}

                  {stockAlerts.expiringSoonProducts.length > 10 ? (
                    <Button
                      size="$3"
                      backgroundColor="$orange1"
                      borderColor="$yellow9"
                      borderWidth={1}
                      borderRadius="$3"
                      onPress={() => setShowExpiringSoonModal(true)}
                    >
                      <Text color="$yellow11" fontWeight="700">
                        View all {stockAlerts.expiringSoonProducts.length} expiring items
                      </Text>
                    </Button>
                  ) : null}
                </YStack>
              </SectionCard>
            ) : null}
          </YStack>
        </YStack>
      </ScrollView>

      {/* Full List Modals */}
      <FullListModal
        visible={showExpiredModal}
        onClose={() => {
          setShowExpiredModal(false);
          setExpiredSearchQuery('');
        }}
        title="❌ All Expired Products"
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
        title="📉 All Low Stock Products"
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
        title="⏰ All Expiring Soon Products"
        items={stockAlerts.expiringSoonProducts || []}
        type="expiringSoon"
        searchQuery={expiringSoonSearchQuery}
        setSearchQuery={setExpiringSoonSearchQuery}
      />
    </YStack>
  );
};

export default DashboardScreen;
