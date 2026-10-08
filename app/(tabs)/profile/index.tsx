import React, { useState } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import {
  Text,
  XStack,
  YStack,
  Button,
  ScrollView,
  Spinner,
  Avatar,
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/(redux)/hooks';
import type { AppDispatch } from '@/(redux)/store';
import { logout, logoutAction } from "@/(redux)/authSlice";

type ProfileRoute = 'Profile' | 'Password' | 'Waitlists';

// Menu row inside a shared white card
const ProfileMenuItem = ({
  icon,
  title,
  onPress,
  isDestructive = false,
  showArrow = true,
  disabled = false,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  showArrow?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}) => (
  <XStack
    alignItems="center"
    justifyContent="space-between"
    paddingHorizontal={16}
    paddingVertical={14}
    backgroundColor="white"
    borderBottomWidth={isLast ? 0 : 1}
    borderBottomColor="#F3F4F6"
    onPress={disabled ? undefined : onPress}
    opacity={disabled ? 0.5 : 1}
    pressStyle={{ backgroundColor: '#F9FAFB' }}
    cursor="pointer"
  >
    <XStack alignItems="center" gap={12}>
      <YStack
        width={36}
        height={36}
        borderRadius={10}
        alignItems="center"
        justifyContent="center"
        backgroundColor={isDestructive ? '#FEF2F2' : '#FFF7ED'}
      >
        <Ionicons name={icon} size={18} color={isDestructive ? '#DC2626' : '#FF6B00'} />
      </YStack>
      <Text fontSize={15} color={isDestructive ? '#DC2626' : '#111827'} fontWeight="600">
        {title}
      </Text>
    </XStack>
    {showArrow ? <Ionicons name="chevron-forward" size={18} color="#9CA3AF" /> : null}
  </XStack>
);

const UserInfoCard = ({ label, value }: { label: string; value: string }) => (
  <XStack justifyContent="space-between" alignItems="center" paddingVertical={10}>
    <Text fontSize={14} color="#6B7280">{label}</Text>
    <Text fontSize={14} color="#111827" fontWeight="600">{value}</Text>
  </XStack>
);

const Profile = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useAppSelector((state) => state.auth.user);
  const loading = useAppSelector((state) => state.auth.loading);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Access user data with proper fallbacks
  const fullName = user?.name || 'Guest';
  const email = user?.email || '';
  const role = user?.role || 'User';
  const branch = user?.branch;

  const handleNavigation = (route: ProfileRoute) => {
    router.push(`/(tabs)/profile/${route}` as any);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutModal(false);

      await dispatch(logout()).unwrap();

      // Simply replace with the root screen - no dismissAll needed
      router.replace("/(auth)/login");

    } catch (error: any) {
      console.error("Logout process error:", error);
      dispatch(logoutAction());

      // Force redirect even if logout fails
      router.replace("/(auth)/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading && !isLoggingOut) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#FFFFFF" gap={8}>
        <Spinner size="large" color="#FF6B00" />
        <Text color="#6B7280" fontSize={14} fontWeight="500">
          Loading profile...
        </Text>
      </YStack>
    );
  }

  const roleValue = typeof role === 'string' ? role : role?.name || 'User';
  const branchValue = typeof branch === 'string' ? branch : branch?.name || 'Not assigned';

  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16}>
          <YStack paddingBottom={4}>
            <Text fontSize={24} fontWeight="700" color="#111827">Profile</Text>
            <Text fontSize={14} color="#6B7280">Your account and settings</Text>
          </YStack>

          {/* Profile Header */}
          <YStack
            backgroundColor="white"
            borderWidth={1}
            borderColor="#E5E7EB"
            borderRadius={16}
            padding={16}
            gap={16}
            shadowColor="#000"
            shadowOpacity={0.05}
            shadowRadius={6}
            shadowOffset={{ width: 0, height: 2 }}
          >
            <XStack alignItems="center" gap={14}>
              <Avatar circular size="$7" backgroundColor="#FFF7ED">
                <Avatar.Image
                  source={{ uri: 'https://th.bing.com/th/id/OIP.fFF1AOaet4ZcLFBIfM9SGAHaHa?pid=ImgDet&w=191&h=191&c=7' }}
                />
                <Avatar.Fallback backgroundColor="#FFF7ED" alignItems="center" justifyContent="center">
                  <Text color="#FF6B00" fontSize={22} fontWeight="700">
                    {fullName.charAt(0).toUpperCase()}
                  </Text>
                </Avatar.Fallback>
              </Avatar>
              <YStack flex={1} gap={2}>
                <Text fontSize={18} fontWeight="700" color="#111827" numberOfLines={1}>
                  {fullName}
                </Text>
                {email ? (
                  <Text fontSize={14} color="#6B7280" numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
              </YStack>
            </XStack>

            <YStack borderTopWidth={1} borderTopColor="#F3F4F6">
              <UserInfoCard label="Role" value={roleValue} />
              <YStack height={1} backgroundColor="#F3F4F6" />
              <UserInfoCard label="Branch" value={branchValue} />
            </YStack>
          </YStack>

          {/* Menu Section */}
          <YStack gap={8}>
            <Text fontSize={13} fontWeight="600" color="#6B7280" textTransform="uppercase" paddingHorizontal={4}>
              Account Settings
            </Text>
            <YStack
              backgroundColor="white"
              borderWidth={1}
              borderColor="#E5E7EB"
              borderRadius={16}
              overflow="hidden"
            >
              <ProfileMenuItem
                icon="person-outline"
                title="Account Information"
                onPress={() => handleNavigation('Profile')}
                disabled={isLoggingOut}
              />
              <ProfileMenuItem
                icon="lock-closed-outline"
                title="Change Password"
                onPress={() => handleNavigation('Password')}
                disabled={isLoggingOut}
                isLast
              />
            </YStack>
          </YStack>

          <YStack
            backgroundColor="white"
            borderWidth={1}
            borderColor="#E5E7EB"
            borderRadius={16}
            overflow="hidden"
          >
            <ProfileMenuItem
              icon="log-out-outline"
              title="Log Out"
              onPress={() => setShowLogoutModal(true)}
              isDestructive
              showArrow={false}
              disabled={isLoggingOut}
              isLast
            />
          </YStack>
        </YStack>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.5)">
          <YStack backgroundColor="white" borderRadius={16} padding={20} width="85%" maxWidth={400}>
            <YStack gap={12} alignItems="center">
              <YStack width={48} height={48} borderRadius={24} backgroundColor="#FEF2F2" alignItems="center" justifyContent="center">
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              </YStack>
              <Text fontSize={18} fontWeight="700" color="#111827">Log Out?</Text>
              <Text fontSize={14} color="#6B7280" textAlign="center">
                Are you sure you want to log out of your account?
              </Text>
              <XStack gap={12} width="100%" marginTop={8}>
                <Button
                  flex={1}
                  backgroundColor="white"
                  borderWidth={1}
                  borderColor="#E5E7EB"
                  borderRadius={12}
                  pressStyle={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                  onPress={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                >
                  <Text color="#111827" fontWeight="600">Cancel</Text>
                </Button>
                <Button
                  flex={1}
                  backgroundColor="#DC2626"
                  borderWidth={0}
                  borderRadius={12}
                  pressStyle={{ backgroundColor: '#B91C1C' }}
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <Spinner size="small" color="white" />
                  ) : (
                    <Text color="white" fontWeight="700">Log Out</Text>
                  )}
                </Button>
              </XStack>
            </YStack>
          </YStack>
        </YStack>
      </Modal>
    </YStack>
  );
};

export default Profile;
