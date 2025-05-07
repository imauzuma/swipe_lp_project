const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_API_VERSION = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2023-01';

const shopifyFetch = async <T>({
  query,
  variables = {}
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<{ data: T }> => {
  try {
    if (!SHOPIFY_STORE_DOMAIN) {
      throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
    }
    if (!SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
      throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable is not set');
    }
    
    const cleanDomain = SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '');
    const endpoint = `https://${cleanDomain}/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    console.log('Shopify API Request:', {
      endpoint,
      variables,
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
      console.error('Shopify API error response:', {
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
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
    
    console.log('Shopify API Response Structure:', {
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : []
    });
    
    if (!result.data) {
      console.error('No data returned from Shopify API');
      throw new Error('No data returned from Shopify API');
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching from Shopify:', error);
    throw error;
  }
};

export const getWorkspaceLPSlidesData = async (metaobjectHandle: string) => {
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
    return [];
  }
  
  const productHandles = slidesField.references.edges.map(edge => edge.node.handle);
  
  if (productHandles.length === 0) {
    return [];
  }
  
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
  
  console.log('Product handles to query:', productHandles);
  
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
  
  return productsResponse.data.products.edges.map((edge) => {
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
};
