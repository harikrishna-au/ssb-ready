"use client";

import "./globals.css";

/** Last resort: the root layout itself failed, so this replaces it and must bring its own html and body. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  console.error(error);
  return (
    <html lang="en" className="dark h-full">
      <body className="grid min-h-full place-items-center px-4">
        <div role="alert" className="max-w-md">
          <h1 className="text-3xl font-black uppercase leading-none">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">ReadyKadet could not load. Try again in a moment.</p>
          <button onClick={retry} className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-primary-foreground">Try again</button>
        </div>
      </body>
    </html>
  );
}
