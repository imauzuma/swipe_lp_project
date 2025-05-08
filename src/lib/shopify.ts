const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN 
  ? process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '')
  : '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2023-07'; // Updated to a more recent version
const LP_METAOBJECT_HANDLE = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';

/**
 * Fetches data from Shopify Storefront API using GraphQL
 */
const shopifyFetch = async <T>({
  query,
  variables = {}
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<{ data: T }> => {
  try {
    const missingVars = [];
    if (!SHOPIFY_STORE_DOMAIN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN');
    if (!SHOPIFY_API_VERSION) missingVars.push('NEXT_PUBLIC_SHOPIFY_API_VERSION');
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    console.log('Shopify API Request:', {
      endpoint,
      hasVariables: !!Object.keys(variables).length,
      hasToken: !!SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      apiVersion: SHOPIFY_API_VERSION
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500), // Truncate long responses
        endpoint
      });
      throw new Error(`Shopify API error: ${response.statusText} (${response.status})`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('Shopify GraphQL errors:', JSON.stringify(result.errors, null, 2));
      throw new Error(`GraphQL errors: ${result.errors.map((e: {message: string}) => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      console.error('No data returned from Shopify API');
      throw new Error('No data returned from Shopify API');
    }
    
    console.log('Shopify API Response:', {
      hasData: !!result.data,
      dataKeys: Object.keys(result.data)
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching from Shopify:', error);
    throw error;
  }
};

/**
 * Fetches product data for the LP from Shopify metaobject and products
 * @param metaobjectHandle - Handle of the metaobject to fetch. Defaults to LP_METAOBJECT_HANDLE from env.
 */
export const fetchLPSlidesData = async (metaobjectHandle: string = LP_METAOBJECT_HANDLE) => {
  try {
    console.log('Fetching metaobject data for handle:', metaobjectHandle);
    
    if (!metaobjectHandle) {
      console.error('No metaobject handle provided');
      return [];
    }
    
    const METAOBJECT_TYPE_NAME = "lp_swipe_content";
    
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
    
    if (!metaobjectResponse.data.metaobject) {
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
    
    if (!productsResponse.data.nodes || productsResponse.data.nodes.length === 0) {
      console.warn('No products found with the provided GIDs');
      return [];
    }
    
    const products = productsResponse.data.nodes.map((product) => {
      return {
        id: product.id,
        handle: product.handle,
        title: product.title,
        images: product.images.edges.map((imgEdge) => ({
          url: imgEdge.node.url,
          altText: imgEdge.node.altText || null // null を許容するように修正
        })),
        priceRange: {
          minVariantPrice: {
            amount: product.priceRange.minVariantPrice.amount,
            currencyCode: product.priceRange.minVariantPrice.currencyCode
          }
        },
        onlineStoreUrl: product.onlineStoreUrl || null // null を許容するように修正
      };
    });
    
    console.log(`Successfully fetched ${products.length} products`);
    return products;
    
  } catch (error) {
    console.error('Error in fetchLPSlidesData:', error);
    return [];
  }
};
