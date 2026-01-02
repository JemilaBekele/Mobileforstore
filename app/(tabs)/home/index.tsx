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

// Format number with commas
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

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
      case 'expired': return '$red12';
      case 'lowStock': return '$orange12';
      case 'expiringSoon': return '$yellow12';
      default: return '$orange12';
    }
  };

  const getSubTextColor = () => {
    switch (type) {
      case 'expired': return '$red10';
      case 'lowStock': return '$orange10';
      case 'expiringSoon': return '$yellow10';
      default: return '$orange10';
    }
  };

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
        <Text fontSize="$1" color={getSubTextColor()}>
          Batch: {alert.batchNumber || 'N/A'} • Qty: {formatNumber(alert.quantity || 0)} {alert.unit || 'unit'}
        </Text>
        {type === 'expired' && (
          <Text fontSize="$1" color={getSubTextColor()} fontStyle="italic">
            Expired: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
          </Text>
        )}
        {type === 'lowStock' && (
          <Text fontSize="$1" color={getSubTextColor()} fontStyle="italic">
            Warning at: {formatNumber(alert.warningQuantity || 0)}
          </Text>
        )}
        {type === 'expiringSoon' && (
          <Text fontSize="$1" color={getSubTextColor()} fontStyle="italic">
            Expires: {alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString() : 'Unknown date'}
          </Text>
        )}
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
              borderTopLeftRadius="$4" 
              borderTopRightRadius="$4" 
              padding="$4"
              maxHeight="85%"
              borderWidth={1}
              borderColor="$orange4"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack space="$4">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4 color="$orange12">{title}</H4>
                    <Button
                      size="$2"
                      circular
                      backgroundColor="$orange3"
                      onPress={onClose}
                    >
                      <Text color="$orange11">✕</Text>
                    </Button>
                  </XStack>

                  <Text fontSize="$2" color="$orange10">
                    Total: {items.length} items
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
                    />
                  </Fieldset>

                  {/* Search Results Summary */}
                  {searchQuery && (
                    <Card backgroundColor="$orange2" padding="$2" borderRadius="$2">
                      <Text fontSize="$2" color="$orange11">
                        Found {filteredItems.length} items matching &quot;{searchQuery}&quot;
                      </Text>
                    </Card>
                  )}

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
                        <AlertItem key={`${type}-${alert.id || index}`} alert={alert} type={type} />
                      ))
                    )}
                  </YStack>

                  <Button
                    backgroundColor="$orange3"
                    borderColor="$orange6"
                    borderWidth={1}
                    borderRadius="$4"
                    onPress={onClose}
                  >
                    <Text color="$orange11" fontWeight="600">Close</Text>
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
  if (isLoading && !refreshing && !dashboardData) {
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
        <YStack alignItems="center" padding="$3" backgroundColor="$red2" borderRadius="$3" minWidth={50}>
          <Text fontSize="$4" fontWeight="800" color="$red10">
            ❌ {stockAlerts.expiredProducts?.length || 0}
          </Text>
          <Text fontSize="$1" color="$red10" fontWeight="600">
            Expired
          </Text>
        </YStack>
        
        <YStack alignItems="center" padding="$3" backgroundColor="$orange2" borderRadius="$3" minWidth={50}>
          <Text fontSize="$4" fontWeight="800" color="$orange10">
            📉 {stockAlerts.lowStockProducts?.length || 0}
          </Text>
          <Text fontSize="$1" color="$orange10" fontWeight="600">
            Low Stock
          </Text>
        </YStack>
        
        <YStack alignItems="center" padding="$3" backgroundColor="$yellow2" borderRadius="$3" minWidth={100}>
          <Text fontSize="$4" fontWeight="800" color="$yellow10">
            ⏰ {stockAlerts.expiringSoonProducts?.length || 0}
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
                    
                    {stockAlerts.expiredProducts.slice(0, 5).map((alert: unknown, index: number) => (
                      <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expired" />
                    ))}

                    {stockAlerts.expiredProducts.length > 5 && (
                      <Button
                        size="$2"
                        backgroundColor="$red3"
                        borderColor="$red6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={() => setShowExpiredModal(true)}
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
                    
                    {stockAlerts.lowStockProducts.slice(0, 10).map((alert: unknown, index: number) => (
                      <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="lowStock" />
                    ))}

                    {stockAlerts.lowStockProducts.length > 10 && (
                      <Button
                        size="$2"
                        backgroundColor="$orange3"
                        borderColor="$orange6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={() => setShowLowStockModal(true)}
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
                    
                    {stockAlerts.expiringSoonProducts.slice(0, 10).map((alert: unknown, index: number) => (
                      <AlertItem key={generateAlertKey(alert, index)} alert={alert} type="expiringSoon" />
                    ))}

                    {stockAlerts.expiringSoonProducts.length > 10 && (
                      <Button
                        size="$2"
                        backgroundColor="$yellow3"
                        borderColor="$yellow6"
                        borderWidth={1}
                        borderRadius="$3"
                        onPress={() => setShowExpiringSoonModal(true)}
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