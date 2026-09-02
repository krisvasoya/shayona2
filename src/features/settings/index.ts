/**
 * Settings Feature Module Placeholder
 */

export interface ShopProfile {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  language: 'en' | 'gu';
}

export const defaultShopProfile: ShopProfile = {
  shopName: 'Shayona Enterprise',
  ownerName: '',
  phone: '',
  address: '',
  language: 'en',
};
