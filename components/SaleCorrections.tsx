// Sale corrections on the order detail screen (same as the web StoreOrder
// page): a return (negative quantity) brings stock back into the shop, an
// extra delivery (positive quantity) takes more out. The store ticks the
// lines it actually handled and approves them; lines left unticked stay
// pending (correction becomes PARTIAL). A correction can be rejected only
// while nothing of it has been approved.
import React, { useState } from 'react';
import { YStack, XStack, Text, Button, Spinner, ScrollView } from 'tamagui';
import {
  Alert,
  Modal as RNModal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveSaleCorrection,
  getSaleCorrections,
  rejectSaleCorrection,
} from '@/(services)/api/sell';
import type {
  SellStockCorrection,
  SellStockCorrectionItem,
  SellStockCorrectionStatus,
} from '@/(utils)/types';
import { formatMoney, toNumber } from '@/(utils)/format';
import { AppColors } from '@/constants/colors';

const C = {
  accent: AppColors.primary,
  accentTint: AppColors.primaryLight,
  text: AppColors.textPrimary,
  label: AppColors.textSecondaryStrong,
  muted: AppColors.textSecondary,
  border: AppColors.border,
  subtle: AppColors.surfaceMuted,
  danger: AppColors.error,
  success: '#166534',
};

const STATUS: Record<SellStockCorrectionStatus, { label: string; bg: string; fg: string }> = {
  PENDING: { label: 'Pending', bg: '#FEF3C7', fg: '#92400E' },
  PARTIAL: { label: 'Partly approved', bg: '#FFF7ED', fg: '#C2410C' },
  APPROVED: { label: 'Approved', bg: '#DCFCE7', fg: '#166534' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', fg: '#991B1B' },
};

const Pill = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
  <YStack backgroundColor={bg} paddingHorizontal={10} paddingVertical={3} borderRadius={999}>
    <Text color={fg} fontSize={12} fontWeight="700">
      {label}
    </Text>
  </YStack>
);

const itemName = (item: SellStockCorrectionItem) => {
  const name = item.product?.name || 'Product';
  return item.subProduct?.name ? `${name} · ${item.subProduct.name}` : name;
};

const isReturn = (item: SellStockCorrectionItem) => item.quantity < 0;

const canAct = (correction: SellStockCorrection) =>
  correction.status === 'PENDING' || correction.status === 'PARTIAL';

const pendingItems = (correction: SellStockCorrection) =>
  (correction.items || []).filter((item) => item.itemSaleStatus === 'PENDING');

function CorrectionLine({ item }: { item: SellStockCorrectionItem }) {
  const back = isReturn(item);
  const delivered = item.itemSaleStatus === 'DELIVERED';
  const unit = item.unitOfMeasure?.symbol || item.unitOfMeasure?.name || 'units';
  return (
    <YStack
      backgroundColor={C.subtle}
      borderWidth={1}
      borderColor={C.border}
      borderRadius={10}
      padding={10}
      gap={4}
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap={8}>
        <Text flex={1} fontWeight="600" color={C.text} numberOfLines={2}>
          {itemName(item)}
        </Text>
        <Text fontWeight="700" color={back ? C.success : C.danger}>
          {back ? '' : '+'}
          {item.quantity} {unit}
        </Text>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text fontSize={12} color={C.muted} flex={1}>
          {back ? 'Return to stock' : 'Extra delivery'}
          {item.shop?.name ? ` · ${item.shop.name}` : ''}
        </Text>
        <Text fontSize={12} color={C.muted}>
          {formatMoney(Math.abs(toNumber(item.totalPrice)))}
        </Text>
      </XStack>
      {item.batches && item.batches.length > 0 ? (
        <Text fontSize={12} color={C.muted}>
          Batch:{' '}
          {item.batches
            .map((b) => `${b.batch?.batchNumber || b.batchId.slice(-6)} (${Math.abs(b.quantity)})`)
            .join(', ')}
        </Text>
      ) : null}
      <XStack>
        <Pill
          label={delivered ? 'Done' : 'Pending'}
          bg={delivered ? '#DCFCE7' : '#FEF3C7'}
          fg={delivered ? '#166534' : '#92400E'}
        />
      </XStack>
    </YStack>
  );
}

