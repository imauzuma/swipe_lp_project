import React from 'react';
import { GetStaticProps, NextPage } from 'next';
import Head from 'next/head';

interface HomeProps {
  message: string;
}

const Home: NextPage<HomeProps> = ({ message }) => {
  return (
    <>
      <Head>
        <title>商品スワイプ LP - テスト</title>
        <meta name="description" content="スマートフォン向け商品スワイプ LP" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="h-screen w-screen flex flex-col items-center justify-center p-5 text-center">
        <h1 className="text-2xl font-bold mb-4">テストページ</h1>
        <p className="mb-8">{message}</p>
        <p className="text-sm text-gray-500">このページはルーティングテスト用の簡易ページです</p>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  console.log('Simple test page getStaticProps is running');
  
  return {
    props: {
      message: 'Hello World! This is a simple test page to verify routing.'
    }
  };
};

export default Home;
