"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  TableIcon,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  Menu,
} from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import QuickAuditDashboard from "@/components/quickaudit-dashboard"


export default function DashboardDemo() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-border bg-card">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <TableIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">SuperApp</span>
            </div>
          </div>
          <div className="flex-grow flex flex-col pt-5">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              <a
                href="#"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Dashboard
              </a>
              <a
                href="#"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-accent text-accent-foreground"
              >
                <TableIcon className="mr-3 h-5 w-5" />
                Audit Logs
              </a>
              <a
                href="#"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Users className="mr-3 h-5 w-5" />
                Users
              </a>
              <a
                href="#"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ShoppingCart className="mr-3 h-5 w-5" />
                Products
              </a>
              <a
                href="#"
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </a>
            </nav>
            <div className="px-2 pb-4">
              <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Image
                      src="https://avatar.vercel.sh/bc4f2b0e-3a1d-4b8f-9c5d-6a7e2f3f5c1b"
                      width={32}
                      height={32}
                      alt="User avatar"
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-xs text-muted-foreground">admin@example.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden ml-4">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col flex-grow h-full">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                  <TableIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">SuperApp</span>
              </div>
            </div>
            <div className="flex-grow flex flex-col pt-5">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                <a
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LayoutDashboard className="mr-3 h-5 w-5" />
                  Dashboard
                </a>
                <a
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-accent text-accent-foreground"
                >
                  <TableIcon className="mr-3 h-5 w-5" />
                  Audit Logs
                </a>
                <a
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Users className="mr-3 h-5 w-5" />
                  Users
                </a>
                <a
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Products
                </a>
                <a
                  href="#"
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </a>
              </nav>
              <div className="px-2 pb-4">
                <div className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Image
                        src="/placeholder.svg?height=32&width=32"
                        width={32}
                        height={32}
                        alt="User avatar"
                        className="rounded-full"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Admin User</p>
                      <p className="text-xs text-muted-foreground">admin@example.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex-shrink-0 h-16 bg-background border-b border-border flex">
          <Button variant="ghost" size="icon" className="md:hidden ml-4" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex items-center md:ml-0">
                <div className="relative w-full flex items-center">
                  <div className="absolute left-3 flex items-center justify-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <Input
                    placeholder="Search..."
                    className="pl-10 h-10 w-full md:w-64 lg:w-80 bg-background"
                  />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">View notifications</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-2">
                      <Image
                        src="https://avatar.vercel.sh/bc4f2b0e-3a1d-4b8f-9c5d-6a7e2f3f5c1b"
                        width={32}
                        height={32}
                        alt="User avatar"
                        className="rounded-full"
                      />
                    </div>
                    <span className="hidden md:block">Admin User</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
              <Card>
                <CardContent className="p-0">
                  {/* QuickAudit Dashboard Component */}
                  <QuickAuditDashboard />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

