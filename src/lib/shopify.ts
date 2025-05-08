// 環境変数の取得とデフォルト値設定
const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  ? process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '')
  : '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
// 環境変数で指定されたAPIバージョンを使うように修正 (デフォルトは最新安定版を確認して設定推奨)
const SHOPIFY_API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2025-04';
const LP_METAOBJECT_HANDLE_FROM_ENV = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';

// 型定義 (より正確に)
interface ShopifyError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: {
    code?: string;
    [key: string]: unknown;
   };
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
  id: string;
  handle: string;
}

interface MetaobjectSlidesField {
  references?: {
    nodes: MetaobjectSlideReferenceNode[];
  };
}

interface Metaobject {
  id: string;
  handle: string;
  products_list: MetaobjectSlidesField | null; // フィールドキーを実際の 'products_list' に変更
}

export interface LPSlideProduct {
  id: string;
  handle: string;
  title: string;
  images: Array<{ url: string; altText: string | null }>; // altTextを null 許容に
  price: string;
  productPageUrl: string | null;
}

/**
 * Fetches data from Shopify Storefront API using GraphQL
 */
const shopifyFetch = async <T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, any>;
}): Promise<ShopifyFetchResponse<T>> => {
  const missingVars = [];
  if (!SHOPIFY_STORE_DOMAIN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
  if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN');
  if (!SHOPIFY_API_VERSION) missingVars.push('NEXT_PUBLIC_SHOPIFY_API_VERSION');

  if (missingVars.length > 0) {
    console.error(`Shopify API Error: Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Shopify API configuration error: Missing environment variables.`);
  }

  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  console.log('Shopify API Request:', { // ログは少し調整
    endpoint,
    queryName: query.match(/query (\w+)/)?.[1] || 'Unnamed Query', // クエリ名を取得
    hasVariables: !!Object.keys(variables).length,
    hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  });
  // デバッグ用に変数の内容も確認（トークンなどはマスク推奨）
  // console.log('Variables:', JSON.stringify(variables));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      // タイムアウト設定なども考慮に入れるとより堅牢に
      // signal: AbortSignal.timeout(15000) // 例: 15秒でタイムアウト
    });

    const result = await response.json();

    if (!response.ok || result.errors) {
      console.error('Shopify API Error:', {
        status: response.status,
        statusText: response.statusText,
        errors: result.errors || `HTTP error (URL: ${endpoint})`, // エラーがない場合も情報追加
      });
      const errorMessages = result.errors ? result.errors.map((e: ShopifyError) => `${e.message} (code: ${e.extensions?.code})`).join(', ') : `HTTP error ${response.status}`;
      throw new Error(`Shopify API request failed: ${errorMessages}`);
    }
    // データがない場合も警告としてログ出力
    if (!result.data) {
        console.warn('Shopify API Warning: Request successful but no data returned.', { endpoint });
    }

    return result;
  } catch (error) {
    console.error(`Error in shopifyFetch calling ${endpoint}:`, error instanceof Error ? error.message : error);
    throw error; // エラーを再スロー
  }
};

/**
 * Fetches product data for the LP from Shopify metaobject and products
 */
