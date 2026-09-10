import Link from 'next/link';
export default function PreviewPage() {
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <div className="card !p-10">
        <p className="text-4xl" aria-hidden>👀</p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight">Preview</h1>
        <p className="page-sub">The final review appears in the last step of registration.</p>
        <Link href="/register" className="btn-primary mt-6 w-full">Go to registration →</Link>
      </div>
    </div>
  );
}
