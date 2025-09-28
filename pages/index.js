import React from 'react'
import Head from 'next/head'
import FaceScanner from '../components/FaceScanner'

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Face Scanner App</title>
        <meta name="description" content="AI-powered face detection and analysis app using React, Next.js, and Face-API.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <h1 className="main-title">🤖 AI Face Scanner</h1>
        <FaceScanner />
      </div>
    </>
  )
}