export default function SaleCorrections({
  sellId,
  onChanged,
}: {
  sellId: string;
  onChanged?: () => void; // the sale's totals change after an approval
}) {
  const queryClient = useQueryClient();
  const [approving, setApproving] = useState<SellStockCorrection | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);

  const { data: corrections = [], isLoading, error, refetch } = useQuery({
    queryKey: ['saleCorrections', sellId],
    queryFn: () => getSaleCorrections(sellId),
    enabled: !!sellId,
  });

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: ['saleCorrections', sellId] });
    queryClient.invalidateQueries({ queryKey: ['sell', sellId] });
    queryClient.invalidateQueries({ queryKey: ['sells'] });
    queryClient.invalidateQueries({ queryKey: ['availableBatches'] });
    onChanged?.();
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, itemIds }: { id: string; itemIds: string[] }) =>
      approveSaleCorrection(id, itemIds),
    onSuccess: (result) => {
      setApproving(null);
      setTicked([]);
      Alert.alert('Approved', result.message);
    },
    onError: (err: Error) => {
      setApproving(null);
      Alert.alert('Could not approve', err.message);
    },
    onSettled: afterChange,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectSaleCorrection(id),
    onSuccess: (result) => Alert.alert('Rejected', result.message),
    onError: (err: Error) => Alert.alert('Could not reject', err.message),
    onSettled: afterChange,
  });

  const busy = approveMutation.isPending || rejectMutation.isPending;

  const openApprove = (correction: SellStockCorrection) => {
    // Start with every pending line ticked; untick what wasn't handled yet
    setTicked(pendingItems(correction).map((item) => item.id));
    setApproving(correction);
  };

  const toggle = (itemId: string) =>
    setTicked((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );

  const confirmReject = (correction: SellStockCorrection) =>
    Alert.alert(
      'Reject correction?',
      'Nothing will be returned or delivered for this correction.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => rejectMutation.mutate(correction.id),
        },
      ]
    );

  if (isLoading) {
    return (
      <XStack justifyContent="center" padding={12}>
        <Spinner color={C.accent} />
      </XStack>
    );
  }

  if (error) {
    return (
      <YStack gap={8} borderWidth={1} borderColor={C.border} borderRadius={14} padding={14}>
        <Text color={C.danger}>{(error as Error).message}</Text>
        <Button size="$3" onPress={() => refetch()} backgroundColor="white" borderColor={C.border} borderWidth={1}>
          <Text color={C.text}>Try again</Text>
        </Button>
      </YStack>
    );
  }

  // Hide lines for other shops; drop corrections with nothing left to show
  const visible = corrections.filter((c) => (c.items || []).length > 0);
  if (visible.length === 0) return null;

  const pendingCount = visible.filter(canAct).length;

  return (
    <YStack gap={10}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text color={C.text} fontSize={16} fontWeight="700">
          Sale Corrections ({visible.length})
        </Text>
        {pendingCount > 0 ? (
          <Pill label={`${pendingCount} to review`} bg="#FEF3C7" fg="#92400E" />
        ) : null}
      </XStack>

      {visible.map((correction) => {
        const status = STATUS[correction.status] || STATUS.PENDING;
        const actionable = canAct(correction) && pendingItems(correction).length > 0;
        return (
          <YStack
            key={correction.id}
            backgroundColor="white"
            borderWidth={1}
            borderColor={C.border}
            borderLeftWidth={4}
            borderLeftColor={actionable ? C.accent : C.border}
            borderRadius={14}
            padding={14}
            gap={10}
          >
            <XStack justifyContent="space-between" alignItems="center" gap={8}>
              <YStack flex={1}>
                <Text fontWeight="700" color={C.text}>
                  {correction.reference || 'Correction'}
                </Text>
                <Text fontSize={12} color={C.muted}>
                  {new Date(correction.createdAt).toLocaleString()}
                  {correction.createdBy?.name ? ` · ${correction.createdBy.name}` : ''}
                </Text>
              </YStack>
              <Pill label={status.label} bg={status.bg} fg={status.fg} />
            </XStack>

            {correction.notes ? (
              <YStack backgroundColor={C.subtle} borderRadius={8} padding={10}>
                <Text fontSize={13} color={C.label}>
                  {correction.notes}
                </Text>
              </YStack>
            ) : null}

            <YStack gap={8}>
              {(correction.items || []).map((item) => (
                <CorrectionLine key={item.id} item={item} />
              ))}
            </YStack>

            {actionable ? (
              <XStack gap={8}>
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor={C.accent}
                  borderWidth={0}
                  borderRadius={10}
                  pressStyle={{ backgroundColor: AppColors.primaryDark }}
                  disabled={busy}
                  opacity={busy ? 0.7 : 1}
                  onPress={() => openApprove(correction)}
                  icon={<Ionicons name="checkmark-circle-outline" size={16} color="white" />}
                >
                  <Text color="white" fontWeight="700">
                    Approve
                  </Text>
                </Button>
                {correction.status === 'PENDING' ? (
                  <Button
                    flex={1}
                    size="$3"
                    backgroundColor="white"
                    borderColor={C.danger}
                    borderWidth={1}
                    borderRadius={10}
                    pressStyle={{ backgroundColor: '#FEF2F2', borderColor: C.danger }}
                    disabled={busy}
                    opacity={busy ? 0.7 : 1}
                    onPress={() => confirmReject(correction)}
                    icon={<Ionicons name="close-circle-outline" size={16} color={C.danger} />}
                  >
                    <Text color={C.danger} fontWeight="700">
                      Reject
                    </Text>
                  </Button>
                ) : null}
              </XStack>
            ) : null}
          </YStack>
        );
      })}

      {/* Approve sheet: tick the lines actually handed over / taken back */}
      <RNModal
        visible={!!approving}
        animationType="slide"
        transparent
        onRequestClose={() => !busy && setApproving(null)}
      >
        <TouchableWithoutFeedback onPress={() => !busy && setApproving(null)}>
          <YStack flex={1} backgroundColor="rgba(0,0,0,0.4)" justifyContent="flex-end">
            <TouchableWithoutFeedback>
              <YStack
                backgroundColor="white"
                borderTopLeftRadius={20}
                borderTopRightRadius={20}
                padding={16}
                gap={12}
                maxHeight="85%"
              >
                <YStack gap={2}>
                  <Text color={C.text} fontSize={20} fontWeight="700">
                    Approve correction
                  </Text>
                  <Text color={C.muted} fontSize={13}>
                    Tick the items that were returned or delivered. Unticked items stay pending.
                  </Text>
                </YStack>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <YStack gap={8}>
                    {approving
                      ? pendingItems(approving).map((item) => {
                          const on = ticked.includes(item.id);
                          const back = isReturn(item);
                          return (
                            <Pressable key={item.id} onPress={() => toggle(item.id)}>
                              <XStack
                                alignItems="center"
                                gap={10}
                                padding={12}
                                borderRadius={10}
                                borderWidth={1}
                                borderColor={on ? '#86EFAC' : C.border}
                                backgroundColor={on ? '#F0FDF4' : 'white'}
                              >
                                <Ionicons
                                  name={on ? 'checkbox' : 'square-outline'}
                                  size={22}
                                  color={on ? C.success : C.muted}
                                />
                                <YStack flex={1}>
                                  <Text fontWeight="600" color={C.text} numberOfLines={2}>
                                    {itemName(item)}
                                  </Text>
                                  <Text fontSize={12} color={C.muted}>
                                    {back ? 'Return' : 'Extra delivery'} · {Math.abs(item.quantity)}{' '}
                                    {item.unitOfMeasure?.symbol || 'units'}
                                    {item.shop?.name ? ` · ${item.shop.name}` : ''}
                                  </Text>
                                </YStack>
                              </XStack>
                            </Pressable>
                          );
                        })
                      : null}
                  </YStack>
                </ScrollView>

                <XStack gap={8}>
                  <Button
                    flex={1}
                    backgroundColor="white"
                    borderColor={C.border}
                    borderWidth={1}
                    borderRadius={10}
                    disabled={busy}
                    onPress={() => setApproving(null)}
                  >
                    <Text color={C.text} fontWeight="600">
                      Cancel
                    </Text>
                  </Button>
                  <Button
                    flex={1}
                    backgroundColor="#16A34A"
                    borderWidth={0}
                    borderRadius={10}
                    pressStyle={{ backgroundColor: '#15803D' }}
                    disabled={busy || ticked.length === 0}
                    opacity={busy || ticked.length === 0 ? 0.6 : 1}
                    onPress={() =>
                      approving &&
                      approveMutation.mutate({ id: approving.id, itemIds: ticked })
                    }
                  >
                    {approveMutation.isPending ? (
                      <Spinner size="small" color="white" />
                    ) : (
                      <Text color="white" fontWeight="700">
                        Approve {ticked.length} item{ticked.length === 1 ? '' : 's'}
                      </Text>
                    )}
                  </Button>
                </XStack>
              </YStack>
            </TouchableWithoutFeedback>
          </YStack>
        </TouchableWithoutFeedback>
      </RNModal>
    </YStack>
  );
}
