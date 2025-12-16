import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={20}  
              name={focused ? "home" : "home-outline"} 
              color={color} 
            />
          ),
        }}
      />
    
      <Tabs.Screen
        name="Products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={20}  
              name={focused ? "grid" : "grid-outline"} 
              color={color} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="Order"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={20}  
              name={focused ? "list" : "list-outline"} 
              color={color} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="Cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={20} 
              name={focused ? "cart" : "cart-outline"} 
              color={color} 
            />
          ),
        }}
      />
        
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={20}  
              name={focused ? "person" : "person-outline"} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}