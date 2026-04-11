export const metadata = {
  title: 'SceneForge AI - ElevenLabs Hackathon',
  description: 'AI-powered game scene generator',
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