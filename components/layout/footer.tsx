import Link from "next/link";
import { GitHubIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  product: [
    { label: "Browse Events", href: "/events" },
    { label: "Create Event", href: "/sign-up" },
    { label: "AI Assistant", href: "/sign-up" },
    { label: "Pricing", href: "#" },
  ],
  resources: [
    { label: "Documentation", href: "https://github.com/Nishitbaria/openluma" },
    { label: "API Reference", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Contributing", href: "https://github.com/Nishitbaria/openluma" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const sections = [
  { title: "Product", links: footerLinks.product },
  { title: "Resources", links: footerLinks.resources },
  { title: "Legal", links: footerLinks.legal },
];

export function Footer() {
  return (
    <footer className="w-full bg-background" role="contentinfo">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Separator role="presentation" aria-hidden="true" />

        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-20">
          {/* Brand column */}
          <div className="flex flex-col gap-6 sm:col-span-2 lg:col-span-4">
            <Link href="/" aria-label="Go to home page">
              <Logo className="h-4" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Open-source event management platform with AI-powered tools.
              Create, manage, and discover events without vendor lock-in.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/Nishitbaria/openluma"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="GitHub"
              >
                <GitHubIcon className="size-4" />
              </a>
            </div>
          </div>

          {/* Navigation columns */}
          <nav
            className="col-span-1 grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-3 lg:col-span-8 lg:gap-12"
            aria-label="Footer navigation"
          >
            {sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Separator role="presentation" aria-hidden="true" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} OpenLuma. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js, Vercel AI SDK & shadcn/ui. Licensed under MIT.
          </p>
        </div>
      </div>
    </footer>
  );
}
