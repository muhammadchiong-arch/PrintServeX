"use client";

// Gives browser components the shop details that the root layout read from Supabase
import { createContext, useContext } from "react";
import { SHOP_FALLBACK, type Shop } from "@/lib/shop";

const ShopContext = createContext<Shop>(SHOP_FALLBACK);

export function ShopProvider({ shop, children }: { shop: Shop; children: React.ReactNode }) {
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
