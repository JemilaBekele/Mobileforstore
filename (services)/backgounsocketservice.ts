// import { io, Socket } from 'socket.io-client';
// import * as Notifications from 'expo-notifications';
// import { NotificationService } from '@/(utils)/notificationService';

// // Define notification interface
// export interface Notification {
//   id: string;
//   shopId: string;
//   title: string;
//   message: string;
//   type: string;
//   relatedEntityType: string;
//   createdAt: string;
//   read: boolean;
//   userId: string;
// }

// // Define callback type for notifications
// export type NotificationCallback = (notification: Notification) => void;

// class SocketService {
//   private socket: Socket | null = null;
//   private isConnected: boolean = false;
//   private notificationCallbacks: Set<NotificationCallback> = new Set();

//   connect(shopId: string, userId: string): Socket {
//     const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5000';
    
//     console.log(`🔌 Connecting to socket server: ${serverUrl}`);
//     console.log(`🏪 Shop ID for connection: ${shopId}`);
//     console.log(`👤 User ID for connection: ${userId}`);
    
//     this.socket = io(serverUrl, {
//       transports: ['websocket'],
//       forceNew: true,
//     });

//     this.socket.on('connect', () => {
//       console.log('✅ Connected to server, Socket ID:', this.socket?.id);
//       this.isConnected = true;
      
//       // Join both shop and user rooms
//       if (shopId && userId) {
//         this.joinRooms(shopId, userId);
//       }
//     });

//     this.socket.on('disconnect', (reason) => {
//       console.log('❌ Disconnected from server. Reason:', reason);
//       this.isConnected = false;
//     });

//     this.socket.on('connect_error', (error) => {
//       console.log('🔌 Connection error:', error.message);
//     });

//     // Enhanced notification handler with background support
//     this.socket.on('new-notification', (data: Notification) => {
//       console.log('📨 Received notification:', data);
      
//       // Show local notification (works even when app is closed)
//       this.handleIncomingNotification(data);
      
//       // Call all registered callbacks
//       this.notificationCallbacks.forEach(callback => {
//         try {
//           callback(data);
//         } catch (error) {
//           console.error('Error in notification callback:', error);
//         }
//       });
//     });

//     // Log all incoming events for debugging
//     this.socket.onAny((eventName, ...args) => {
//       if (eventName !== 'new-notification') { // Avoid double logging notifications
//         console.log(`📡 Incoming event: ${eventName}`, args);
//       }
//     });

//     return this.socket;
//   }

//   private async handleIncomingNotification(notification: Notification): Promise<void> {
//     try {
//       // Show local notification with sound
//       await NotificationService.showLocalNotification(notification);
      
//       // Increment badge count
//       const currentBadge = await Notifications.getBadgeCountAsync();
//       await NotificationService.setBadgeCount(currentBadge + 1);
//     } catch (error) {
//       console.error('Error handling incoming notification:', error);
//     }
//   }

//   joinRooms(shopId: string, userId: string): void {
//     if (this.socket && shopId && userId) {
//       // Join shop room (NO prefix to match your current backend)
//       this.socket.emit('join', shopId);
//       console.log(`🏪 Joined shop room: ${shopId}`);
      
//       // Join user room (NO prefix to match your current backend)
//       this.socket.emit('join', userId);
//       console.log(`👤 Joined user room: ${userId}`);
      
//       // Join combined room
//       const combinedRoom = `${userId}:${shopId}`;
//       this.socket.emit('join', combinedRoom);
//       console.log(`🔗 Joined combined room: ${combinedRoom}`);
//     }
//   }

//   onNotification(callback: NotificationCallback): void {
//     if (this.socket) {
//       console.log('🎯 Setting up notification listener');
//       this.notificationCallbacks.add(callback);
//     } else {
//       console.log('❌ Cannot setup notification listener - socket not connected');
//     }
//   }

//   // Remove specific event listener
//   offNotification(callback: NotificationCallback): void {
//     this.notificationCallbacks.delete(callback);
//   }

//   disconnect(): void {
//     if (this.socket) {
//       this.socket.disconnect();
//       this.isConnected = false;
//       this.notificationCallbacks.clear();
//     }
//   }

//   getIsConnected(): boolean {
//     return this.isConnected;
//   }

//   // Get the socket instance (useful for direct access)
//   getSocket(): Socket | null {
//     return this.socket;
//   }
// }

// export default new SocketService();