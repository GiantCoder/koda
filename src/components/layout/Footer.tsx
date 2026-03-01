import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-4 py-10 text-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-4">
        <div>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="inline-block h-5 w-5 rounded-sm bg-red-600" />
            <span>Koda Cricket</span>
          </div>
          <p className="text-neutral-500">Better coaching through data and safe collaboration.</p>
        </div>
        <div>
          <p className="mb-2 font-medium">Product</p>
          <div className="space-y-1">
            <Link href="/upload">Upload</Link>
          </div>
        </div>
        <div>
          <p className="mb-2 font-medium">Company</p>
          <div className="space-y-1">
            <Link href="/">About</Link>
          </div>
        </div>
        <div>
          <p className="mb-2 font-medium">Legal</p>
          <div className="space-y-1">
            <Link href="/">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
