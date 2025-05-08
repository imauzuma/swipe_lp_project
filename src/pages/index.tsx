import React from 'react';
import { GetStaticProps, NextPage } from 'next';
import Head from 'next/head';
import VerticalSwipeContainer from '../components/VerticalSwipeContainer';
import { ShopifyProduct } from '../types/shopify';
import { fetchLPSlidesData } from '../lib/shopify';

interface DebugInfo {
  timestamp: string;
  environment?: string;
  missingEnvVars?: string[];
  hasEnvVars?: Record<string, boolean>;
  metaobjectHandle?: string;
  errorType?: string;
}

interface HomeProps {
  products: ShopifyProduct[];
  metaobjectHandle?: string;
  error?: string | null;
  debugInfo?: DebugInfo | null;
}

const Home: NextPage<HomeProps> = ({ products, error, debugInfo }) => {
  return (
    <>
      <Head>
        <title>商品スワイプ LP</title>
        <meta name="description" content="スマートフォン向け商品スワイプ LP" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        {error ? (
          <div className="h-screen w-screen flex flex-col items-center justify-center p-5 text-center">
            <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
            <p className="mb-8 text-red-600">{error}</p>
            {debugInfo && (
              <div className="mb-4 p-4 bg-gray-100 text-left text-xs overflow-auto max-w-full">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="bg-black text-white px-6 py-3 rounded-full"
            >
              再読み込み
            </button>
          </div>
        ) : (
          <VerticalSwipeContainer products={products} />
        )}
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  console.log('getStaticProps started - index.tsx');
  
  try {
    console.log('Inside try block of getStaticProps');
    
    const metaobjectHandle = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';
    
    const missingVars = [];
    if (!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
    if (!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) missingVars.push('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN');
    if (!process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION) missingVars.push('NEXT_PUBLIC_SHOPIFY_API_VERSION');
    if (!metaobjectHandle) missingVars.push('NEXT_PUBLIC_LP_METAOBJECT_HANDLE');
    
    if (missingVars.length > 0) {
      console.warn(`Missing environment variables: ${missingVars.join(', ')}. Using dummy data.`);
      
      const dummyProducts: ShopifyProduct[] = [
        {
          id: 'dummy-id-1',
          handle: 'dummy-product-1',
          title: 'テスト商品 1',
          images: [
            { url: 'https://cdn.shopify.com/s/files/1/0000/0000/products/placeholder.png', altText: 'テスト画像 1' },
            { url: 'https://cdn.shopify.com/s/files/1/0000/0000/products/placeholder.png', altText: 'テスト画像 2' }
          ],
          priceRange: {
            minVariantPrice: {
              amount: '1000',
              currencyCode: 'JPY'
            }
          },
          onlineStoreUrl: 'https://example.com/product-1'
        },
        {
          id: 'dummy-id-2',
          handle: 'dummy-product-2',
          title: 'テスト商品 2',
          images: [
            { url: 'https://cdn.shopify.com/s/files/1/0000/0000/products/placeholder.png', altText: 'テスト画像 1' },
            { url: 'https://cdn.shopify.com/s/files/1/0000/0000/products/placeholder.png', altText: 'テスト画像 2' }
          ],
          priceRange: {
            minVariantPrice: {
              amount: '2000',
              currencyCode: 'JPY'
            }
          },
          onlineStoreUrl: 'https://example.com/product-2'
        }
      ];
      
      console.log('Returning dummy products:', dummyProducts.length);
      
      return {
        props: {
          products: dummyProducts,
          metaobjectHandle: 'dummy-handle',
          error: null,
          debugInfo: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            missingEnvVars: missingVars,
            hasEnvVars: {
              NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
              NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
              NEXT_PUBLIC_SHOPIFY_API_VERSION: !!process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION,
              NEXT_PUBLIC_LP_METAOBJECT_HANDLE: !!metaobjectHandle
            }
          }
        },
        revalidate: 60 // Revalidate every 60 seconds
      };
    }
    
    console.log('Fetching products from Shopify API with metaobject handle:', metaobjectHandle);
    const products = await fetchLPSlidesData(metaobjectHandle);
    
    if (!products || products.length === 0) {
      console.warn('No products returned from Shopify API');
      return {
        props: {
          products: [],
          metaobjectHandle,
          error: 'No products found. Please check your Shopify store and metaobject configuration.',
          debugInfo: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            metaobjectHandle
          }
        },
        revalidate: 60 // Revalidate every 60 seconds
      };
    }
    
    console.log(`Successfully fetched ${products.length} products from Shopify API`);
    
    return {
      props: {
        products,
        metaobjectHandle,
        error: null,
        debugInfo: null
      },
      revalidate: 60 // Revalidate every 60 seconds
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      props: {
        products: [],
        metaobjectHandle: '',
        error: `Error fetching products: ${errorMessage}`,
        debugInfo: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : typeof error,
          environment: process.env.NODE_ENV
        }
      },
      revalidate: 60 // Revalidate every 60 seconds
    };
  }
}

export default Home;
