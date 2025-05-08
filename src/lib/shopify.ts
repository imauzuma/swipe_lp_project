const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  ? process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '')
  : '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2025-04';
const LP_METAOBJECT_HANDLE_FROM_ENV = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';

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
        errors: result.errors || `HTTP error (URL: ${endpoint})`, // エラーがない場合も情報追加
      });
      const errorMessages = result.errors ? result.errors.map((e: ShopifyError) => `${e.message} (code: ${e.extensions?.code})`).join(', ') : `HTTP error ${response.status}`;
      throw new Error(`Shopify API request failed: ${errorMessages}`);
    }
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
export const fetchLPSlidesData = async ( // 関数名をfetchLPSlidesDataに変更 (getWorkspaceLPSlidesDataではない前提)
  metaobjectHandleParam?: string
): Promise<LPSlideProduct[]> => {
  const metaobjectHandle = metaobjectHandleParam || LP_METAOBJECT_HANDLE_FROM_ENV;

  if (!metaobjectHandle) {
    console.error('Error: Metaobject handle is not defined.');
    throw new Error('Metaobject handle is missing.');
  }

  console.log(`Workspaceing LP slides data for metaobject handle: ${metaobjectHandle}`);

  const METAOBJECT_TYPE_NAME = "lp_swipe_content"; // これは正しく設定されている前提

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

  let productGids: string[] = [];

  try {
    console.log('Requesting Metaobject...');
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
      return []; // メタオブジェクトが見つからない場合は空配列を返す
    }

    const productReferences = metaobjectResponse.data.metaobject.products_list?.references?.nodes;

    if (!productReferences || productReferences.length === 0) {
      console.warn('No product references found in metaobject "products_list" field.');
      return []; // 商品参照がない場合は空配列を返す
    }

    productGids = productReferences.map(node => node.id).filter((id): id is string => !!id);

    if (productGids.length === 0) {
      console.warn('No valid product GIDs found in metaobject references.');
      return []; // 有効なIDがない場合は空配列を返す
    }

    console.log(`Found ${productGids.length} product GIDs in metaobject:`, productGids);

  } catch (error) {
    console.error('Error fetching metaobject data:', error instanceof Error ? error.message : error);
    throw new Error('Failed to fetch metaobject data from Shopify.');
  }


  console.log(`Workspaceing details for ${productGids.length} products using GIDs.`);

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

  try {
    const productsResponse = await shopifyFetch<{ nodes: (Product | null)[] }>({
      query: productsQuery,
      variables: { ids: productGids }, // ★★★ キー名を 'ids' に修正 ★★★
    });

    if (!productsResponse.data?.nodes) {
      console.warn('No product data nodes returned from Shopify API when fetching by GIDs.');
      return []; // 商品データが返ってこない場合は空配列
    }

    const lpSlides: LPSlideProduct[] = productsResponse.data.nodes
      .filter((product): product is Product => product !== null) // nullを除外
      .map((product) => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        images: product.images.edges.map(edge => ({
          url: edge.node.url,
          altText: edge.node.altText ?? null, // null合体演算子でnullならnull、そうでなければ値
        })),
        price: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: product.priceRange.minVariantPrice.currencyCode }).format(parseFloat(product.priceRange.minVariantPrice.amount)),
        productPageUrl: product.onlineStoreUrl,
      }));

    console.log(`Successfully processed ${lpSlides.length} products for LP.`);
    return lpSlides;

  } catch (error) {
    console.error('Error fetching or processing product details:', error instanceof Error ? error.message : error);
    throw new Error('Failed to fetch or process product details from Shopify.');
  }
};
