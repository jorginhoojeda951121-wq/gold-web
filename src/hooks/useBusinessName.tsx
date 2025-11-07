import { useUserStorage } from "./useUserStorage";

export const useBusinessName = () => {
  // CRITICAL: Use useUserStorage for user-scoped business settings
  const { data: businessSettings } = useUserStorage('businessSettings', {
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



