import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  XStack,
  YStack,
  Button,
  ScrollView,
  Spinner,
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';

// React Query imports
import { useSocketSafe } from '@/(redux)/notification';
import { Notification } from '@/(services)/socket';
import { getUserDashboardSummary } from '@/(services)/api/dashboard';
import { formatMoney, formatQty, toNumber } from '@/(utils)/format';
import { AlertType, SEVERITY, StockAlertItem as AlertItem } from '@/components/stock-alert-item';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

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

// Small stat tile used in the summary cards
const StatTile = ({
  value,
  label,
  valueColor = '#111827',
  icon,
  iconColor,
  onPress,
}: {
  value: string;
  label: string;
  valueColor?: string;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
}) => (
  <YStack
    onPress={onPress}
    pressStyle={onPress ? { backgroundColor: '#F9FAFB' } : undefined}
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
  const router = useRouter();

  // Full page with every low-stock / expired / expiring-soon item
  const openAlerts = (type: AlertType) =>
    router.push({ pathname: '/home/alerts', params: { type } } as any);

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
                onPress={() => openAlerts('expired')}
                icon={SEVERITY.expired.icon}
                iconColor="#DC2626"
              />
              <StatTile
                value={formatQty(lowStockCount)}
                label="Low Stock"
                onPress={() => openAlerts('lowStock')}
                icon={SEVERITY.lowStock.icon}
                iconColor="#D97706"
              />
              <StatTile
                value={formatQty(expiringCount)}
                label="Expiring Soon"
                onPress={() => openAlerts('expiringSoon')}
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

              <OutlineButton
                label={`View all ${expiredCount} expired items`}
                onPress={() => openAlerts('expired')}
              />
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

              {stockAlerts.lowStockProducts.slice(0, 5).map((alert: unknown, index: number) => (
                <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="lowStock" />
              ))}

              <OutlineButton
                label={`View all ${lowStockCount} low stock items`}
                onPress={() => openAlerts('lowStock')}
              />
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

              {stockAlerts.expiringSoonProducts.slice(0, 5).map((alert: unknown, index: number) => (
                <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expiringSoon" />
              ))}

              <OutlineButton
                label={`View all ${expiringCount} expiring items`}
                onPress={() => openAlerts('expiringSoon')}
              />
            </SectionCard>
          ) : null}
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default DashboardScreen;
