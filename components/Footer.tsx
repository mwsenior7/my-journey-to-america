import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy text-cream mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-gold font-bold text-lg">My Journey to America</p>
          <p className="text-sm text-cream/70 italic mt-1">
            The Ellis Island of the Digital Age
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm text-cream/80 justify-center">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <Link href="/browse" className="hover:text-gold transition-colors">Browse Stories</Link>
          <Link href="/share" className="hover:text-gold transition-colors">Share Your Story</Link>
          <Link href="/hubs" className="hover:text-gold transition-colors">Community Hubs</Link>
          <Link href="/about" className="hover:text-gold transition-colors">About</Link>
        </nav>

        <p className="text-xs text-cream/50">
          &copy; {new Date().getFullYear()} My Journey to America
        </p>
      </div>
    </footer>
  );
}
