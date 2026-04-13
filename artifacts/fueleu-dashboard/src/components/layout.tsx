import { Link, useLocation } from "wouter";
import { Ship, Route, BarChart3, PiggyBank, Users, Activity, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Routes", href: "/routes", icon: Route },
  { name: "Compare", href: "/compare", icon: BarChart3 },
  { name: "Banking", href: "/banking", icon: PiggyBank },
  { name: "Pooling", href: "/pooling", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavItems = () => (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 h-5 w-5 ${
                isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
              }`}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Ship className="h-8 w-8 text-accent" />
              <span className="ml-2 text-xl font-bold tracking-tight text-sidebar-foreground">
                FuelEU<span className="text-accent font-light">Tracker</span>
              </span>
            </div>
            <NavItems />
          </div>
          <div className="p-4 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-foreground/60">Target GHG Intensity</div>
            <div className="text-lg font-mono font-bold text-accent">89.3368 <span className="text-xs font-sans">gCO2e/MJ</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center">
            <Ship className="h-6 w-6 text-primary" />
            <span className="ml-2 text-lg font-bold text-foreground">FuelEU Tracker</span>
          </div>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-sidebar-border">
              <div className="pt-5">
                <div className="flex items-center px-4 mb-4">
                  <Ship className="h-8 w-8 text-accent" />
                  <span className="ml-2 text-xl font-bold text-sidebar-foreground">FuelEU Tracker</span>
                </div>
                <NavItems />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
