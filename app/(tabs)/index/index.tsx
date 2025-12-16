import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  RefreshControl,
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
  Progress,
} from 'tamagui';
import type { AppDispatch } from '@/(redux)/store';
import { useFocusEffect, router } from 'expo-router';

// Redux imports
import {
  fetchUserDashboardSummary,
  selectDashboardSummary,
  selectDashboardLoading,
  selectDashboardError,
  selectLastUpdated,
  selectPendingDelivery,
  selectShopStockSummary,
  selectStoreStockSummary,
  selectStockAlerts,
  selectTotalSales,
  selectDeliveredItemsCount,
  selectTotalPendingItems,
  selectShopsWithPending,
  selectTotalAlerts,
  selectCriticalAlerts,
  selectDeliveryPerformance,
  selectAlertSummary,
} from '@/(redux)/dashboard';

// Auth imports
import { selectIsAuthenticated } from '@/(redux)/authSlice';

// Socket imports
import { useSocketSafe } from '@/(redux)/notification';
import { Notification } from '@/(services)/socket';

const DashboardScreen = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Auth state
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Redux state
  const summary = useSelector(selectDashboardSummary);
  const loading = useSelector(selectDashboardLoading);
  const error = useSelector(selectDashboardError);
  const lastUpdated = useSelector(selectLastUpdated);
  
  // Safe selectors that won't throw errors
  const pendingDelivery = useSelector(selectPendingDelivery);
  const shopStock = useSelector(selectShopStockSummary);
  const storeStock = useSelector(selectStoreStockSummary);
  const stockAlerts = useSelector(selectStockAlerts);
  const totalSales = useSelector(selectTotalSales);
  const deliveredItems = useSelector(selectDeliveredItemsCount);
  const totalPending = useSelector(selectTotalPendingItems);
  const shopsWithPending = useSelector(selectShopsWithPending);
  const totalAlerts = useSelector(selectTotalAlerts);
  const criticalAlerts = useSelector(selectCriticalAlerts);
  const deliveryPerformance = useSelector(selectDeliveryPerformance);
  const alertSummary = useSelector(selectAlertSummary);

  // Socket hook
  const { onNotification, isConnected } = useSocketSafe();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setShowNotificationBadge] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🔐 User not authenticated, redirecting to login...');
      router.replace('/(auth)/login' as any);
    }
  }, [isAuthenticated]);

  // Load dashboard data only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 Initial dashboard data load...');
      dispatch(fetchUserDashboardSummary({}));
    }
  }, [dispatch, isAuthenticated]);

  // Setup real-time notification listener only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewNotification = (notification: Notification) => {
      console.log('📢 Real-time notification received on dashboard:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show notification badge
      setShowNotificationBadge(true);
      
      // Show alert to user
      Alert.alert(
        '🚨 New Sale Approved!',
        notification.message,
        [
          { 
            text: 'View', 
            onPress: () => {
              setShowNotificationBadge(false);
              // Refresh data to show latest pending deliveries
              dispatch(fetchUserDashboardSummary({}));
            }
          },
        
        ]
      );

      // Auto-refresh dashboard data to show updated pending deliveries
      setTimeout(() => {
        dispatch(fetchUserDashboardSummary({}));
      }, 1000);
    };

    // Register notification listener
    onNotification(handleNewNotification);

    // Cleanup is handled by the useSocket hook
  }, [onNotification, dispatch, isAuthenticated]);

  // Refresh data when screen comes into focus only when authenticated
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated) return;

      dispatch(fetchUserDashboardSummary({}));
      
      // Clear notification badge when user comes to dashboard
      setShowNotificationBadge(false);
    }, [dispatch, isAuthenticated])
  );

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Checking authentication...
        </Text>
      </YStack>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchUserDashboardSummary({})).unwrap();
    } catch {
      // Error is already handled by the Redux state
    } finally {
      setRefreshing(false);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotificationBadge(false);
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Generate unique key for alert items
  const generateAlertKey = (alert: any, index: number) => {
    // Try to use a combination of properties for a unique key
    const parts = [
      alert.id,
      alert.productId,
      alert.productCode,
      alert.batchNumber,
      alert.locationId,
      index.toString()
    ];
    
    // Filter out falsy values and join with dash
    return parts.filter(Boolean).join('-') || `alert-${Date.now()}-${index}`;
  };

  // Show empty state when no data after loading
  if (!loading && !refreshing && !summary) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1" padding="$4">
        <Text fontSize="$8" marginBottom="$4">📊</Text>
        <H3 color="$orange11" textAlign="center" marginBottom="$2">
          No Dashboard Data
        </H3>
        <Text color="$orange9" textAlign="center" marginBottom="$4">
          Unable to load dashboard information. Please check your connection and try again.
        </Text>
        <Button
          backgroundColor="$orange9"
          onPress={handleRefresh}
        >
          <Text color="white" fontWeight="600">
            Try Again
          </Text>
        </Button>
      </YStack>
    );
  }

  // Show loading state during initial load
  if (loading && !refreshing && !summary) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Loading alerts...
        </Text>
        <Text marginTop="$2" color="$orange9" fontSize="$2" textAlign="center">
          Fetching your alert data
        </Text>
      </YStack>
    );
  }

  // Safe data extraction
  const userShopsCount = summary?.userShopsCount || 0;
  const userStoresCount = summary?.userStoresCount || 0;
  const approvedSalesCount = summary?.approvedSalesCount || 0;

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
        {refreshing && (
          <XStack justifyContent="center" padding="$2" backgroundColor="$orange2">
            <Spinner size="small" color="$orange9" />
            <Text marginLeft="$2" color="$orange11" fontSize="$2">
              Refreshing alerts...
            </Text>
          </XStack>
        )}

        <YStack space="$4" padding="$4">
          {/* Header with User Info */}
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
                <H2 fontWeight="bold" color="$orange12">
                  ⚠️ Alerts Dashboard
                </H2>
                
                {/* Quick Stats Row */}
                <XStack space="$3" flexWrap="wrap" justifyContent="center">
                  <YStack alignItems="center" padding="$2" minWidth={80}>
                    <Text fontSize="$4" fontWeight="700" color="$orange12">
                      🏪 {userShopsCount}
                    </Text>
                    <Text fontSize="$1" color="$orange10" textAlign="center">
                      Shops
                    </Text>
                  </YStack>
                  
                  <YStack alignItems="center" padding="$2" minWidth={80}>
                    <Text fontSize="$4" fontWeight="700" color="$orange12">
                      🏬 {userStoresCount}
                    </Text>
                    <Text fontSize="$1" color="$orange10" textAlign="center">
                      Stores
                    </Text>
                  </YStack>
                  
                  <YStack alignItems="center" padding="$2" minWidth={80}>
                    <Text fontSize="$4" fontWeight="700" color="$orange12">
                      ⚠️ {criticalAlerts}
                    </Text>
                    <Text fontSize="$1" color="$orange10" textAlign="center">
                      Critical Alerts
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </Card.Header>
          </Card>

          {/* Rest of your dashboard content remains the same */}
          {notifications.length > 0 && (
            <Card 
              elevate 
              bordered 
              borderRadius="$4" 
              backgroundColor="$blue1"
              borderColor="$blue4"
            >
              <Card.Header padded>
                <YStack space="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4 color="$blue12">🔔 Real-time Updates</H4>
                    <Button
                      size="$1"
                      backgroundColor="$blue3"
                      onPress={clearNotifications}
                    >
                      <Text color="$blue11" fontSize="$1">
                        Clear
                      </Text>
                    </Button>
                  </XStack>
                  
                  {notifications.slice(0, 3).map((notification, index) => (
                    <Card 
                      key={`notification-${notification.id || notification.createdAt || index}`} 
                      backgroundColor="$blue2" 
                      padding="$3" 
                      borderRadius="$3" 
                      marginVertical="$1"
                    >
                      <YStack space="$1">
                        <Text fontSize="$3" fontWeight="600" color="$blue12">
                          {notification.title}
                        </Text>
                        <Text fontSize="$2" color="$blue10">
                          {notification.message}
                        </Text>
                        <Text fontSize="$1" color="$blue9">
                          {new Date(notification.createdAt).toLocaleTimeString()}
                        </Text>
                      </YStack>
                    </Card>
                  ))}
                  
                  {notifications.length > 3 && (
                    <Text fontSize="$1" color="$blue9" textAlign="center">
                      +{notifications.length - 3} more notifications
                    </Text>
                  )}
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Show loading overlay during refresh */}
          {refreshing && (
            <Card backgroundColor="$orange2" padding="$3" borderRadius="$3">
              <XStack alignItems="center" justifyContent="center" space="$3">
                <Spinner size="small" color="$orange9" />
                <Text color="$orange11" fontSize="$3" fontWeight="600">
                  Updating alert data...
                </Text>
              </XStack>
            </Card>
          )}

          {/* Alerts Content */}
          <YStack space="$4">
            {/* Alert Summary */}
            <Card 
              elevate 
              bordered 
              borderRadius="$4" 
              backgroundColor="$orange1"
              borderColor="$orange4"
            >
              <Card.Header padded>
                <YStack space="$3">
                  <H4 color="$orange12">⚠️ Alert Summary</H4>
                  
                  <XStack space="$3" flexWrap="wrap" justifyContent="center">
                    <YStack alignItems="center" padding="$3" backgroundColor="$red2" borderRadius="$3" minWidth={100}>
                      <Text fontSize="$4" fontWeight="800" color="$red10">
                        ❌ {alertSummary.expired}
                      </Text>
                      <Text fontSize="$1" color="$red10" fontWeight="600">
                        Expired
                      </Text>
                    </YStack>
                    
                    <YStack alignItems="center" padding="$3" backgroundColor="$orange2" borderRadius="$3" minWidth={100}>
                      <Text fontSize="$4" fontWeight="800" color="$orange10">
                        📉 {alertSummary.lowStock}
                      </Text>
                      <Text fontSize="$1" color="$orange10" fontWeight="600">
                        Low Stock
                      </Text>
                    </YStack>
                    
                    <YStack alignItems="center" padding="$3" backgroundColor="$yellow2" borderRadius="$3" minWidth={100}>
                      <Text fontSize="$4" fontWeight="800" color="$yellow10">
                        ⏰ {alertSummary.expiringSoon}
                      </Text>
                      <Text fontSize="$1" color="$yellow10" fontWeight="600">
                        Expiring Soon
                      </Text>
                    </YStack>
                  </XStack>

                  <Text fontSize="$2" color="$orange10" textAlign="center">
                    Total Alerts: {totalAlerts}
                  </Text>
                </YStack>
              </Card.Header>
            </Card>

            {/* Show empty state if no alerts */}
            {totalAlerts === 0 && (
              <Card backgroundColor="$green1" padding="$4" borderRadius="$4">
                <YStack alignItems="center" space="$2">
                  <Text fontSize="$6">✅</Text>
                  <Text fontSize="$4" fontWeight="600" color="$green11" textAlign="center">
                    No Active Alerts
                  </Text>
                  <Text fontSize="$2" color="$green9" textAlign="center">
                    Great job! All systems are running smoothly.
                  </Text>
                </YStack>
              </Card>
            )}

            {/* Expired Products */}
            {stockAlerts.expiredProducts && stockAlerts.expiredProducts.length > 0 && (
              <Card 
                elevate 
                bordered 
                borderRadius="$4" 
                backgroundColor="$red1"
                borderColor="$red4"
              >
                <Card.Header padded>
                  <YStack space="$3">
                    <H4 color="$red12">❌ Expired Products</H4>
                    
                    {stockAlerts.expiredProducts.slice(0, 5).map((alert, index) => (
                      <Card 
                        key={generateAlertKey(alert, index)} 
                        backgroundColor="$red2" 
                        padding="$3" 
                        borderRadius="$3" 
                        marginVertical="$1"
                      >
                        <YStack space="$2">
                          <Text fontSize="$3" fontWeight="600" color="$red12">
                            {alert.name || 'Unknown Product'}
                          </Text>
                          <Text fontSize="$1" color="$red10">
                            {alert.locationName || 'Unknown Location'} • {alert.productCode || 'N/A'}
                          </Text>
                          <Text fontSize="$1" color="$red10">
                            Batch: {alert.batchNumber || 'N/A'} • Qty: {formatNumber(alert.quantity || 0)} {alert.unit || 'unit'}
                          </Text>
                          <Text fontSize="$1" color="$red10" fontStyle="italic">
                            Expired: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
                          </Text>
                        </YStack>
                      </Card>
                    ))}

                    {stockAlerts.expiredProducts.length > 5 && (
                      <Button
                        size="$2"
                        backgroundColor="$red3"
                        borderColor="$red6"
                        borderWidth={1}
                        borderRadius="$3"
                      >
                        <Text color="$red11" fontWeight="600">
                          View all {stockAlerts.expiredProducts.length} expired items
                        </Text>
                      </Button>
                    )}
                  </YStack>
                </Card.Header>
              </Card>
            )}

            {/* Low Stock Products */}
            {stockAlerts.lowStockProducts && stockAlerts.lowStockProducts.length > 0 && (
              <Card 
                elevate 
                bordered 
                borderRadius="$4" 
                backgroundColor="$orange1"
                borderColor="$orange4"
              >
                <Card.Header padded>
                  <YStack space="$3">
                    <H4 color="$orange12">📉 Low Stock Products</H4>
                    
                    {stockAlerts.lowStockProducts.slice(0, 50).map((alert, index) => (
                      <Card 
                        key={generateAlertKey(alert, index)} 
                        backgroundColor="$orange2" 
                        padding="$3" 
                        borderRadius="$3" 
                        marginVertical="$1"
                      >
                        <YStack space="$2">
                          <Text fontSize="$3" fontWeight="600" color="$orange12">
                            {alert.name || 'Unknown Product'}
                          </Text>
                          <Text fontSize="$1" color="$orange10">
                            {alert.locationName || 'Unknown Location'} • {alert.productCode || 'N/A'}
                          </Text>
                          <Text fontSize="$1" color="$orange10">
                            Batch: {alert.batchNumber || 'N/A'} • Qty: {formatNumber(alert.quantity || 0)} {alert.unit || 'unit'}
                          </Text>
                          <Text fontSize="$1" color="$orange10" fontStyle="italic">
                            Warning at: {formatNumber(alert.warningQuantity || 0)}
                          </Text>
                        </YStack>
                      </Card>
                    ))}

                    {stockAlerts.lowStockProducts.length > 50 && (
                      <Button
                        size="$2"
                        backgroundColor="$orange3"
                        borderColor="$orange6"
                        borderWidth={1}
                        borderRadius="$3"
                      >
                        <Text color="$orange11" fontWeight="600">
                          View all {stockAlerts.lowStockProducts.length} low stock items
                        </Text>
                      </Button>
                    )}
                  </YStack>
                </Card.Header>
              </Card>
            )}

            {/* Expiring Soon Products */}
            {stockAlerts.expiringSoonProducts && stockAlerts.expiringSoonProducts.length > 0 && (
              <Card 
                elevate 
                bordered 
                borderRadius="$4" 
                backgroundColor="$yellow1"
                borderColor="$yellow4"
              >
                <Card.Header padded>
                  <YStack space="$3">
                    <H4 color="$yellow12">⏰ Expiring Soon</H4>
                    
                    {stockAlerts.expiringSoonProducts.slice(0, 50).map((alert, index) => (
                      <Card 
                        key={generateAlertKey(alert, index)} 
                        backgroundColor="$yellow2" 
                        padding="$3" 
                        borderRadius="$3" 
                        marginVertical="$1"
                      >
                        <YStack space="$2">
                          <Text fontSize="$3" fontWeight="600" color="$yellow12">
                            {alert.name || 'Unknown Product'}
                          </Text>
                          <Text fontSize="$1" color="$yellow10">
                            {alert.locationName || 'Unknown Location'} • {alert.productCode || 'N/A'}
                          </Text>
                          <Text fontSize="$1" color="$yellow10">
                            Batch: {alert.batchNumber || 'N/A'} • Qty: {formatNumber(alert.quantity || 0)} {alert.unit || 'unit'}
                          </Text>
                          <Text fontSize="$1" color="$yellow10" fontStyle="italic">
                            Expires: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
                          </Text>
                        </YStack>
                      </Card>
                    ))}

                    {stockAlerts.expiringSoonProducts.length > 50 && (
                      <Button
                        size="$2"
                        backgroundColor="$yellow3"
                        borderColor="$yellow6"
                        borderWidth={1}
                        borderRadius="$3"
                      >
                        <Text color="$yellow11" fontWeight="600">
                          View all {stockAlerts.expiringSoonProducts.length} expiring items
                        </Text>
                      </Button>
                    )}
                  </YStack>
                </Card.Header>
              </Card>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default DashboardScreen;