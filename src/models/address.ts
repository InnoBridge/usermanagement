interface Address {
  id: string;
  userId: string;
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  // ISO 3166-1 alpha-2 country code (e.g. "US", "GB", "FR")
  country: string;
};

export { 
    Address 
};