import { useUserStorage } from "./useUserStorage";

export const useBusinessName = () => {
  // CRITICAL: Use useUserStorage for user-scoped business settings
  const { data: businessSettings, loaded } = useUserStorage('businessSettings', {
    businessName: "Jewellery Management System",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  // Return business name - show default only if loaded and no name set
  // This prevents showing default during initial load
  if (!loaded) {
    return "Loading..."; // Show loading state while data loads
  }
  
  return businessSettings?.businessName || "Jewellery Management System";
};



