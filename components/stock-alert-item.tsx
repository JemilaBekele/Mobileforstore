import React from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { formatQty, toNumber } from '@/(utils)/format';

export type AlertType = 'expired' | 'lowStock' | 'expiringSoon';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Severity look: only shown through the small pill / icon
export const SEVERITY: Record<
  AlertType,
  { label: string; title: string; bg: string; fg: string; iconColor: string; icon: IconName }
> = {
  expired: {
    label: 'Expired',
    title: 'Expired',
    bg: '#FEE2E2',
    fg: '#991B1B',
    iconColor: '#DC2626',
    icon: 'close-circle-outline',
  },
  lowStock: {
    label: 'Low stock',
    title: 'Low stock',
    bg: '#FEF3C7',
    fg: '#92400E',
    iconColor: '#D97706',
    icon: 'trending-down-outline',
  },
  expiringSoon: {
    label: 'Expiring soon',
    title: 'Expiring soon',
    bg: '#FEF3C7',
    fg: '#92400E',
    iconColor: '#D97706',
    icon: 'time-outline',
  },
};

// Small tinted pill
export const Pill = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <YStack paddingHorizontal={8} paddingVertical={3} borderRadius={999} backgroundColor={bg}>
    <Text fontSize={11} fontWeight="700" color={fg}>
      {label}
    </Text>
  </YStack>
);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : 'Unknown date';

// Whole days from today until the date (negative when it has passed)
export const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

// One row of the low-stock / expired / expiring-soon lists
export const StockAlertItem = ({ alert, type }: { alert: any; type: AlertType }) => {
  const severity = SEVERITY[type];
  const unit = alert.unit || 'unit';
  const quantity = toNumber(alert.quantity);
  const warningQuantity = toNumber(alert.warningQuantity);
  const days = daysUntil(alert.expiryDate);

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
          Expired: {formatDate(alert.expiryDate)}
          {days !== null && days < 0 ? ` (${formatQty(-days)} days ago)` : ''}
        </Text>
      ) : null}
      {type === 'expiringSoon' ? (
        <Text fontSize={12} color="#374151">
          Expires: {formatDate(alert.expiryDate)}
          {days !== null && days >= 0 ? ` (in ${formatQty(days)} days)` : ''}
        </Text>
      ) : null}
    </YStack>
  );
};
