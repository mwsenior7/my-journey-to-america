import Link from "next/link";

const links = [
  { label: "Home", href: "/" },
  { label: "Browse Stories", href: "/browse" },
  { label: "Share Your Story", href: "/share" },
  { label: "Community Hubs", href: "/hubs" },
  { label: "About", href: "/about" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#1B2A4A", color: "#FAF7F2" }} className="mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p style={{ color: "#C9A84C" }} className="font-bold text-lg">
            My Journey to America
          </p>
          <p className="text-sm italic mt-1" style={{ color: "#FAF7F2", opacity: 0.7 }}>
            The Ellis Island of the Digital Age
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm justify-center">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: "#FAF7F2", opacity: 0.8 }}
              className="hover:opacity-100 transition-opacity"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs" style={{ color: "#FAF7F2", opacity: 0.5 }}>
          &copy; {new Date().getFullYear()} My Journey to America
        </p>
      </div>
    </footer>
  );
}
