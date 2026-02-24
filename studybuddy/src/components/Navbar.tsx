"use client";

import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Multiplayer", href: "/multiplayer" },
    { label: "Leaderboard", href: "/leaderboard" },
  ];

  return (
    <HeroNavbar maxWidth="xl" isBordered>
      <NavbarBrand>
        <Link href="/dashboard" className="font-bold text-inherit text-lg">
          StudyBuddy
        </Link>
      </NavbarBrand>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {navItems.map((item) => (
          <NavbarItem key={item.href} isActive={pathname === item.href}>
            <Link
              href={item.href}
              className={
                pathname === item.href ? "text-primary" : "text-foreground"
              }
            >
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        {user && (
          <Dropdown>
            <DropdownTrigger>
              <Button variant="flat" size="sm">
                {user.name}
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu">
              <DropdownItem key="email" className="text-default-500" isReadOnly>
                {user.email}
              </DropdownItem>
              <DropdownItem
                key="logout"
                color="danger"
                onPress={handleSignOut}
              >
                Sign Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </NavbarContent>
    </HeroNavbar>
  );
}
