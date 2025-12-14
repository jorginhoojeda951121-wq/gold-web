import { useData } from "@/contexts/DataContext";

export const useBusinessName = () => {
  const { businessSettings, loading } = useData();
  
  if (loading.settings) {
    return "Loading...";
  }
  
  const name = businessSettings?.businessName;
  if (name && name.trim() !== "") {
    return name;
  }
  
  return "Jewellery Management System";
};



