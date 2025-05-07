// 環境変数の取得とデフォルト値設定
const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  ? process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '')
  : '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2025-04'; // お客様の環境変数に合わせてください
const LP_METAOBJECT_HANDLE_FROM_ENV = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';

// 型定義
interface ShopifyError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

interface ShopifyFetchResponse<T> {
  data?: T;
  errors?: ShopifyError[];
}

interface ProductImageNode {
  url: string;
  altText?: string | null;
}

interface ProductImageEdge {
  node: ProductImageNode;
}

interface Product {
  id: string;
  handle: string;
  title: string;
  images: {
    edges: ProductImageEdge[];
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  onlineStoreUrl: string | null;
}

interface MetaobjectSlideReferenceNode {
  id: string; // 商品のグローバルID (gid://shopify/Product/xxxx)
  handle: string;
}

interface MetaobjectSlidesField {
  // type: string; // Storefront APIではこの`type`フィールドは通常不要か、アクセスできないことが多い
  // value: string | null; // 商品参照リストの場合、valueは通常使わない
  references?: {
    nodes: MetaobjectSlideReferenceNode[];
  };
}

interface Metaobject {
  id: string;
  handle: string;
  // フィールドキーをスクリーンショットに合わせて "products_list" に変更
  products_list: MetaobjectSlidesField | null;
}

export interface LPSlideProduct {
  id: string;
  handle: string;
  title: string;
  images: Array<{ url: string; altText?: string }>;
  price: string;
  productPageUrl: string | null;
}

const shopifyFetch = async <T>({ /* ... 前回のコードと同じ ... */ query, variables = {} }: { query: string; variables?: Record<string, any>; }): Promise<ShopifyFetchResponse<T>> => {
  const missingVars = [];
  if (!SHOPIFY_STORE_DOMAIN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN');
  if (!SHOPIFY_API_VERSION) missingVars.push('NEXT_PUBLIC_SHOPIFY_API_VERSION');

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Shopify API configuration error: Missing environment variables.`);
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  console.log('Shopify API Request:', {
    endpoint,
    query: query.substring(0, 100) + '...',
    hasVariables: !!Object.keys(variables).length,
    variables: JSON.stringify(variables).substring(0,100) + '...',
    hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      console.error('Shopify API Error:', {
        status: response.status,
        statusText: response.statusText,
        errors: result.errors || 'Unknown HTTP error',
        endpoint,
        querySent: query.substring(0, 100) + '...',
        variablesSent: JSON.stringify(variables).substring(0,100) + '...'
      });
      const errorMessages = result.errors ? result.errors.map((e: ShopifyError) => e.message).join(', ') : `HTTP error ${response.status}`;
      throw new Error(`Shopify API request failed: ${errorMessages}`);
    }
    return result;
  } catch (error) {
    console.error('Error in shopifyFetch:', error);
    throw error;
  }
};


export const fetchLPSlidesData = async (
  metaobjectHandleParam?: string
): Promise<LPSlideProduct[]> => {
  const metaobjectHandle = metaobjectHandleParam || LP_METAOBJECT_HANDLE_FROM_ENV;

  if (!metaobjectHandle) {
    console.error('Error: Metaobject handle is not defined.');
    return [];
  }

  console.log(`Workspaceing LP slides data for metaobject handle: ${metaobjectHandle}`);

  // スクリーンショットから判明したメタオブジェクトの「タイプ」を指定
  const METAOBJECT_TYPE_NAME = "lp_swipe_content";

  const metaobjectQuery = `
    query GetMetaobject($handle: MetaobjectHandleInput!) {
      metaobject(handle: $handle) {
        id
        handle
        # フィールドキーをスクリーンショットに合わせて "products_list" に変更
        products_list: field(key: "products_list") {
          references(first: 20) { # 表示したい最大商品数を指定
            nodes {
              ... on Product {
                id     # 商品のグローバルID (例: gid://shopify/Product/12345)
                handle # 商品ハンドル
              }
            }
          }
        }
      }
    }
  `;

  try {
    const metaobjectResponse = await shopifyFetch<{ metaobject: Metaobject | null }>({
      query: metaobjectQuery,
      variables: {
        handle: {
          handle: metaobjectHandle,
          type: METAOBJECT_TYPE_NAME,
        },
      },
    });

    if (!metaobjectResponse.data?.metaobject) {
      console.warn(`Metaobject with handle "${metaobjectHandle}" (type: "${METAOBJECT_TYPE_NAME}") not found.`);
      return [];
    }
    
    console.log('Metaobject data fetched:', { // より詳細なログ
        id: metaobjectResponse.data.metaobject.id,
        handle: metaobjectResponse.data.metaobject.handle,
        productsListFieldPresent: !!metaobjectResponse.data.metaobject.products_list,
        referencesPresent: !!metaobjectResponse.data.metaobject.products_list?.references,
        referenceNodesPresent: !!metaobjectResponse.data.metaobject.products_list?.references?.nodes,
        referenceCount: metaobjectResponse.data.metaobject.products_list?.references?.nodes?.length || 0
    });

    const productReferences = metaobjectResponse.data.metaobject.products_list?.references?.nodes;

    if (!productReferences || productReferences.length === 0) {
      console.warn('No product references found in metaobject "products_list" field.');
      return [];
    }

    const productGids = productReferences.map(node => node.id).filter(id => !!id);

    if (productGids.length === 0) {
      console.warn('No valid product GIDs found in metaobject references.');
      return [];
    }

    console.log(`Workspaceing details for ${productGids.length} products using GIDs:`, productGids);

    const productsQuery = `
      query GetProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            handle
            title
            onlineStoreUrl
            images(first: 10) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    `;

    const productsResponse = await shopifyFetch<{ nodes: (Product | null)[] }>({
      query: productsQuery,
      variables: { ids: productGids },
    });

    if (!productsResponse.data?.nodes) {
      console.warn('No product data returned from Shopify API when fetching by GIDs.');
      return [];
    }

    const lpSlides: LPSlideProduct[] = productsResponse.data.nodes
      .filter((product): product is Product => product !== null)
      .map((product) => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        images: product.images.edges.map(edge => ({
          url: edge.node.url,
          altText: edge.node.altText || undefined,
        })),
        price: `¥${parseFloat(product.priceRange.minVariantPrice.amount).toLocaleString()}`,
        productPageUrl: product.onlineStoreUrl,
      }));
      
    console.log(`Successfully processed ${lpSlides.length} products for LP.`);
    return lpSlides;

  } catch (error) {
    console.error('Error in fetchLPSlidesData:', error);
    throw error;
  }
};