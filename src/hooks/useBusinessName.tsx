import { useOfflineStorage } from "./useOfflineStorage";

export const useBusinessName = () => {
  const { data: businessSettings } = useOfflineStorage('businessSettings', {
    businessName: "Jewellery Management System",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  // Return business name or fallback to default
  return businessSettings?.businessName || "Jewellery Management System";
};



