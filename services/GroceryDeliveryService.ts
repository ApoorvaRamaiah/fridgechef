export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  category?: string;
}

export interface DeliveryProvider {
  id: string;
  name: string;
  estimatedTime: string;
  serviceFee: number;
  minOrder: number;
  available: boolean;
}

export interface DeliveryQuote {
  provider: DeliveryProvider;
  items: GroceryItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  estimatedDelivery: string;
}

class GroceryDeliveryService {
  private providers: DeliveryProvider[] = [
    {
      id: 'instacart',
      name: 'Instacart',
      estimatedTime: '10-30 min',
      serviceFee: 3.99,
      minOrder: 10,
      available: true
    },
    {
      id: 'amazon_fresh',
      name: 'Amazon Fresh',
      estimatedTime: '15-25 min',
      serviceFee: 4.95,
      minOrder: 35,
      available: true
    },
    {
      id: 'uber_eats',
      name: 'Uber Eats Grocery',
      estimatedTime: '20-35 min',
      serviceFee: 2.99,
      minOrder: 15,
      available: true
    }
  ];

  // Mock price database - in real app, this would come from provider APIs
  private mockPrices: Record<string, number> = {
    'tomato': 1.50,
    'onion': 0.89,
    'garlic': 1.25,
    'chicken breast': 8.99,
    'ground beef': 6.99,
    'milk': 3.49,
    'cheese': 4.99,
    'rice': 2.99,
    'pasta': 1.99,
    'olive oil': 5.99,
    'eggs': 2.89,
    'butter': 3.99,
    'flour': 2.49,
    'salt': 1.29,
    'pepper': 2.99
  };

  async getQuotes(items: GroceryItem[]): Promise<DeliveryQuote[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const quotes: DeliveryQuote[] = [];

    for (const provider of this.providers) {
      if (!provider.available) continue;

      // Calculate item prices
      const pricedItems = items.map(item => ({
        ...item,
        estimatedPrice: this.getEstimatedPrice(item.name, item.quantity)
      }));

      const subtotal = pricedItems.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
      
      // Skip if doesn't meet minimum order
      if (subtotal < provider.minOrder) continue;

      const deliveryFee = subtotal > 50 ? 0 : 5.99; // Free delivery over $50
      const total = subtotal + deliveryFee + provider.serviceFee;

      quotes.push({
        provider,
        items: pricedItems,
        subtotal,
        deliveryFee,
        serviceFee: provider.serviceFee,
        total,
        estimatedDelivery: provider.estimatedTime
      });
    }

    // Sort by total price
    return quotes.sort((a, b) => a.total - b.total);
  }

  private getEstimatedPrice(itemName: string, quantity: number): number {
    const basePrice = this.mockPrices[itemName.toLowerCase()] || 2.99; // Default price
    return basePrice * quantity;
  }

  async placeOrder(quote: DeliveryQuote): Promise<{ 
    success: boolean; 
    orderId?: string; 
    estimatedDelivery?: string;
    error?: string; 
  }> {
    try {
      // Simulate realistic order placement with validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock validation - 95% success rate
      if (Math.random() < 0.05) {
        throw new Error('Payment processing failed');
      }
      
      const orderId = `ORDER_${Date.now()}_${quote.provider.id.toUpperCase()}`;
      
      // Store order for tracking
      const orderData = {
        id: orderId,
        provider: quote.provider.name,
        items: quote.items,
        total: quote.total,
        placedAt: new Date().toISOString(),
        estimatedDelivery: quote.estimatedDelivery,
        status: 'confirmed'
      };
      
      const existingOrders = await AsyncStorage.getItem('orders') || '[]';
      const orders = JSON.parse(existingOrders);
      orders.unshift(orderData);
      await AsyncStorage.setItem('orders', JSON.stringify(orders));
      
      return {
        success: true,
        orderId,
        estimatedDelivery: quote.estimatedDelivery
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place order. Please try again.'
      };
    }
  }

  async trackOrder(orderId: string): Promise<{
    status: 'preparing' | 'picked_up' | 'on_the_way' | 'delivered';
    estimatedDelivery: string;
    driver?: {
      name: string;
      phone: string;
      location?: { lat: number; lng: number };
    };
  }> {
    // Simulate order tracking
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const statuses = ['preparing', 'picked_up', 'on_the_way'] as const;
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      status: randomStatus,
      estimatedDelivery: '15 minutes',
      driver: {
        name: 'John Doe',
        phone: '+1-555-0123'
      }
    };
  }

  getAvailableProviders(): DeliveryProvider[] {
    return this.providers.filter(p => p.available);
  }
}

export default new GroceryDeliveryService();
