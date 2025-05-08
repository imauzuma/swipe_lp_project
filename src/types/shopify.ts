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
  priceRange?: {
    minVariantPrice: ShopifyPrice;
  };
  onlineStoreUrl: string | null;
}

export interface ShopifyMetaobject {
  handle: string;
  slides: {
    references: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  };
}
