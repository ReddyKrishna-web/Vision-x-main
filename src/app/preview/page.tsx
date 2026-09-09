import Link from 'next/link';
export default function PreviewPage() {
  return (
    <div className="pt-8 text-center">
      <h1 className="page-title">Preview</h1>
      <p className="page-sub">The final review appears in the last step of registration.</p>
      <Link href="/register" className="btn-primary mt-5">Go to registration</Link>
    </div>
  );
}
