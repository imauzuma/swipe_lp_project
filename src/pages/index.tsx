import React from 'react';
import { GetStaticProps, NextPage } from 'next';
import Head from 'next/head';
import { getWorkspaceLPSlidesData } from '../lib/shopify';
import VerticalSwipeContainer from '../components/VerticalSwipeContainer';
import { ShopifyProduct } from '../types/shopify';

interface HomeProps {
  products: ShopifyProduct[];
  metaobjectHandle?: string;
  error?: string | null;
}

const Home: NextPage<HomeProps> = ({ products, error }) => {
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
  try {
    console.log('Environment variables available:', {
      hasStoreDomain: !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
      hasAccessToken: !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      hasApiVersion: !!process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION,
      hasMetaobjectHandle: !!process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE
    });
    
    const metaobjectHandle = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';
    
    if (!metaobjectHandle) {
      console.error('Metaobject handle not provided in environment variables');
      return {
        props: {
          products: [],
          metaobjectHandle: '',
          error: 'Metaobject handle not provided in environment variables'
        },
        revalidate: 60 // Revalidate every 60 seconds
      };
    }
    
    console.log('Fetching products for metaobject handle:', metaobjectHandle);
    const products = await getWorkspaceLPSlidesData(metaobjectHandle);
    console.log(`Successfully fetched ${products.length} products`);
    
    return {
      props: {
        products,
        metaobjectHandle,
        error: null
      },
      revalidate: 60 // Revalidate every 60 seconds
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while fetching products';
    return {
      props: {
        products: [],
        metaobjectHandle: '',
        error: errorMessage
      },
      revalidate: 60 // Revalidate every 60 seconds
    };
  }
};

export default Home;
