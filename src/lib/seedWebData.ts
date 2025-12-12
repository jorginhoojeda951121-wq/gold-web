import { idbSet } from './indexedDb';

export async function seedWebData() {
  try {

    // Seed jewelry items (with all required fields for JewelryItem interface)
    const jewelryItems = [
      {
        id: 'jewelry-1',
        name: 'Gold Ring',
        type: 'Ring',
        gemstone: 'Diamond',
        carat: 1.5,
        metal: 'Gold 18K',
        price: 15000,
        inStock: 10,
        isArtificial: false,
        image: 'https://via.placeholder.com/300x300/FFD700/000000?text=Gold+Ring',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'jewelry-2',
        name: 'Silver Necklace',
        type: 'Necklace',
        gemstone: 'Pearl',
        carat: 0,
        metal: 'Silver',
        price: 8000,
        inStock: 8,
        isArtificial: false,
        image: 'https://via.placeholder.com/300x300/C0C0C0/000000?text=Silver+Necklace',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'jewelry-3',
        name: 'Diamond Earrings',
        type: 'Earrings',
        gemstone: 'Diamond',
        carat: 2.0,
        metal: 'Platinum',
        price: 25000,
        inStock: 5,
        isArtificial: false,
        image: 'https://via.placeholder.com/300x300/E6E6FA/000000?text=Diamond+Earrings',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed gold items
    const goldItems = [
      {
        id: 'gold-1',
        name: '18K Gold Bar',
        weight: '10g',
        purity: '18K',
        price: 50000,
        stock: 15,
        inStock: 15, // Add both for compatibility
        image: 'https://via.placeholder.com/300x300/FFD700/000000?text=18K+Gold+Bar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'gold-2',
        name: '22K Gold Chain',
        weight: '25g',
        purity: '22K',
        price: 120000,
        stock: 12,
        inStock: 12, // Add both for compatibility
        image: 'https://via.placeholder.com/300x300/FFD700/000000?text=22K+Gold+Chain',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed stones items
    const stonesItems = [
      {
        id: 'stone-1',
        name: 'Diamond',
        carat: '2.5',
        clarity: 'FL',
        cut: 'Round',
        price: 250000,
        stock: 20,
        inStock: 20, // Add both for compatibility
        image: 'https://via.placeholder.com/300x300/B9F2FF/000000?text=Diamond',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'stone-2',
        name: 'Ruby',
        carat: '3.0',
        clarity: 'VVS1',
        cut: 'Oval',
        price: 180000,
        stock: 18,
        inStock: 18, // Add both for compatibility
        image: 'https://via.placeholder.com/300x300/DC143C/FFFFFF?text=Ruby',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed craftsmen - format matches CraftsmenTracking component expectations
    const craftsmen = [
      {
        id: 'craftsman-1',
        name: 'Alessandro Romano',
        specialty: 'Gold Smithing',
        specialization: 'Gold Smithing', // Keep both for compatibility
        experience: 15,
        experience_years: 15, // Keep both for compatibility
        contact: '+1-555-0201',
        phone: '+1-555-0201', // Keep both for compatibility
        email: 'alessandro.romano@jewelry.com',
        address: '',
        hourly_rate: 85,
        status: 'available',
        rating: 4.5,
        currentProjects: 0,
        assignedMaterials: [],
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'craftsman-2',
        name: 'Priya Sharma',
        specialty: 'Diamond Setting',
        specialization: 'Diamond Setting', // Keep both for compatibility
        experience: 12,
        experience_years: 12, // Keep both for compatibility
        contact: '+1-555-0202',
        phone: '+1-555-0202', // Keep both for compatibility
        email: 'priya.sharma@jewelry.com',
        address: '',
        hourly_rate: 95,
        status: 'available',
        rating: 4.8,
        currentProjects: 0,
        assignedMaterials: [],
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'craftsman-3',
        name: 'Rajesh Kumar',
        specialty: 'Gold Jewelry',
        specialization: 'Gold Jewelry',
        experience: 15,
        experience_years: 15,
        contact: '+91 9876543210',
        phone: '+91 9876543210',
        email: 'rajesh.kumar@jewelry.com',
        address: '',
        hourly_rate: 80,
        status: 'active',
        rating: 4.7,
        currentProjects: 0,
        assignedMaterials: [],
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed staff
    const staffEmployees = [
      {
        id: 'staff-1',
        name: 'David Thompson',
        role: 'Manager',
        department: 'Sales',
        phone: '+1-555-1001',
        email: 'david.thompson@jewelry.com',
        salary: 75000,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'staff-2',
        name: 'Lisa Anderson',
        role: 'Sales Representative',
        department: 'Sales',
        phone: '+1-555-1002',
        email: 'lisa.anderson@jewelry.com',
        salary: 45000,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed customers - format matches CustomerLedger component
    const customers = [
      {
        id: 'customer-1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-2001',
        address: '123 Main St, New York, NY 10001',
        creditLimit: 100000,
        currentBalance: 25000,
        totalPurchases: 125000,
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'customer-2',
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        phone: '+1-555-2002',
        address: '456 Oak Ave, Los Angeles, CA 90210',
        creditLimit: 75000,
        currentBalance: 0,
        totalPurchases: 45000,
        lastPurchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Seed POS invoices
    const posInvoices = [
      {
        id: 'INV-001',
        customer_id: 'customer-1',
        customer_name: 'John Smith',
        items: [
          { id: 'jewelry-1', name: 'Gold Ring', quantity: 1, price: 15000 }
        ],
        subtotal: 15000,
        tax: 1200,
        total: 16200,
        payment_method: 'Credit Card',
        status: 'Completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Save to IndexedDB
    await idbSet('jewelry_items', jewelryItems);
    await idbSet('gold_items', goldItems);
    await idbSet('stones_items', stonesItems);
    await idbSet('craftsmen', craftsmen);
    await idbSet('staff', staffEmployees);
    await idbSet('customers', customers);
    await idbSet('pos_recentInvoices', posInvoices);

    return true;
  } catch (error) {
    console.error('❌ Error seeding web data:', error);
    return false;
  }
}

// Auto-seed on page load
if (typeof window !== 'undefined') {
  // Check if ALL required data exists
  import('./indexedDb').then(async ({ idbGet }) => {
    try {
      const requiredCollections = [
        'jewelry_items',
        'gold_items',
        'stones_items',
        'craftsmen',
        'staff',
        'customers',
        'pos_recentInvoices'
      ];
      
      let needsSeeding = false;
      const missingCollections: string[] = [];
      
      for (const collection of requiredCollections) {
        const data = await idbGet(collection);
        if (!data || (Array.isArray(data) && data.length === 0)) {
          missingCollections.push(collection);
          needsSeeding = true;
        }
      }
      
      if (needsSeeding) {
        await seedWebData();
        // Verify seeds were created
        for (const collection of missingCollections) {
          const verifyData = await idbGet(collection);
          if (verifyData && Array.isArray(verifyData) && verifyData.length > 0) {
          } else {
            console.warn(`⚠️ Failed to seed ${collection} - will retry on next load`);
            // If craftsmen specifically failed, ensure it gets created
            if (collection === 'craftsmen') {
              const craftsmenSeed = [
                {
                  id: 'craftsman-1',
                  name: 'Alessandro Romano',
                  specialty: 'Gold Smithing',
                  experience: 15,
                  contact: '+1-555-0201',
                  email: 'alessandro.romano@jewelry.com',
                  status: 'available',
                  rating: 4.5,
                  currentProjects: 0,
                  assignedMaterials: [],
                },
                {
                  id: 'craftsman-2',
                  name: 'Priya Sharma',
                  specialty: 'Diamond Setting',
                  experience: 12,
                  contact: '+1-555-0202',
                  email: 'priya.sharma@jewelry.com',
                  status: 'available',
                  rating: 4.8,
                  currentProjects: 0,
                  assignedMaterials: [],
                },
              ];
              await idbSet('craftsmen', craftsmenSeed);
            }
          }
        }
      } else {
      }
    } catch (error) {
      console.error('Error checking IndexedDB:', error);
      // Try to seed anyway
      await seedWebData();
    }
  });
}