export const getWorkspaceLPSlidesData = async (
  metaobjectHandleParam?: string
): Promise<LPSlideProduct[]> => {
  const metaobjectHandle = metaobjectHandleParam || LP_METAOBJECT_HANDLE_FROM_ENV;

  if (!metaobjectHandle) {
    console.error('Error: Metaobject handle is not defined.');
    return []; // メタオブジェクトが見つからない場合は空配列を返す
  }

  console.log(`Fetching LP slides data for metaobject handle: ${metaobjectHandle}`);

  // メタオブジェクトのタイプ名（Shopify Adminで確認した値）
  const METAOBJECT_TYPE_NAME = "lp_swipe_content"; // これは正しく設定されている前提

  try {
    // --- 1. メタオブジェクト取得 ---
    const metaobjectQuery = `
      query GetMetaobject($handle: MetaobjectHandleInput!) { # 変数 $handle の型を MetaobjectHandleInput! に
        metaobject(handle: $handle) {
          id
          handle
          # フィールドキーを 'products_list' に修正
          products_list: field(key: "products_list") {
            references(first: 20) { # 取得する商品数を調整可能
              nodes {
                ... on Product {
                  id     # 商品ID (gid) を取得
                  handle # ハンドルも念のため取得
                }
              }
            }
          }
        }
      }
    `;

    const metaobjectResponse = await shopifyFetch<{
      metaobject: {
        id: string;
        handle: string;
        products_list?: {
          references?: {
            nodes: Array<{
              id: string;
              handle: string;
            }>;
          };
        };
      };
    }>({
      query: metaobjectQuery,
      variables: {
        handle: { // MetaobjectHandleInput オブジェクト形式で渡す
          handle: metaobjectHandle,
          type: METAOBJECT_TYPE_NAME
        }
      }
    });
    
    if (!metaobjectResponse.data?.metaobject) {
      console.warn(`Metaobject with handle "${metaobjectHandle}" not found`);
      return [];
    }
    
    const productReferences = metaobjectResponse.data.metaobject.products_list?.references?.nodes;
    
    if (!productReferences || productReferences.length === 0) {
      console.warn('No product references found in metaobject "products_list" field');
      return [];
    }
    
    const productGids = productReferences.map(node => node.id);
    
    if (productGids.length === 0) {
      console.warn('No product GIDs found in metaobject');
      return [];
    }
    
    console.log(`Found ${productGids.length} product GIDs in metaobject`);
    
    // --- 2. 商品詳細情報の一括取得 ---
    const productsQuery = `
      query GetProductsByIds($ids: [ID!]!) { # 変数名を $ids に、型を [ID!]! に修正
        nodes(ids: $ids) {             # 引数 ids に変数 $ids を使用
          ... on Product {
            id
            handle
            title
            onlineStoreUrl
            images(first: 10) { # 表示に必要な画像数を指定
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
    
    const productsResponse = await shopifyFetch<{
      nodes: Array<{
        id: string;
        handle: string;
        title: string;
        images: {
          edges: Array<{
            node: {
              url: string;
              altText: string | null;
            };
          }>;
        };
        priceRange: {
          minVariantPrice: {
            amount: string;
            currencyCode: string;
          };
        };
        onlineStoreUrl: string | null;
      }>;
    }>({
      query: productsQuery,
      variables: { ids: productGids } // キー名を 'ids' に修正
    });
    
    if (!productsResponse.data?.nodes || productsResponse.data.nodes.length === 0) {
      console.warn('No products found with the provided GIDs');
      return [];
    }
    
    // --- 3. データ整形 ---
    const lpSlides: LPSlideProduct[] = productsResponse.data.nodes
      .filter((product): product is any => product !== null) // nullを除外
      .map((product) => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        images: product.images.edges.map((imgEdge: ProductImageEdge) => ({
          url: imgEdge.node.url,
          altText: imgEdge.node.altText || null // null を許容するように修正
        })),
        // 価格を整形（通貨記号とロケールに合わせたフォーマット）
        // 注意: Intl.NumberFormat はサーバーサイドでのみ利用可能。クライアントサイドで使う場合は別途考慮が必要。
        price: product.priceRange?.minVariantPrice 
          ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: product.priceRange.minVariantPrice.currencyCode }).format(parseFloat(product.priceRange.minVariantPrice.amount))
          : "価格情報なし", // priceRangeまたはminVariantPriceがない場合のデフォルト表示
        productPageUrl: product.onlineStoreUrl || null // null を許容するように修正
      }));
    
    console.log(`Successfully processed ${lpSlides.length} products for LP.`);
    return lpSlides;
    
  } catch (error) {
    console.error('Error in getWorkspaceLPSlidesData:', error instanceof Error ? error.message : error);
    return [];
  }
};
