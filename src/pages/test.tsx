import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';

const TestPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>テストページ</title>
        <meta name="description" content="シンプルなテストページ" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main className="h-screen w-screen flex flex-col items-center justify-center p-5 text-center">
        <h1 className="text-2xl font-bold mb-4">テストページ</h1>
        <p className="mb-8">このページはVercelデプロイのテスト用です。</p>
        
        <div className="mb-4 p-4 bg-gray-100 text-left text-xs overflow-auto max-w-full">
          <h2 className="font-bold mb-2">環境変数チェック:</h2>
          <pre>
            {JSON.stringify({
              NODE_ENV: process.env.NODE_ENV,
              hasShopifyDomain: !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
              hasShopifyToken: !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
              hasShopifyApiVersion: !!process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION,
              hasMetaobjectHandle: !!process.env.NEXT_PUBLIC_LP_METAOBJECT_HANDLE
            }, null, 2)}
          </pre>
        </div>
        
        <a 
          href="/"
          className="bg-black text-white px-6 py-3 rounded-full"
        >
          メインページへ
        </a>
      </main>
    </>
  );
};

export default TestPage;
