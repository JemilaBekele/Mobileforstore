import React, { useState } from 'react';
import {  Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import {
  Card,
  Text,
  XStack,
  YStack,
  Button,
  ScrollView,
  Spinner,
  H3,
  Avatar,
  Separator,
} from 'tamagui';
import { useAppSelector } from '@/(redux)/hooks';
import type { AppDispatch } from '@/(redux)/store';
import { logout , logoutAction  } from "@/(redux)/authSlice";

type ProfileRoute = 'Profile' | 'Password' ;
export default function Profile() { 
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useAppSelector((state) => state.auth.user);
  const loading = useAppSelector((state) => state.auth.loading);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Access user data with proper fallbacks
  const fullName = user?.name || 'Guest';
  const email = user?.email || '';
  const phone = user?.phone || 'Not provided';
  const role = user?.role?.name || 'User';
  const branch = user?.branch?.name || 'Not assigned';

  const handleNavigation = (route: ProfileRoute) => {
    router.push(`/(tabs)/profile/${route}`);
  };

const handleLogout = async () => {
  try {
    setIsLoggingOut(true);
    setShowLogoutModal(false);
    
    await dispatch(logout()).unwrap();
    
    // Completely reset navigation to root
    router.dismissAll();
    router.replace("/");
    
  } catch (error: any) {
    console.error("Logout process error:", error);
    dispatch(logoutAction());
    router.dismissAll();
    router.replace("/");
  } finally {
    setIsLoggingOut(false);
  }
};

  const ProfileMenuItem = ({ 
    icon, 
    title, 
    onPress, 
    isDestructive = false,
    showArrow = true 
  }: {
    icon: string;
    title: string;
    onPress: () => void;
    isDestructive?: boolean;
    showArrow?: boolean;
  }) => (
    <Card
      elevate
      bordered
      borderRadius="$4"
      backgroundColor="$orange1"
      borderColor="$orange4"
      marginVertical="$2"
    >
      <Card.Header padded>
        <Button
          unstyled
          flex={1}
          justifyContent="space-between"
          alignItems="center"
          flexDirection="row"
          onPress={onPress}
          paddingVertical="$2"
          disabled={isLoggingOut}
        >
          <XStack alignItems="center" space="$3">
            <Text fontSize="$5" color={isDestructive ? "$red9" : "$orange9"}>
              {icon}
            </Text>
            <Text 
              fontSize="$5" 
              color={isDestructive ? "$red11" : "$orange11"}
              fontWeight="600"
            >
              {title}
            </Text>
          </XStack>
          {showArrow && (
            <Text fontSize="$4" color="$orange8">
              ›
            </Text>
          )}
        </Button>
      </Card.Header>
    </Card>
  );

  const UserInfoCard = ({ label, value }: { label: string; value: string }) => (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
      <Text fontSize="$4" fontWeight="600" color="$orange11">
        {label}
      </Text>
      <Text fontSize="$4" color="$orange12" fontWeight="500">
        {value}
      </Text>
    </XStack>
  );

  if (loading && !isLoggingOut) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$orange1">
        <Spinner size="large" color="$orange9" />
        <Text marginTop="$4" color="$orange11" fontSize="$5" fontWeight="600">
          Loading profile...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$orange1">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack space="$4" padding="$4">
          {/* Profile Header */}
          <Card 
            elevate 
            bordered 
            borderRadius="$4" 
            backgroundColor="$orange1"
            borderColor="$orange4"
            shadowColor="$orange7"
          >
            <Card.Header padded>
              <YStack space="$4" alignItems="center">
                <Avatar circular size="$14" backgroundColor="$orange5">
                  <Avatar.Image
                    source={{ uri: 'https://th.bing.com/th/id/OIP.fFF1AOaet4ZcLFBIfM9SGAHaHa?pid=ImgDet&w=191&h=191&c=7' }}
                  />
                  <Avatar.Fallback backgroundColor="$orange6">
                    <Text color="$orange11" fontSize="$6" fontWeight="bold">
                      {fullName.charAt(0).toUpperCase()}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
                
                <YStack alignItems="center" space="$2">
                  <H3 fontWeight="bold" color="$orange12" textAlign="center">
                    {fullName}
                  </H3>
                  <Text fontSize="$4" color="$orange10" textAlign="center">
                    {email}
                  </Text>
                </YStack>

                {/* User Details */}
                <Card 
                  width="100%" 
                  backgroundColor="$orange2" 
                  borderRadius="$3" 
                  padding="$3"
                >
                  <YStack space="$1">
                    <Separator borderColor="$orange4" />
                    <UserInfoCard label="Role:" value={role} />
                    <Separator borderColor="$orange4" />
                    <UserInfoCard label="Branch:" value={branch} />
                    <Separator borderColor="$orange4" />
                    <UserInfoCard label="Phone:" value={phone} />
                  </YStack>
                </Card>
              </YStack>
            </Card.Header>
          </Card>

          {/* Menu Section */}
          <YStack space="$3">
            <Text fontSize="$6" fontWeight="700" color="$orange12" paddingHorizontal="$2">
              Account Settings
            </Text>

            <ProfileMenuItem
              icon="👤"
              title="Account Information"
              onPress={() => handleNavigation('Profile')}
            />

            <ProfileMenuItem
              icon="🔒"
              title="Change Password"
              onPress={() => handleNavigation('Password')}
            />

            <ProfileMenuItem
              icon="🚪"
              title="Log Out"
              onPress={() => setShowLogoutModal(true)}
              isDestructive={true}
              showArrow={false}
            />
          </YStack>
        </YStack>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.5)">
          <Card 
            backgroundColor="$orange1" 
            borderRadius="$4" 
            padding="$4" 
            margin="$4"
            borderColor="$orange4"
            borderWidth={1}
            width="85%"
            maxWidth={400}
          >
            <YStack space="$4" alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="$orange12" textAlign="center">
                Log Out?
              </Text>
              
              <Text fontSize="$4" color="$orange11" textAlign="center" lineHeight="$1">
                Are you sure you want to log out of your account?
              </Text>

              <XStack space="$3" marginTop="$4" width="100%">
                <Button
                  flex={1}
                  backgroundColor="$orange3"
                  borderColor="$orange6"
                  borderWidth={1}
                  borderRadius="$4"
                  onPress={() => setShowLogoutModal(false)}
                  pressStyle={{ backgroundColor: "$orange4" }}
                  disabled={isLoggingOut}
                >
                  <Text color="$orange11" fontWeight="600">
                    Cancel
                  </Text>
                </Button>
                
                <Button
                  flex={1}
                  backgroundColor="$red9"
                  borderColor="$red10"
                  borderWidth={1}
                  borderRadius="$4"
                  pressStyle={{ backgroundColor: "$red10" }}
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <Spinner size="small" color="white" />
                  ) : (
                    <Text color="white" fontWeight="600">Log Out</Text>
                  )}
                </Button>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </Modal>
    </YStack>
  );
};


