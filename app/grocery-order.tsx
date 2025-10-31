import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import GroceryDeliveryService, { DeliveryQuote, GroceryItem, DeliveryAddress } from "../services/GroceryDeliveryService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

export default function GroceryOrderScreen() {
  const { missingIngredients, servings: initialServings } = useLocalSearchParams();
  const router = useRouter();
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'simulated' | 'stripe_checkout'>('simulated');
  const [servings, setServings] = useState(parseInt(initialServings as string) || 1);

  useEffect(() => {
    if (missingIngredients) {
      fetchQuotes();
    }
    // Load saved address
    (async () => {
      const saved = await AsyncStorage.getItem('deliveryAddress');
      if (saved) setAddress(JSON.parse(saved));
    })();
  }, [missingIngredients]);
  
  useEffect(() => {
    if (missingIngredients && !loading) {
      fetchQuotes(); // Refetch when servings change
    }
  }, [servings]);

  const fetchQuotes = async () => {
    try {
      const ingredients = typeof missingIngredients === 'string' 
        ? missingIngredients.split(',')
        : [];
      
      const groceryItems: GroceryItem[] = ingredients.map(name => ({
        name: name.trim(),
        quantity: servings, // Scale by servings
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
    if (!address) {
      Alert.alert('Address required', 'Please enter your delivery address before placing the order.');
      return;
    }

    const confirmAndPlace = () => {
      Alert.alert(
        `Order from ${quote.provider.name}`,
        `Total: $${quote.total.toFixed(2)}\nDelivery: ${quote.estimatedDelivery}\nPayment: ${paymentMethod === 'simulated' ? 'Simulated' : 'Stripe Checkout'}\n\nProceed with order?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Order Now",
            onPress: async () => {
              setOrdering(true);
              try {
                const result = await GroceryDeliveryService.placeOrder(quote, {
                  address,
                  paymentMethod,
                  paymentStatus: paymentMethod === 'simulated' ? 'paid' : 'pending',
                });
                
                if (result.success) {
                  if (paymentMethod === 'stripe_checkout' && process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL) {
                    // Redirect to Stripe Checkout (hosted) configured via env
                    const checkoutUrl = `${process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL}?amount=${Math.round(quote.total * 100)}&orderId=${encodeURIComponent(result.orderId!)}&name=${encodeURIComponent(address.fullName)}`;
                    await WebBrowser.openBrowserAsync(checkoutUrl);
                  }

                  Alert.alert(
                    'Order Placed!',
                    `Order ID: ${result.orderId}\nEstimated delivery: ${result.estimatedDelivery}`,
                    [{ text: 'OK', onPress: () => router.push('/orders') }]
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

    confirmAndPlace();
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
      <Text style={styles.title}>🛍️ Grocery Delivery</Text>
      <Text style={styles.subtitle}>
        Missing ingredients: {typeof missingIngredients === 'string' ? missingIngredients : ''}
      </Text>
      
      {/* Servings Selector */}
      <View style={styles.servingsSelector}>
        <Text style={styles.servingsLabel}>Order for:</Text>
        <View style={styles.servingsControls}>
          <TouchableOpacity 
            style={styles.servingsButton} 
            onPress={() => setServings(Math.max(1, servings - 1))}
          >
            <Text style={styles.servingsButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.servingsValue}>{servings} {servings === 1 ? 'serving' : 'servings'}</Text>
          <TouchableOpacity 
            style={styles.servingsButton} 
            onPress={() => setServings(servings + 1)}
          >
            <Text style={styles.servingsButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <AddressForm address={address} onChange={async (addr) => {
          setAddress(addr);
          await AsyncStorage.setItem('deliveryAddress', JSON.stringify(addr));
        }} />
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity style={[styles.payOption, paymentMethod === 'simulated' && styles.payOptionActive]} onPress={() => setPaymentMethod('simulated')}>
            <Text style={styles.payOptionText}>Simulated</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.payOption, paymentMethod === 'stripe_checkout' && styles.payOptionActive]} onPress={() => setPaymentMethod('stripe_checkout')}>
            <Text style={styles.payOptionText}>Stripe Checkout</Text>
          </TouchableOpacity>
        </View>
        {paymentMethod === 'stripe_checkout' && !process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL && (
          <Text style={styles.helpText}>Set EXPO_PUBLIC_STRIPE_CHECKOUT_URL in .env to enable hosted checkout redirect.</Text>
        )}
      </View>

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

// --- Address Form Component ---
function AddressForm({ address, onChange }: { address: DeliveryAddress | null, onChange: (a: DeliveryAddress) => void }) {
  const [local, setLocal] = useState<DeliveryAddress>(address || {
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', instructions: ''
  });

  useEffect(() => {
    if (address) setLocal(address);
  }, [address]);

  const update = (key: keyof DeliveryAddress, value: string) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onChange(updated);
  };

  return (
    <View>
      <Row label="Full Name" value={local.fullName} onChange={(v) => update('fullName', v)} />
      <Row label="Phone" value={local.phone} onChange={(v) => update('phone', v)} />
      <Row label="Address Line 1" value={local.addressLine1} onChange={(v) => update('addressLine1', v)} />
      <Row label="Address Line 2" value={local.addressLine2 || ''} onChange={(v) => update('addressLine2', v)} />
      <Row label="City" value={local.city} onChange={(v) => update('city', v)} />
      <Row label="State" value={local.state} onChange={(v) => update('state', v)} />
      <Row label="Postal Code" value={local.postalCode} onChange={(v) => update('postalCode', v)} />
      <Row label="Delivery Instructions" value={local.instructions || ''} onChange={(v) => update('instructions', v)} multiline />
    </View>
  );
}

function Row({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: '#6C757D', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={{ borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: 10, backgroundColor: '#fff', fontSize: 14, color: '#2C3E50' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#495057' },
  paymentRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  payOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E9ECEF', backgroundColor: '#fff' },
  payOptionActive: { borderColor: '#27AE60', backgroundColor: '#E8F5E8' },
  payOptionText: { color: '#2C3E50', fontWeight: '600' },
  helpText: { fontSize: 12, color: '#6C757D' },
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
  
  servingsSelector: {
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  servingsLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 10,
  },
  servingsControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  servingsButton: {
    backgroundColor: "#FF6B35",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },
  servingsButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
    minWidth: 100,
    textAlign: "center",
  },
});
