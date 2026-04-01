interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: string;
    taxRate?: number;        // Custom tax rate for this item (percentage - legacy)
    taxIncluded?: boolean;   // Whether price includes tax
    taxCategory?: string;    // Tax category for reporting
    
    // Jewelry Specific Fields
    grossWeight?: number;
    stoneWeight?: number;
    netWeight?: number;
    ratePerGram?: number;
    wastagePercentage?: number;
    wastageAmount?: number;
    makingChargeValue?: number;
    makingCharges?: number;
    isMakingPercentage?: boolean;
    gstOnGold?: number;
    gstOnMaking?: number;
    totalGst?: number;
    item_total?: number;
    
    weight?: string;         // Legacy weight string
    purity?: string;         // Purity/Metal type (e.g., "Gold 18K", "22K")
    customRate?: number;     // Custom rate/price (overrides base price if set)
    details?: string;        // Additional item details/notes
}

interface Invoice {
    id: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    date: string;
    customerName?: string;
    paymentMethod: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    creditLimit: number;
    currentBalance: number;
    totalPurchases: number;
    lastPurchaseDate: string;
    status: 'active' | 'suspended' | 'blacklisted';
}

interface CustomerTransaction {
    id: string;
    customerId: string;
    type: 'purchase' | 'payment' | 'credit_adjustment';
    amount: number;
    description: string;
    date: string;
    invoiceId?: string;
    paymentMethod?: string;
}