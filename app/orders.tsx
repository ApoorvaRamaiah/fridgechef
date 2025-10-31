import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import GroceryDeliveryService from "../services/GroceryDeliveryService";

interface Order {
  id: string;
  provider: string;
  items: any[];
  total: number;
  placedAt: string;
  estimatedDelivery: string;
  status: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingStates, setTrackingStates] = useState<Record<string, any>>({});

  const loadOrders = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('orders');
      if (savedOrders) {
        const ordersList = JSON.parse(savedOrders);
        setOrders(ordersList);
        
        // Load tracking states for active orders
        const activeOrders = ordersList.filter((order: Order) => order.status !== 'delivered');
        const trackingPromises = activeOrders.map(async (order: Order) => {
          try {
            const tracking = await GroceryDeliveryService.trackOrder(order.id);
            return { orderId: order.id, tracking };
          } catch (error) {
            return { orderId: order.id, tracking: null };
          }
        });
        
        const trackingResults = await Promise.all(trackingPromises);
        const trackingMap: Record<string, any> = {};
        trackingResults.forEach(result => {
          if (result.tracking) {
            trackingMap[result.orderId] = result.tracking;
          }
        });
        setTrackingStates(trackingMap);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return '#6C757D';
      case 'preparing': return '#FFC107';
      case 'picked_up': return '#17A2B8';
      case 'on_the_way': return '#28A745';
      case 'delivered': return '#6C757D';
      case 'cancelled': return '#6C757D';
      default: return '#007BFF';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_payment': return '💳 Pending Payment';
      case 'preparing': return '👨‍🍳 Preparing';
      case 'picked_up': return '🚗 Picked Up';
      case 'on_the_way': return '🛣️ On the Way';
      case 'delivered': return '✅ Delivered';
      case 'cancelled': return '🚫 Cancelled';
      default: return '📋 Confirmed';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const cancelOrder = (orderId: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedOrders = orders.map(order => 
                order.id === orderId ? { ...order, status: 'cancelled' } : order
              );
              setOrders(updatedOrders);
              await AsyncStorage.setItem('orders', JSON.stringify(updatedOrders));
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27AE60" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No orders yet!</Text>
        <Text style={styles.emptyText}>
          When you order missing ingredients, they'll appear here
        </Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.browseButtonText}>Browse Recipes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Orders 📦</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27AE60']} />
        }
        renderItem={({ item }) => {
          const tracking = trackingStates[item.id];
          const currentStatus = tracking?.status || item.status;
          
          return (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
                  <Text style={styles.provider}>{item.provider}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
                    <Text style={styles.statusText}>{getStatusText(currentStatus)}</Text>
                  </View>
                  <Text style={styles.total}>${item.total.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <Text style={styles.orderTime}>
                  Ordered: {formatDate(item.placedAt)}
                </Text>
                <Text style={styles.estimatedDelivery}>
                  🚚 Estimated delivery: {item.estimatedDelivery}
                </Text>

                {/* Payment and Address Info */}
                {item.payment && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>💳</Text>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Payment</Text>
                      <Text style={styles.infoValue}>
                        {item.payment.method === 'simulated' ? 'Simulated' : 'Stripe'} • {item.payment.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>
                )}
                {item.deliveryAddress && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📍</Text>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Delivery Address</Text>
                      <Text style={styles.infoValue}>
                        {item.deliveryAddress.addressLine1}{item.deliveryAddress.addressLine2 ? `, ${item.deliveryAddress.addressLine2}` : ''}
                      </Text>
                      <Text style={styles.infoValue}>
                        {item.deliveryAddress.city}, {item.deliveryAddress.state} {item.deliveryAddress.postalCode}
                      </Text>
                    </View>
                  </View>
                )}
                
                {tracking?.driver && (
                  <Text style={styles.driverInfo}>
                    👤 Driver: {tracking.driver.name} ({tracking.driver.phone})
                  </Text>
                )}
              </View>

              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>Items ({item.items.length}):</Text>
                {item.items.slice(0, 3).map((orderItem: any, idx: number) => (
                  <Text key={idx} style={styles.itemText}>
                    • {orderItem.quantity}x {orderItem.name}
                  </Text>
                ))}
                {item.items.length > 3 && (
                  <Text style={styles.moreItems}>
                    ... and {item.items.length - 3} more items
                  </Text>
                )}
              </View>

              {currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
                <View style={styles.orderActions}>
                  <TouchableOpacity 
                    style={styles.trackButton}
                    onPress={() => Alert.alert('Tracking', `Order is ${getStatusText(currentStatus).toLowerCase()}`)}
                  >
                    <Text style={styles.trackButtonText}>Track Order</Text>
                  </TouchableOpacity>
                  
                  {currentStatus === 'confirmed' && (
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => cancelOrder(item.id)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#2C3E50" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#6C757D" },
  
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 10, color: "#495057" },
  emptyText: { fontSize: 14, color: "#6C757D", textAlign: "center", marginBottom: 30 },
  browseButton: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  orderCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: { fontSize: 16, fontWeight: "bold", color: "#495057" },
  provider: { fontSize: 14, color: "#6C757D", marginTop: 2 },
  
  statusContainer: { alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  total: { fontSize: 18, fontWeight: "bold", color: "#27AE60" },

  orderDetails: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  orderTime: { fontSize: 12, color: "#6C757D", marginBottom: 4 },
  estimatedDelivery: { fontSize: 14, color: "#28A745", fontWeight: "500", marginBottom: 8 },
  driverInfo: { fontSize: 12, color: "#495057", marginTop: 4 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    color: "#2C3E50",
    lineHeight: 18,
  },

  itemsList: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemsTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  itemText: { fontSize: 12, color: "#495057", marginBottom: 2 },
  moreItems: { fontSize: 12, color: "#6C757D", fontStyle: "italic", marginTop: 4 },

  orderActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 0.6,
  },
  trackButtonText: { color: "#fff", fontWeight: "600", textAlign: "center", fontSize: 14 },
  cancelButton: {
    backgroundColor: "#DC3545",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 0.35,
  },
  cancelButtonText: { color: "#fff", fontWeight: "600", textAlign: "center", fontSize: 14 },
});
