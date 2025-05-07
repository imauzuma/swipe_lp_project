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
 */
export const getWorkspaceLPSlidesData = async (metaobjectHandle: string) => {
  try {
    console.log('Fetching metaobject data for handle:', metaobjectHandle);
    
    if (!metaobjectHandle) {
      console.error('No metaobject handle provided');
      return [];
    }
    
    const metaobjectQuery = `
      query GetMetaobject($handle: String!) {
        metaobject(handle: $handle) {
          handle
          fields {
            key
            value
            references(first: 20) {
              edges {
                node {
                  ... on Product {
                    handle
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const metaobjectResponse = await shopifyFetch<{
      metaobject: {
        handle: string;
        fields: Array<{
          key: string;
          value: string;
          references?: {
            edges: Array<{
              node: {
                handle: string;
              };
            }>;
          };
        }>;
      };
    }>({
      query: metaobjectQuery,
      variables: { handle: metaobjectHandle }
    });
    
    const slidesField = metaobjectResponse.data.metaobject.fields.find(field => field.key === 'slides');
    if (!slidesField || !slidesField.references) {
      console.warn('No slides field or references found in metaobject');
      return [];
    }
    
    const productHandles = slidesField.references.edges.map(edge => edge.node.handle);
    
    if (productHandles.length === 0) {
      console.warn('No product handles found in metaobject');
      return [];
    }
    
    console.log(`Found ${productHandles.length} product handles in metaobject`);
    
    const productsQuery = `
      query GetProducts($handles: String!) {
        products(first: 20, query: $handles) {
          edges {
            node {
              id
              handle
              title
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
              onlineStoreUrl
            }
          }
        }
      }
    `;
    
    const queryString = productHandles.map(handle => `handle:${handle}`).join(" OR ");
    console.log('Query string for products:', queryString);
    
    const productsResponse = await shopifyFetch<{
      products: {
        edges: Array<{
          node: {
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
            onlineStoreUrl: string;
          };
        }>;
      };
    }>({
      query: productsQuery,
      variables: { handles: queryString }
    });
    
    const products = productsResponse.data.products.edges.map((edge) => {
      const product = edge.node;
      return {
        id: product.id,
        handle: product.handle,
        title: product.title,
        images: product.images.edges.map((imgEdge: { node: { url: string; altText: string | null } }) => ({
          url: imgEdge.node.url,
          altText: imgEdge.node.altText || undefined
        })),
        priceRange: {
          minVariantPrice: {
            amount: product.priceRange.minVariantPrice.amount,
            currencyCode: product.priceRange.minVariantPrice.currencyCode
          }
        },
        onlineStoreUrl: product.onlineStoreUrl
      };
    });
    
    console.log(`Successfully fetched ${products.length} products`);
    return products;
    
  } catch (error) {
    console.error('Error in getWorkspaceLPSlidesData:', error);
    return [];
  }
};
