import React from 'react';
import { NextPage } from 'next';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-5 text-center">
      <h1 className="text-2xl font-bold mb-4">
        {statusCode
          ? `エラーが発生しました: ${statusCode}`
          : 'クライアントエラーが発生しました'}
      </h1>
      <p className="mb-8">申し訳ありませんが、問題が発生しました。</p>
      <button 
        onClick={() => window.location.reload()} 
        className="bg-black text-white px-6 py-3 rounded-full"
      >
        再読み込み
      </button>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
