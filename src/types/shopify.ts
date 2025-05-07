export interface ShopifyImage {
  url: string;
  altText?: string;
}

export interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  images: ShopifyImage[];
  priceRange: {
    minVariantPrice: ShopifyPrice;
  };
  onlineStoreUrl: string;
}

export interface ShopifyMetaobject {
  id: string;
  handle: string;
  slides: {
    type: string;
    value: string;
    references?: {
      nodes: Array<ShopifyProduct>;
    };
  };
}
