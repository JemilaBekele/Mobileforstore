import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserDashboardSummary } from '@/(services)/api/dashboard';
import { formatQty, toNumber } from '@/(utils)/format';
import {
  AlertType,
  SEVERITY,
  StockAlertItem,
} from '@/components/stock-alert-item';

const TABS: AlertType[] = ['lowStock', 'expired', 'expiringSoon'];

const isAlertType = (value: unknown): value is AlertType =>
  typeof value === 'string' && (TABS as string[]).includes(value);

const time = (value?: string | null) =>
  value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;

// Most urgent first: lowest stock relative to its alert level, oldest expiry,
// soonest expiry
const sortAlerts = (items: any[], type: AlertType) => {
  const sorted = [...items];
  if (type === 'lowStock') {
    sorted.sort((a, b) => toNumber(a.quantity) - toNumber(b.quantity));
  } else {
    sorted.sort((a, b) => time(a.expiryDate) - time(b.expiryDate));
  }
  return sorted;
};

const matches = (item: any, query: string) =>
  [item.name, item.productCode, item.batchNumber, item.locationName].some((field) =>
    String(field || '').toLowerCase().includes(query)
  );

// Full list of low-stock, expired and expiring-soon stock in the user's shops
// and stores. Opened from "View all" on the dashboard; ?type= picks the tab.
export default function StockAlertsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const [activeTab, setActiveTab] = useState<AlertType>(
    isAlertType(params.type) ? params.type : 'lowStock'
  );
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Same query as the dashboard, so the list opens instantly from cache
  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getUserDashboardSummary({}),
  });

  const lists: Record<AlertType, any[]> = {
    lowStock: data?.stockAlerts?.lowStockProducts || [],
    expired: data?.stockAlerts?.expiredProducts || [],
    expiringSoon: data?.stockAlerts?.expiringSoonProducts || [],
  };
  const activeList = lists[activeTab];

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? activeList.filter((item) => matches(item, query)) : activeList;
    return sortAlerts(filtered, activeTab);
  }, [activeList, activeTab, search]);

  const header = (
    <YStack gap={12} paddingBottom={12}>
      {/* Tabs */}
      <XStack gap={8}>
        {TABS.map((tab) => {
          const selected = tab === activeTab;
          const severity = SEVERITY[tab];
          return (
            <TouchableOpacity
              key={tab}
              style={{ flex: 1 }}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <YStack
                alignItems="center"
                paddingVertical={10}
                borderRadius={12}
                borderWidth={1}
                borderColor={selected ? '#FF6B00' : '#E5E7EB'}
                backgroundColor={selected ? '#FFF7ED' : '#FFFFFF'}
                gap={2}
              >
                <Ionicons name={severity.icon} size={18} color={severity.iconColor} />
                <Text fontSize={18} fontWeight="800" color="#111827">
                  {formatQty(lists[tab].length)}
                </Text>
                <Text
                  fontSize={12}
                  fontWeight="600"
                  color={selected ? '#FF6B00' : '#6B7280'}
                  numberOfLines={1}
                >
                  {severity.title}
                </Text>
              </YStack>
            </TouchableOpacity>
          );
        })}
      </XStack>

      {/* Search */}
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
          placeholder="Search name, code, batch or location"
          value={search}
          onChangeText={setSearch}
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
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 10 }} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </XStack>

      <Text fontSize={13} color="#6B7280">
        {search
          ? `${formatQty(items.length)} of ${formatQty(activeList.length)} items match "${search}"`
          : `${formatQty(activeList.length)} items · ${
              activeTab === 'lowStock' ? 'lowest stock first' : 'earliest expiry first'
            }`}
      </Text>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      {/* Title bar */}
      <XStack
        alignItems="center"
        gap={8}
        paddingHorizontal={12}
        paddingTop={16}
        paddingBottom={12}
        borderBottomWidth={1}
        borderBottomColor="#E5E7EB"
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text flex={1} fontSize={20} fontWeight="700" color="#111827">
          Stock alerts
        </Text>
      </XStack>

      {isLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={8}>
          <Spinner size="large" color="#FF6B00" />
          <Text color="#6B7280">Loading alerts...</Text>
        </YStack>
      ) : error && !data ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={16} gap={12}>
          <Ionicons name="cloud-offline-outline" size={36} color="#9CA3AF" />
          <Text color="#111827" fontWeight="700">Could not load alerts</Text>
          <Text color="#6B7280" textAlign="center">{(error as Error).message}</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text color="#FF6B00" fontWeight="700">Try again</Text>
          </TouchableOpacity>
        </YStack>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) =>
            `${activeTab}-${item.id || ''}-${item.batchId || ''}-${item.locationName || ''}-${index}`
          }
          renderItem={({ item }) => <StockAlertItem alert={item} type={activeTab} />}
          ItemSeparatorComponent={() => <YStack height={8} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <YStack alignItems="center" padding={24} gap={8}>
              <Ionicons
                name={search ? 'search-outline' : 'checkmark-circle-outline'}
                size={32}
                color={search ? '#9CA3AF' : '#16A34A'}
              />
              <Text color="#6B7280" textAlign="center">
                {search
                  ? 'No items match your search'
                  : `No ${SEVERITY[activeTab].title.toLowerCase()} items`}
              </Text>
            </YStack>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
        />
      )}
    </YStack>
  );
}
