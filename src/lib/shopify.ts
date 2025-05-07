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
    const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }
    
    const result = await response.json();
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
    query GetProducts($handles: [String!]!) {
      nodes(ids: $handles) {
        ... on Product {
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
      onlineStoreUrl: string;
    }>;
  }>({
    query: productsQuery,
    variables: { handles: productHandles.map(handle => `gid://shopify/Product/${handle}`) }
  });
  
  return productsResponse.data.nodes.map(product => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    images: product.images.edges.map(edge => ({
      url: edge.node.url,
      altText: edge.node.altText || undefined
    })),
    priceRange: {
      minVariantPrice: {
        amount: product.priceRange.minVariantPrice.amount,
        currencyCode: product.priceRange.minVariantPrice.currencyCode
      }
    },
    onlineStoreUrl: product.onlineStoreUrl
  }));
};
