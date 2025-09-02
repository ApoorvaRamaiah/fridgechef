import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  ScrollView
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import GroceryDeliveryService, { DeliveryQuote, GroceryItem } from "../services/GroceryDeliveryService";

export default function GroceryOrderScreen() {
  const { missingIngredients } = useLocalSearchParams();
  const router = useRouter();
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (missingIngredients) {
      fetchQuotes();
    }
  }, [missingIngredients]);

  const fetchQuotes = async () => {
    try {
      const ingredients = typeof missingIngredients === 'string' 
        ? missingIngredients.split(',')
        : [];
      
      const groceryItems: GroceryItem[] = ingredients.map(name => ({
        name: name.trim(),
        quantity: 1,
        unit: 'piece'
      }));

      const deliveryQuotes = await GroceryDeliveryService.getQuotes(groceryItems);
      setQuotes(deliveryQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      Alert.alert('Error', 'Failed to get delivery quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async (quote: DeliveryQuote) => {
    Alert.alert(
      `Order from ${quote.provider.name}`,
      `Total: $${quote.total.toFixed(2)}\\nDelivery: ${quote.estimatedDelivery}\\n\\nProceed with order?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Order Now",
          onPress: async () => {
            setOrdering(true);
            try {
              const result = await GroceryDeliveryService.placeOrder(quote);
              
              if (result.success) {
                Alert.alert(
                  'Order Placed!',
                  `Order ID: ${result.orderId}\\nEstimated delivery: ${result.estimatedDelivery}`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Order Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              Alert.alert('Order Failed', 'Please try again later');
            } finally {
              setOrdering(false);
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
        <Text style={styles.loadingText}>Getting delivery quotes...</Text>
      </View>
    );
  }

  if (quotes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No delivery options available</Text>
        <Text style={styles.errorText}>
          Sorry, grocery delivery is not available in your area right now.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛒 Grocery Delivery</Text>
      <Text style={styles.subtitle}>
        Missing ingredients: {typeof missingIngredients === 'string' ? missingIngredients : ''}
      </Text>

      {quotes.map((quote, index) => (
        <View key={quote.provider.id} style={styles.quoteCard}>
          <View style={styles.providerHeader}>
            <View>
              <Text style={styles.providerName}>{quote.provider.name}</Text>
              <Text style={styles.deliveryTime}>🚚 {quote.estimatedDelivery}</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.totalPrice}>${quote.total.toFixed(2)}</Text>
              {index === 0 && <Text style={styles.bestDeal}>Best Deal!</Text>}
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text>Items subtotal:</Text>
              <Text>${quote.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text>Delivery fee:</Text>
              <Text>${quote.deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text>Service fee:</Text>
              <Text>${quote.serviceFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total:</Text>
              <Text style={styles.totalText}>${quote.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.itemsList}>
            <Text style={styles.itemsTitle}>Items:</Text>
            {quote.items.map((item, idx) => (
              <View key={idx} style={styles.item}>
                <Text style={styles.itemName}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  ${(item.estimatedPrice || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.orderButton, ordering && styles.disabledButton]}
            onPress={() => placeOrder(quote)}
            disabled={ordering}
          >
            <Text style={styles.orderButtonText}>
              {ordering ? 'Placing Order...' : `Order from ${quote.provider.name}`}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Free delivery on orders over $50
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  
  errorTitle: { fontSize: 20, fontWeight: "600", marginBottom: 10, color: "#DC3545" },
  errorText: { fontSize: 14, color: "#6C757D", textAlign: "center", marginBottom: 20 },
  backButton: {
    backgroundColor: "#6C757D",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontWeight: "bold" },

  quoteCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  providerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  providerName: { fontSize: 20, fontWeight: "bold", color: "#495057" },
  deliveryTime: { fontSize: 14, color: "#28A745", marginTop: 4 },
  priceContainer: { alignItems: "flex-end" },
  totalPrice: { fontSize: 24, fontWeight: "bold", color: "#27AE60" },
  bestDeal: { 
    fontSize: 12, 
    color: "#fff", 
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden"
  },

  breakdown: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    paddingTop: 8,
    marginTop: 4,
  },
  totalText: { fontWeight: "bold", fontSize: 16 },

  itemsList: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  itemsTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  itemName: { fontSize: 14, color: "#495057" },
  itemPrice: { fontSize: 14, fontWeight: "500", color: "#27AE60" },

  orderButton: {
    backgroundColor: "#27AE60",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#6C757D" },
  orderButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: { fontSize: 12, color: "#6C757D", textAlign: "center" },
});
