import type { Metadata } from 'next';

// Use production URL as default, fallback to localhost for dev
const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://sceneforge-hackathon.onrender.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'SceneForge AI - ElevenLabs × turbopuffer Hackathon',
  description: 'AI-powered game scene generator. Type a description, get a playable Three.js game with AI-generated audio and visuals.',
  keywords: ['AI', 'game', 'generator', 'ElevenLabs', 'turbopuffer', 'Three.js', 'hackathon'],
  authors: [{ name: 'SceneForge AI' }],
  openGraph: {
    title: 'SceneForge AI - ElevenLabs × turbopuffer Hackathon',
    description: 'AI-powered game scene generator. Type a description, get a playable Three.js game with AI-generated audio and visuals.',
    type: 'website',
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'SceneForge AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SceneForge AI - ElevenLabs × turbopuffer Hackathon',
    description: 'AI-powered game scene generator. Type a description, get a playable Three.js game with AI-generated audio and visuals.',
    images: [`${BASE_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
