import { useState, useEffect } from "react";
import { Search, Plus, Hammer, ArrowLeft, Package, Database, TableIcon, Users, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { AddCraftsmanDialog, Craftsman, RawMaterial, PaymentRecord } from "@/components/AddCraftsmanDialog";
import { MaterialAssignDialog } from "@/components/MaterialAssignDialog";
import { CraftsmanDetailsDialog } from "@/components/CraftsmanDetailsDialog";
import { CraftsmanPaymentDialog } from "@/components/CraftsmanPaymentDialog";
import { CompletionPaymentDialog } from "@/components/CompletionPaymentDialog";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useUserStorage } from "@/hooks/useUserStorage";
import { upsertToSupabase, fetchAll } from "@/lib/supabaseDirect";
import { JobReturnDialog, JobReturnDetails } from "@/components/JobReturnDialog";
import { useSearchParams } from "react-router-dom";

const CraftsmenTracking = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCompletionPaymentDialog, setShowCompletionPaymentDialog] = useState(false);
  const [showJobReturnDialog, setShowJobReturnDialog] = useState(false);
  const [selectedCraftsman, setSelectedCraftsman] = useState<Craftsman | null>(null);
  const [selectedMaterialForCompletion, setSelectedMaterialForCompletion] = useState<RawMaterial | null>(null);
  const [searchParams] = useSearchParams();

  // CRITICAL: Use useUserStorage for user-scoped data isolation
  const { data: craftsmen, updateData: setCraftsmen, loaded } = useUserStorage<Craftsman[]>("craftsmen", [
    {
      id: "1",
      name: "Rajesh Kumar",
      specialty: "Gold Jewelry",
      experience: "15 years",
      currentProjects: 3,
      status: "active",
      contact: "+91 9876543210",
      assignedMaterials: [
        {
          id: "1",
          type: "Gold 22K",
          quantity: 50,
          unit: "grams",
          assignedDate: "2024-01-15",
          projectId: "PRJ-001",
          completed: false
        },
        {
          id: "1b",
          type: "Gold 18K Ring",
          quantity: 1,
          unit: "piece",
          assignedDate: "2024-01-10",
          projectId: "PRJ-001B",
          completed: true,
          completedDate: "2024-01-25",
          completionNotes: "Ring completed successfully. Customer was very satisfied with the design and quality. No issues encountered during production."
        }
      ]
    },
    {
      id: "2",
      name: "Priya Sharma",
      specialty: "Diamond Setting",
      experience: "12 years",
      currentProjects: 2,
      status: "active",
      contact: "+91 9876543211",
      assignedMaterials: [
        {
          id: "2",
          type: "Diamond",
          quantity: 2.5,
          unit: "carats",
          assignedDate: "2024-01-20",
          projectId: "PRJ-002",
          completed: false
        }
      ]
    },
    {
      id: "3",
      name: "Mohammad Ali",
      specialty: "Stone Cutting",
      experience: "20 years",
      currentProjects: 1,
      status: "busy",
      contact: "+91 9876543212",
      assignedMaterials: [
        {
          id: "3",
          type: "Ruby",
          quantity: 5,
          unit: "pieces",
          assignedDate: "2024-01-18",
          projectId: "PRJ-003",
          completed: false
        }
      ]
    },
    {
      id: "4",
      name: "Sunita Devi",
      specialty: "Traditional Designs",
      experience: "18 years",
      currentProjects: 0,
      status: "available",
      contact: "+91 9876543213",
      assignedMaterials: []
    }
  ]);

  useEffect(() => {
    if (loaded && Array.isArray(craftsmen)) {
      const needsUpdate = craftsmen.some(c => !Array.isArray(c.assignedMaterials));
      if (needsUpdate) {
        const normalized = craftsmen.map(craftsman => ({
          ...craftsman,
          assignedMaterials: Array.isArray(craftsman.assignedMaterials)
            ? craftsman.assignedMaterials
            : []
        }));
        setCraftsmen(normalized);
      }
    }
  }, [loaded, craftsmen, setCraftsmen]);

  const [materialsLoaded, setMaterialsLoaded] = useState(false);

  useEffect(() => {
    const loadMaterialsAssigned = async () => {
      if (!loaded || materialsLoaded || !Array.isArray(craftsmen) || craftsmen.length === 0) return;

      try {
        const materialsAssigned = await fetchAll<any[]>('materials_assigned');

        if (Array.isArray(materialsAssigned) && materialsAssigned.length > 0) {
          const materialsByCraftsman = materialsAssigned.reduce((acc, material) => {
            const craftsmanId = material.craftsman_id;
            if (!acc[craftsmanId]) {
              acc[craftsmanId] = [];
            }

            const rawMaterial: RawMaterial = {
              id: material.id,
              type: material.item_description || '',
              quantity: parseFloat(String(material.quantity || 0)),
              unit: material.gold_weight ? 'grams' : 'pieces',
              assignedDate: material.assigned_date
                ? (material.assigned_date.includes('T')
                  ? material.assigned_date.split('T')[0]
                  : material.assigned_date)
                : new Date().toISOString().split('T')[0],
              projectId: material.target_item_id,
              completed: material.status === 'completed',
              completedDate: material.completion_date || undefined,
              completionNotes: material.notes || undefined,
              agreedAmount: material.agreed_amount ? parseFloat(String(material.agreed_amount)) : undefined,
              amountPaid: material.amount_paid ? parseFloat(String(material.amount_paid)) : undefined,
              paymentStatus: material.payment_status as 'unpaid' | 'partial' | 'paid' | undefined,
              inventoryItemId: material.material_id,
              inventoryItemType: material.material_type,
              estimatedDelivery: material.due_date || material.expected_completion_date
                ? (material.due_date || material.expected_completion_date?.split('T')[0])
                : undefined,
              status: material.status === 'completed' ? 'completed' :
                material.status === 'in_progress' ? 'in-progress' : 'pending',
            };

            acc[craftsmanId].push(rawMaterial);
            return acc;
          }, {} as Record<string, RawMaterial[]>);

          setCraftsmen(prev => {
            if (!Array.isArray(prev)) return prev;

            return prev.map(craftsman => {
              const materials = materialsByCraftsman[craftsman.id] || [];
              const existingMaterials = Array.isArray(craftsman.assignedMaterials)
                ? craftsman.assignedMaterials
                : [];

              const materialMap = new Map(existingMaterials.map(m => [m.id, m]));
              materials.forEach(m => {
                materialMap.set(m.id, m);
              });

              return {
                ...craftsman,
                assignedMaterials: Array.from(materialMap.values())
              };
            });
          });

          setMaterialsLoaded(true);
        } else {
          setMaterialsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading materials_assigned:', error);
        setMaterialsLoaded(true);
      }
    };

    loadMaterialsAssigned();
  }, [loaded, materialsLoaded, craftsmen, setCraftsmen]);

  const safeCraftsmen = Array.isArray(craftsmen) ? craftsmen : [];
  const craftsmenWithCompletedField = safeCraftsmen.map(craftsman => ({
    ...craftsman,
    assignedMaterials: Array.isArray(craftsman.assignedMaterials)
      ? craftsman.assignedMaterials.map(material => ({
        ...material,
        completed: material.completed ?? false
      }))
      : []
  }));

  const filteredCraftsmen = craftsmenWithCompletedField.filter(craftsman =>
    craftsman.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    craftsman.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCraftsman = async (newCraftsman: Omit<Craftsman, 'id'>) => {
    try {
      const craftsman: Craftsman = {
        ...newCraftsman,
        id: Date.now().toString()
      };

      const experienceYears = typeof newCraftsman.experience === 'string'
        ? parseInt(newCraftsman.experience.replace(/\D/g, '')) || 0
        : (typeof newCraftsman.experience === 'number' ? newCraftsman.experience : 0);

      const craftsmanData: any = {
        id: craftsman.id,
        name: craftsman.name,
        phone: craftsman.contact || '',
        email: '',
        address: '',
        specialty: craftsman.specialty || '',
        experience_years: experienceYears,
        status: craftsman.status || 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (craftsman.type) {
        craftsmanData.type = craftsman.type;
      }

      if (craftsman.type === 'firm') {
        if (craftsman.firmName) craftsmanData.firm_name = craftsman.firmName;
        if (craftsman.firmContact) craftsmanData.firm_contact = craftsman.firmContact;
        if (craftsman.firmAddress) craftsmanData.firm_address = craftsman.firmAddress;
        if (craftsman.firmGSTNumber) craftsmanData.firm_gst_number = craftsman.firmGSTNumber;
        if (craftsman.contactPerson) craftsmanData.contact_person = craftsman.contactPerson;
      }

      await upsertToSupabase('craftsmen', craftsmanData);

      setCraftsmen(prev => [...prev, craftsman]);
      toast({
        title: "Craftsman Added",
        description: `${craftsman.name} has been added to your team.`
      });
    } catch (error) {
      console.error('Error adding craftsman:', error);
      toast({
        title: "Error",
        description: "Failed to add craftsman. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAssignMaterial = async (material: Omit<RawMaterial, 'id'>) => {
    if (!selectedCraftsman) return;

    const newMaterial: RawMaterial = {
      ...material,
      id: Date.now().toString(),
      completed: false
    };

    const updatedCraftsmen = craftsmen.map(craftsman => {
      if (craftsman.id === selectedCraftsman.id) {
        const updatedDue = (craftsman.totalAmountDue || 0) + (material.agreedAmount || 0);
        const updatedPending = (craftsman.pendingAmount || 0) + (material.agreedAmount || 0);

        const currentMaterials = Array.isArray(craftsman.assignedMaterials)
          ? craftsman.assignedMaterials
          : [];

        return {
          ...craftsman,
          assignedMaterials: [...currentMaterials, newMaterial],
          totalAmountDue: updatedDue,
          pendingAmount: updatedPending
        };
      }
      return craftsman;
    });

    await setCraftsmen(updatedCraftsmen);

    try {
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      if (userId && selectedCraftsman) {
        const now = new Date().toISOString();
        const assignedDate = newMaterial.assignedDate
          ? new Date(newMaterial.assignedDate).toISOString()
          : now;

        const materialData: any = {
          id: newMaterial.id,
          user_id: userId,
          craftsman_id: selectedCraftsman.id,
          craftsman_name: selectedCraftsman.name,
          material_type: newMaterial.inventoryItemType || 'raw_material',
          material_id: newMaterial.inventoryItemId || newMaterial.id,
          quantity: parseFloat(String(newMaterial.quantity || 0)),
          item_description: newMaterial.type || '',
          item_type: newMaterial.inventoryItemType || 'custom',
          assigned_date: assignedDate,
          status: newMaterial.completed ? 'completed' : 'assigned',
          created_at: now,
          updated_at: now,
        };

        if (newMaterial.projectId) {
          materialData.target_item_id = newMaterial.projectId;
        }

        if (newMaterial.quantity) {
          if (newMaterial.unit === 'grams' || newMaterial.unit === 'g') {
            materialData.gold_weight = parseFloat(String(newMaterial.quantity));
            materialData.gold_purity = '22K';
          } else {
            materialData.other_materials = `${newMaterial.quantity} ${newMaterial.unit || ''} ${newMaterial.type || ''}`;
          }
        }

        if (newMaterial.estimatedDelivery) {
          materialData.due_date = newMaterial.estimatedDelivery;
          materialData.expected_completion_date = new Date(newMaterial.estimatedDelivery).toISOString();
        }

        if (newMaterial.agreedAmount) {
          materialData.agreed_amount = parseFloat(String(newMaterial.agreedAmount));
        }

        if (newMaterial.amountPaid) {
          materialData.amount_paid = parseFloat(String(newMaterial.amountPaid));
        }

        if (newMaterial.paymentStatus) {
          materialData.payment_status = newMaterial.paymentStatus;
        }

        if (newMaterial.completedDate) {
          materialData.completion_date = newMaterial.completedDate;
        }

        if (newMaterial.completionNotes) {
          materialData.notes = newMaterial.completionNotes;
        }

        if (newMaterial.inventoryItemId) {
          materialData.is_new_item = false;
        }

        await upsertToSupabase('materials_assigned', materialData);
      }
    } catch (syncError) {
      console.warn('Failed to save material assignment to Supabase:', syncError);
    }

    toast({
      title: "Material Assigned",
      description: `${material.type} has been assigned to ${selectedCraftsman.name}.`
    });

    // Update selected craftsman for the details dialog
    const updatedCraftsman = updatedCraftsmen.find(c => c.id === selectedCraftsman.id);
    if (updatedCraftsman) {
      setSelectedCraftsman(updatedCraftsman);
    }
  };

  const handleViewDetails = (craftsman: Craftsman) => {
    setSelectedCraftsman(craftsman);
    setShowDetailsDialog(true);
  };

  const handleAssignProject = (craftsman: Craftsman) => {
    setSelectedCraftsman(craftsman);
    setShowMaterialDialog(true);
  };

  const handleCompleteTask = (materialId: string) => {
    const craftsman = craftsmen.find(c => 
      Array.isArray(c.assignedMaterials) && c.assignedMaterials.some(m => m.id === materialId)
    );
    const material = craftsman?.assignedMaterials.find(m => m.id === materialId);
    
    if (material && craftsman) {
      setSelectedCraftsman(craftsman);
      setSelectedMaterialForCompletion(material);
      
      // If it's a weight-based material (Gold/Silver), use the JobReturnDialog
      if (material.unit === 'grams' || ['Gold 24K', 'Gold 22K', 'Gold 18K', 'Silver'].includes(material.type)) {
        setShowJobReturnDialog(true);
      } else {
        setShowCompletionPaymentDialog(true);
      }
    }
  };

  const handleJobReturnComplete = async (details: JobReturnDetails) => {
    if (!selectedMaterialForCompletion || !selectedCraftsman) return;

    const materialId = selectedMaterialForCompletion.id;
    const updatedCraftsmen = craftsmen.map(craftsman => {
      if (craftsman.id !== selectedCraftsman.id) return craftsman;

      const materials = Array.isArray(craftsman.assignedMaterials)
        ? craftsman.assignedMaterials
        : [];

      return {
        ...craftsman,
        assignedMaterials: materials.map(material => {
          if (material.id === materialId) {
            const paymentStatus: 'unpaid' | 'partial' | 'paid' = 
              details.paymentMethod === 'Ledger' ? 'unpaid' : 'paid';

            return {
              ...material,
              completed: true,
              completedDate: new Date().toISOString().split('T')[0],
              amountPaid: details.paymentMethod === 'Ledger' ? 0 : details.makingCharge,
              paymentStatus,
              completionNotes: `Received: ${details.receivedWeight}g. Wastage: ${details.wastageGrams}g. Notes: ${details.notes}`,
              recoveryDetails: details,
              status: 'completed' as const,
            };
          }
          return material;
        }),
        // Update craftsman-level totals if needed
        totalAmountDue: (craftsman.totalAmountDue || 0) + details.makingCharge,
        pendingAmount: (craftsman.pendingAmount || 0) + (details.paymentMethod === 'Ledger' ? details.makingCharge : 0),
      };
    });

    await setCraftsmen(updatedCraftsmen);
    
    // Sync to Supabase
    try {
      await upsertToSupabase('materials_assigned', {
        id: materialId,
        status: 'completed',
        completion_date: new Date().toISOString(),
        notes: `Received Weight: ${details.receivedWeight}g, Wastage: ${details.wastageGrams}g. ${details.notes}`,
        amount_paid: details.paymentMethod === 'Ledger' ? 0 : details.makingCharge,
        payment_status: details.paymentMethod === 'Ledger' ? 'unpaid' : 'paid',
        recovery_weight: details.receivedWeight,
        fine_weight: details.fineWeight,
        wastage_grams: details.wastageGrams,
        scrap_weight: details.scrapWeight
      });
    } catch (e) {
      console.warn("Failed to sync job return to Supabase", e);
    }

    toast({
      title: "Task Completed",
      description: `Job from ${selectedCraftsman.name} has been marked as returned and accounted.`,
    });
  };

  const handleCompleteTaskWithPayment = async (
    materialId: string,
    paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Pay Later',
    amountPaid?: number,
    cardNumber?: string
  ) => {
    const updatedCraftsmen = craftsmen.map(craftsman => {
      const materials = Array.isArray(craftsman.assignedMaterials)
        ? craftsman.assignedMaterials
        : [];

      return {
        ...craftsman,
        assignedMaterials: materials.map(material => {
          if (material.id === materialId) {
            const newAmountPaid = amountPaid || 0;
            const agreedAmount = material.agreedAmount || 0;
            const paymentStatus: 'unpaid' | 'partial' | 'paid' = 
              paymentMethod === 'Pay Later' ? 'unpaid' :
              newAmountPaid >= agreedAmount ? 'paid' :
              newAmountPaid > 0 ? 'partial' : 'unpaid';

            return {
              ...material,
              completed: true,
              completedDate: new Date().toISOString().split('T')[0],
              amountPaid: newAmountPaid,
              paymentStatus,
            };
          }
          return material;
        })
      };
    });

    await setCraftsmen(updatedCraftsmen);

    try {
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      if (userId) {
        let completedMaterial: RawMaterial | undefined;
        let craftsmanForMaterial: Craftsman | undefined;

        for (const craftsman of updatedCraftsmen) {
          const material = Array.isArray(craftsman.assignedMaterials)
            ? craftsman.assignedMaterials.find(m => m.id === materialId)
            : undefined;
          if (material) {
            completedMaterial = material;
            craftsmanForMaterial = craftsman;
            break;
          }
        }

        if (completedMaterial && craftsmanForMaterial) {
          const completionDate = completedMaterial.completedDate || new Date().toISOString().split('T')[0];
          const agreedAmount = completedMaterial.agreedAmount || 0;
          const amountPaidValue = completedMaterial.amountPaid || 0;
          const paymentStatus = completedMaterial.paymentStatus || 'unpaid';

          await upsertToSupabase('materials_assigned', {
            id: completedMaterial.id,
            craftsman_id: craftsmanForMaterial.id,
            craftsman_name: craftsmanForMaterial.name,
            material_type: completedMaterial.inventoryItemType || 'raw_material',
            material_id: completedMaterial.inventoryItemId || completedMaterial.id,
            quantity: parseFloat(String(completedMaterial.quantity || 0)),
            item_description: completedMaterial.type || '',
            status: 'completed',
            completion_date: completionDate,
            agreed_amount: agreedAmount > 0 ? agreedAmount : null,
            amount_paid: amountPaidValue,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString(),
          });

          // Update inventory based on assignment type
          if (completedMaterial.assignmentType === 'raw_material') {
            // Add new item to inventory when raw material task is completed
            try {
              const { getUserData, setUserData } = await import('@/lib/userStorage');
              const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
              
              const category = completedMaterial.inventoryItemType || 'jewelry';
              const itemName = completedMaterial.type || 'Completed Item';
              const quantity = completedMaterial.quantity || 0;
              
              const newInventoryItem = {
                id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: itemName,
                category: category,
                subcategory: completedMaterial.type || '',
                price: 0,
                stock: quantity,
                inStock: quantity,
                item_type: category,
                type: completedMaterial.type || '',
                description: `Completed by ${craftsmanForMaterial.name} on ${completionDate}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              inventoryItems.push(newInventoryItem);
              await setUserData('inventory_items', inventoryItems);
              
              await upsertToSupabase('inventory', {
                id: newInventoryItem.id,
                name: newInventoryItem.name,
                category: newInventoryItem.category,
                subcategory: newInventoryItem.subcategory,
                price: newInventoryItem.price,
                stock: newInventoryItem.stock,
                description: newInventoryItem.description,
                created_at: newInventoryItem.created_at,
                updated_at: newInventoryItem.updated_at,
              });

              toast({
                title: "Inventory Updated",
                description: `${itemName} has been added to inventory.`
              });
            } catch (invError) {
              console.warn('Failed to add item to inventory:', invError);
            }
          } else if (completedMaterial.assignmentType === 'inventory_item' && completedMaterial.inventoryItemId) {
            // Increase quantity of existing inventory item
            try {
              const { getUserData, setUserData } = await import('@/lib/userStorage');
              const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
              
              const inventoryItem = inventoryItems.find(item => item.id === completedMaterial.inventoryItemId);
              if (inventoryItem) {
                const currentStock = inventoryItem.stock || inventoryItem.inStock || 0;
                const quantityToAdd = completedMaterial.quantity || 0;
                const newStock = currentStock + quantityToAdd;

                const updatedItem = {
                  ...inventoryItem,
                  stock: newStock,
                  inStock: newStock,
                  updated_at: new Date().toISOString(),
                };

                const itemIndex = inventoryItems.findIndex(item => item.id === inventoryItem.id);
                if (itemIndex >= 0) {
                  inventoryItems[itemIndex] = updatedItem;
                }

                await setUserData('inventory_items', inventoryItems);

                await upsertToSupabase('inventory', {
                  id: inventoryItem.id,
                  name: inventoryItem.name || '',
                  category: inventoryItem.category || inventoryItem.item_type || 'jewelry',
                  subcategory: inventoryItem.subcategory || inventoryItem.type || '',
                  price: inventoryItem.price || 0,
                  stock: newStock,
                  description: inventoryItem.description || '',
                  updated_at: new Date().toISOString(),
                });

                toast({
                  title: "Inventory Updated",
                  description: `Quantity of ${inventoryItem.name} increased by ${quantityToAdd}.`
                });
              }
            } catch (invError) {
              console.warn('Failed to update inventory quantity:', invError);
            }
          }
        }
      }
    } catch (syncError) {
      console.warn('Failed to update material assignment in Supabase:', syncError);
    }

    // Update selected craftsman if it's the one being updated
    if (selectedCraftsman) {
      const updatedCraftsman = updatedCraftsmen.find(c => c.id === selectedCraftsman.id);
      if (updatedCraftsman) {
        setSelectedCraftsman(updatedCraftsman);
      }
    }

    const paymentMessage = paymentMethod === 'Pay Later' 
      ? 'Task completed. Payment pending.'
      : `Task completed. Payment received via ${paymentMethod}.`;

    toast({
      title: "Task Completed",
      description: paymentMessage
    });

    setSelectedMaterialForCompletion(null);
  };

  const handlePayCompletedTask = (materialId: string) => {
    const material = craftsmen
      .flatMap(c => Array.isArray(c.assignedMaterials) ? c.assignedMaterials : [])
      .find(m => m.id === materialId && m.completed);
    
    if (material) {
      setSelectedMaterialForCompletion(material);
      setShowCompletionPaymentDialog(true);
    }
  };

  const handleUpdatePaymentForCompletedTask = async (
    materialId: string,
    paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Pay Later',
    amountPaid?: number,
    cardNumber?: string
  ) => {
    const updatedCraftsmen = craftsmen.map(craftsman => {
      const materials = Array.isArray(craftsman.assignedMaterials)
        ? craftsman.assignedMaterials
        : [];

      return {
        ...craftsman,
        assignedMaterials: materials.map(material => {
          if (material.id === materialId && material.completed) {
            const agreedAmount = material.agreedAmount || 0;
            const currentPaid = material.amountPaid || 0;
            const remainingBalance = agreedAmount - currentPaid;
            
            let newAmountPaid: number;
            if (paymentMethod === 'Pay Later') {
              newAmountPaid = currentPaid;
            } else {
              const paymentAmount = amountPaid || 0;
              newAmountPaid = Math.min(currentPaid + paymentAmount, agreedAmount);
            }
            
            const paymentStatus: 'unpaid' | 'partial' | 'paid' = 
              paymentMethod === 'Pay Later' ? (currentPaid > 0 ? 'partial' : 'unpaid') :
              newAmountPaid >= agreedAmount ? 'paid' :
              newAmountPaid > 0 ? 'partial' : 'unpaid';

            return {
              ...material,
              amountPaid: newAmountPaid,
              paymentStatus,
            };
          }
          return material;
        })
      };
    });

    await setCraftsmen(updatedCraftsmen);

    try {
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      if (userId) {
        let updatedMaterial: RawMaterial | undefined;
        let craftsmanForMaterial: Craftsman | undefined;

        for (const craftsman of updatedCraftsmen) {
          const material = Array.isArray(craftsman.assignedMaterials)
            ? craftsman.assignedMaterials.find(m => m.id === materialId)
            : undefined;
          if (material) {
            updatedMaterial = material;
            craftsmanForMaterial = craftsman;
            break;
          }
        }

        if (updatedMaterial && craftsmanForMaterial) {
          const agreedAmount = updatedMaterial.agreedAmount || 0;
          const amountPaidValue = updatedMaterial.amountPaid || 0;
          const paymentStatus = updatedMaterial.paymentStatus || 'unpaid';

          await upsertToSupabase('materials_assigned', {
            id: updatedMaterial.id,
            craftsman_id: craftsmanForMaterial.id,
            craftsman_name: craftsmanForMaterial.name,
            material_type: updatedMaterial.inventoryItemType || 'raw_material',
            material_id: updatedMaterial.inventoryItemId || updatedMaterial.id,
            quantity: parseFloat(String(updatedMaterial.quantity || 0)),
            item_description: updatedMaterial.type || '',
            agreed_amount: agreedAmount > 0 ? agreedAmount : null,
            amount_paid: amountPaidValue,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (syncError) {
      console.warn('Failed to update payment in Supabase:', syncError);
    }

    // Update selected craftsman if it's the one being updated
    if (selectedCraftsman) {
      const updatedCraftsman = updatedCraftsmen.find(c => c.id === selectedCraftsman.id);
      if (updatedCraftsman) {
        setSelectedCraftsman(updatedCraftsman);
      }
    }

    const paymentMessage = paymentMethod === 'Pay Later' 
      ? 'Payment status updated.'
      : `Payment of ₹${(amountPaid || 0).toLocaleString()} recorded via ${paymentMethod}.`;

    toast({
      title: "Payment Updated",
      description: paymentMessage
    });

    setSelectedMaterialForCompletion(null);
  };

  const handleCompleteProject = async (materialId: string, notes: string) => {
    const updatedCraftsmen = craftsmen.map(craftsman => {
      const materials = Array.isArray(craftsman.assignedMaterials)
        ? craftsman.assignedMaterials
        : [];

      return {
        ...craftsman,
        assignedMaterials: materials.map(material =>
          material.id === materialId
            ? {
              ...material,
              completed: true,
              completedDate: new Date().toISOString().split('T')[0],
              completionNotes: notes
            }
            : material
        )
      };
    });

    await setCraftsmen(updatedCraftsmen);

    try {
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      if (userId) {
        let completedMaterial: RawMaterial | undefined;
        let craftsmanForMaterial: Craftsman | undefined;

        for (const craftsman of updatedCraftsmen) {
          const material = Array.isArray(craftsman.assignedMaterials)
            ? craftsman.assignedMaterials.find(m => m.id === materialId)
            : undefined;
          if (material) {
            completedMaterial = material;
            craftsmanForMaterial = craftsman;
            break;
          }
        }

        if (completedMaterial && craftsmanForMaterial) {
          const completionDate = completedMaterial.completedDate || new Date().toISOString().split('T')[0];
          await upsertToSupabase('materials_assigned', {
            id: completedMaterial.id,
            craftsman_id: craftsmanForMaterial.id,
            craftsman_name: craftsmanForMaterial.name,
            material_type: completedMaterial.inventoryItemType || 'raw_material',
            material_id: completedMaterial.inventoryItemId || completedMaterial.id,
            quantity: parseFloat(String(completedMaterial.quantity || 0)),
            item_description: completedMaterial.type || '',
            status: 'completed',
            completion_date: completionDate,
            notes: notes || completedMaterial.completionNotes || '',
            updated_at: new Date().toISOString(),
          });

          // Update inventory based on assignment type
          if (completedMaterial.assignmentType === 'raw_material') {
            // Add new item to inventory when raw material task is completed
            try {
              const { getUserData, setUserData } = await import('@/lib/userStorage');
              const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
              
              const category = completedMaterial.inventoryItemType || 'jewelry';
              const itemName = completedMaterial.type || 'Completed Item';
              const quantity = completedMaterial.quantity || 0;
              
              const newInventoryItem = {
                id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: itemName,
                category: category,
                subcategory: completedMaterial.type || '',
                price: 0,
                stock: quantity,
                inStock: quantity,
                item_type: category,
                type: completedMaterial.type || '',
                description: `Completed by ${craftsmanForMaterial.name} on ${completionDate}. Notes: ${notes || ''}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              inventoryItems.push(newInventoryItem);
              await setUserData('inventory_items', inventoryItems);
              
              await upsertToSupabase('inventory', {
                id: newInventoryItem.id,
                name: newInventoryItem.name,
                category: newInventoryItem.category,
                subcategory: newInventoryItem.subcategory,
                price: newInventoryItem.price,
                stock: newInventoryItem.stock,
                description: newInventoryItem.description,
                created_at: newInventoryItem.created_at,
                updated_at: newInventoryItem.updated_at,
              });

              toast({
                title: "Inventory Updated",
                description: `${itemName} has been added to inventory.`
              });
            } catch (invError) {
              console.warn('Failed to add item to inventory:', invError);
            }
          } else if (completedMaterial.assignmentType === 'inventory_item' && completedMaterial.inventoryItemId) {
            // Increase quantity of existing inventory item
            try {
              const { getUserData, setUserData } = await import('@/lib/userStorage');
              const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
              
              const inventoryItem = inventoryItems.find(item => item.id === completedMaterial.inventoryItemId);
              if (inventoryItem) {
                const currentStock = inventoryItem.stock || inventoryItem.inStock || 0;
                const quantityToAdd = completedMaterial.quantity || 0;
                const newStock = currentStock + quantityToAdd;

                const updatedItem = {
                  ...inventoryItem,
                  stock: newStock,
                  inStock: newStock,
                  updated_at: new Date().toISOString(),
                };

                const itemIndex = inventoryItems.findIndex(item => item.id === inventoryItem.id);
                if (itemIndex >= 0) {
                  inventoryItems[itemIndex] = updatedItem;
                }

                await setUserData('inventory_items', inventoryItems);

                await upsertToSupabase('inventory', {
                  id: inventoryItem.id,
                  name: inventoryItem.name || '',
                  category: inventoryItem.category || inventoryItem.item_type || 'jewelry',
                  subcategory: inventoryItem.subcategory || inventoryItem.type || '',
                  price: inventoryItem.price || 0,
                  stock: newStock,
                  description: inventoryItem.description || '',
                  updated_at: new Date().toISOString(),
                });

                toast({
                  title: "Inventory Updated",
                  description: `Quantity of ${inventoryItem.name} increased by ${quantityToAdd}.`
                });
              }
            } catch (invError) {
              console.warn('Failed to update inventory quantity:', invError);
            }
          }
        }
      }
    } catch (syncError) {
      console.warn('Failed to update material assignment in Supabase:', syncError);
    }

    toast({
      title: "Project Completed",
      description: "Project has been marked as completed with notes."
    });
  };

  const handleRecordPayment = (payment: Omit<PaymentRecord, 'id' | 'craftsmanId'>) => {
    if (!selectedCraftsman) return;

    const newPayment: PaymentRecord = {
      ...payment,
      id: Date.now().toString(),
      craftsmanId: selectedCraftsman.id
    };

    setCraftsmen(prev => {
      const updated = prev.map(craftsman => {
        if (craftsman.id === selectedCraftsman.id) {
          const updatedPaid = (craftsman.totalAmountPaid || 0) + payment.amount;
          const updatedPending = (craftsman.pendingAmount || 0) - payment.amount;
          const paymentHistory = [...(craftsman.paymentHistory || []), newPayment];

          let updatedMaterials = Array.isArray(craftsman.assignedMaterials)
            ? craftsman.assignedMaterials
            : [];
          if (payment.projectId) {
            updatedMaterials = updatedMaterials.map(material => {
              if (material.projectId === payment.projectId && material.agreedAmount) {
                const newAmountPaid = (material.amountPaid || 0) + payment.amount;
                const paymentStatus: 'unpaid' | 'partial' | 'paid' =
                  newAmountPaid >= material.agreedAmount ? 'paid' :
                    newAmountPaid > 0 ? 'partial' : 'unpaid';

                const updatedMaterial = {
                  ...material,
                  amountPaid: newAmountPaid,
                  paymentStatus
                };

                (async () => {
                  try {
                    const { getCurrentUserId } = await import('@/lib/userStorage');
                    const userId = await getCurrentUserId();
                    if (userId) {
                      await upsertToSupabase('materials_assigned', {
                        id: material.id,
                        amount_paid: newAmountPaid,
                        payment_status: paymentStatus,
                        updated_at: new Date().toISOString(),
                      });
                    }
                  } catch (syncError) {
                    console.warn('Failed to update payment in materials_assigned:', syncError);
                  }
                })();

                return updatedMaterial;
              }
              return material;
            });
          }

          return {
            ...craftsman,
            totalAmountPaid: updatedPaid,
            pendingAmount: Math.max(0, updatedPending),
            paymentHistory,
            assignedMaterials: updatedMaterials
          };
        }
        return craftsman;
      });

      const updatedCraftsman = updated.find(c => c.id === selectedCraftsman.id);
      if (updatedCraftsman) {
        setSelectedCraftsman(updatedCraftsman);
      }

      return updated;
    });

    toast({
      title: "Payment Recorded",
      description: `Payment of ₹${payment.amount.toLocaleString()} has been recorded for ${selectedCraftsman.name}.`
    });

    setShowPaymentDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state while data is being fetched
  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading craftsmen data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-600 mb-4">Craftsmen Tracking System</h1>
          <p className="text-xl text-green-500 mb-8">Track raw materials assigned to craftsmen and their work progress.</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
          {/* Assign Raw Material Card */}
          <Card
            className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={() => {
              if (safeCraftsmen.length === 0) {
                toast({
                  title: "No Craftsmen Available",
                  description: "Please add craftsmen first before assigning materials.",
                  variant: "destructive"
                });
                return;
              }
              // Scroll to table to select a craftsman
              const tableElement = document.getElementById('assignments-table');
              tableElement?.scrollIntoView({ behavior: 'smooth' });
              toast({
                title: "Select a Craftsman",
                description: "Click 'Assign' button next to a craftsman to assign materials."
              });
            }}
          >
            <CardContent className="text-center">
              <div className="p-4 bg-green-600 rounded-lg inline-block mb-4">
                <Database className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">Assign Raw Material to Craftsman</h3>
              <p className="text-green-600">Allocate materials to craftsmen for jewelry production</p>
            </CardContent>
          </Card>

          {/* Craftsmen Assignments Card */}
          <Card
            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={() => {
              const tableElement = document.getElementById('assignments-table');
              tableElement?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CardContent className="text-center">
              <div className="p-4 bg-blue-600 rounded-lg inline-block mb-4">
                <TableIcon className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-2">Craftsmen Assignments</h3>
              <p className="text-blue-600">Table to monitor raw material assignments and progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-gray-800">{safeCraftsmen.length}</div>
            <div className="text-sm text-gray-600">Total Craftsmen</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {safeCraftsmen.reduce((sum, c) => sum + (c.assignedMaterials?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Materials Assigned</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {safeCraftsmen.filter(c => c.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {safeCraftsmen.filter(c => c.status === 'busy').length}
            </div>
            <div className="text-sm text-gray-600">Busy</div>
          </Card>
        </div>

        {/* Assignments Table */}
        <div id="assignments-table" className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Material Assignments</h2>
                <p className="text-gray-600">Monitor craftsmen and their assigned materials</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Craftsman
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search craftsmen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <UITable>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Craftsman</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCraftsmen.map(craftsman => (
                  <TableRow key={craftsman.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-green-100 rounded-full">
                          <Hammer className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{craftsman.name}</span>
                            {craftsman.type === 'firm' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                Firm
                              </Badge>
                            )}
                          </div>
                          {craftsman.type === 'firm' && craftsman.contactPerson && (
                            <span className="text-xs text-gray-500">Contact: {craftsman.contactPerson}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{craftsman.specialty}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(craftsman.status)}>
                        {craftsman.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{craftsman.experience}</TableCell>
                    <TableCell>{craftsman.currentProjects}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span>{craftsman.assignedMaterials.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{craftsman.contact}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(craftsman)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAssignProject(craftsman)}
                        >
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>

          {filteredCraftsmen.length === 0 && (
            <div className="text-center py-12">
              <Hammer className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No craftsmen found</h3>
              <p className="text-gray-600">Try adjusting your search or add new craftsmen</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <AddCraftsmanDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddCraftsman}
      />

      <MaterialAssignDialog
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
        craftsmanName={selectedCraftsman?.name || ""}
        onAssign={handleAssignMaterial}
      />

      <CraftsmanDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        craftsman={selectedCraftsman}
        onAssignMaterial={() => {
          setShowDetailsDialog(false);
          setShowMaterialDialog(true);
        }}
        onCompleteTask={handleCompleteTask}
        onCompleteProject={handleCompleteProject}
        onRecordPayment={() => {
          setShowDetailsDialog(false);
          setShowPaymentDialog(true);
        }}
        onPayCompletedTask={handlePayCompletedTask}
      />

      <CraftsmanPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        craftsmanId={selectedCraftsman?.id || ''}
        craftsmanName={selectedCraftsman?.name || ''}
        pendingAmount={selectedCraftsman?.pendingAmount || 0}
        onRecordPayment={handleRecordPayment}
      />

      {selectedMaterialForCompletion && (
        <CompletionPaymentDialog
          open={showCompletionPaymentDialog}
          onOpenChange={setShowCompletionPaymentDialog}
          materialId={selectedMaterialForCompletion.id}
          materialName={selectedMaterialForCompletion.type || 'Task'}
          agreedAmount={selectedMaterialForCompletion.agreedAmount || 0}
          onComplete={(paymentMethod, amountPaid, cardNumber) => {
            if (selectedMaterialForCompletion.completed) {
              handleUpdatePaymentForCompletedTask(
                selectedMaterialForCompletion.id,
                paymentMethod,
                amountPaid,
                cardNumber
              );
            } else {
              handleCompleteTaskWithPayment(
                selectedMaterialForCompletion.id,
                paymentMethod,
                amountPaid,
                cardNumber
              );
            }
            setShowCompletionPaymentDialog(false);
          }}
        />
      )}

      {selectedMaterialForCompletion && selectedCraftsman && (
        <JobReturnDialog 
          open={showJobReturnDialog}
          onOpenChange={setShowJobReturnDialog}
          material={selectedMaterialForCompletion}
          craftsmanName={selectedCraftsman.name}
          onComplete={handleJobReturnComplete}
        />
      )}
    </div>
  );
};

export default CraftsmenTracking;
