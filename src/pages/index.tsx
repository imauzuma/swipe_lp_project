import React from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { getWorkspaceLPSlidesData } from '../lib/shopify';
import VerticalSwipeContainer from '../components/VerticalSwipeContainer';
import { ShopifyProduct } from '../types/shopify';

interface HomeProps {
  products: ShopifyProduct[];
}

const Home: NextPage<HomeProps> = ({ products }) => {
  return (
    <>
      <Head>
        <title>商品スワイプ LP</title>
        <meta name="description" content="スマートフォン向け商品スワイプ LP" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        <VerticalSwipeContainer products={products} />
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const metaobjectHandle = process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE || '';
    
    if (!metaobjectHandle) {
      console.error('Metaobject handle not provided in environment variables');
      return {
        props: {
          products: [],
          metaobjectHandle: ''
        }
      };
    }
    
    const products = await getWorkspaceLPSlidesData(metaobjectHandle);
    
    return {
      props: {
        products,
        metaobjectHandle
      }
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      props: {
        products: [],
        metaobjectHandle: ''
      }
    };
  }
};

export default Home;
