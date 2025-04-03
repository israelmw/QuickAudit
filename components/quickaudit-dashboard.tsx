"use client"

import { useState, useEffect } from "react"
import { TableIcon, Bell, Settings, Check, AlertCircle, RefreshCw, Filter, Info, AlertTriangle } from "lucide-react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

// Types based on the actual database tables
type QuickAuditConfig = {
  id: string
  table_name: string
  audit_enabled: boolean
  created_at: string
}

type AuditLog = {
  id: number
  table_name: string
  operation: string
  row_data: Record<string, unknown>
  old_data: Record<string, unknown>
  user_email: string
  timestamp: string
  reverted?: boolean
}

export default function QuickAuditDashboard() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [tables, setTables] = useState<QuickAuditConfig[]>([])
  const [changes, setChanges] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTables: 0,
    enabledTables: 0,
    totalEvents: 0,
    recentEvents: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize Supabase client using environment variables
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
    
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey)
      setSupabase(client)
    } else {
      console.error("Supabase environment variables not found. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    }
  }, [])

  // Load data when Supabase client is available
  useEffect(() => {
    if (supabase) {
      fetchData()
    }
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true)
    try {
      if (!supabase) return
      // Fetch configuration data
      const { data: configData, error: configError } = await supabase
        .from("quickaudit_config")
        .select("*")
        .order("table_name")

      if (configError) throw configError

      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from("audit_log")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100)

      if (logsError) throw logsError

      // Fetch database schema to get all tables
      const { data: schemaData, error: schemaError } = await supabase.rpc("get_all_tables").select("table_name")

      // Calculate stats
      const enabledTables = configData ? configData.filter((t) => t.audit_enabled).length : 0

      // Count recent events (last 24 hours)
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const recentEvents = logsData ? logsData.filter((log) => new Date(log.timestamp as string) > oneDayAgo).length : 0

      setTables((configData as unknown as QuickAuditConfig[]) || [])
      setChanges((logsData as unknown as AuditLog[]) || [])
      setStats({
        totalTables: schemaData?.length || configData?.length || 0,
        enabledTables,
        totalEvents: logsData?.length || 0,
        recentEvents,
      })

      // If we have schema data but some tables aren't in config, we'll add them
      if (schemaData && !schemaError) {
        const existingTables = new Set(configData.map((c) => c.table_name))
        const missingTables = schemaData.filter((t) => !existingTables.has(t.table_name))

        if (missingTables.length > 0) {
          // Add missing tables to configuration (disabled by default)
          for (const table of missingTables) {
            await supabase.from("quickaudit_config").insert({
              table_name: table.table_name,
              audit_enabled: false,
            })
          }
          // Refresh data after adding new tables
          fetchData()
          return
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAudit = async (id: string, currentState: boolean, tableName: string) => {
    try {
      setError(null);
      if (!supabase) return
      
      // Call the security-definer function to toggle audit safely
      const { error: toggleError } = await supabase.rpc(
        'toggle_table_audit', 
        { 
          table_name: tableName,
          enable: !currentState
        }
      );
      
      if (toggleError) {
        console.error("Error toggling audit:", toggleError);
        setError(`Failed to toggle audit: ${toggleError.message}`);
        return;
      }
  
      // Update local state
      setTables(
        tables.map((table) => {
          if (table.id === id) {
            return {
              ...table,
              audit_enabled: !currentState,
            }
          }
          return table
        }),
      )
  
      // Update stats
      setStats((prev) => ({
        ...prev,
        enabledTables: prev.enabledTables + (currentState ? -1 : 1),
      }))
    } catch (error) {
      console.error("Error toggling audit state:", error);
      setError("Failed to toggle audit state");
    }
  }
  
  const enableAllTables = async () => {
    try {
      setError(null);
      if (!supabase) return;
      
      // Call the security-definer function to enable all audits
      const { error } = await supabase.rpc('enable_all_audits');
      
      if (error) {
        console.error("Error enabling all audits:", error);
        setError(`Failed to enable all audits: ${error.message}`);
        return;
      }
  
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error enabling all tables:", error);
      setError("Failed to enable all tables");
    }
  }

  const handleRevert = async (id: number, operation: string, oldData: Record<string, unknown>, tableName: string) => {
    try {
      if (!supabase) return
      if (operation === "INSERT") {
        // For INSERT, we need to delete the record
        const { error } = await supabase.from(tableName).delete().eq("id", oldData.id)

        if (error) throw error
      } else if (operation === "UPDATE") {
        // For UPDATE, restore the previous state
        const { error } = await supabase.from(tableName).update(oldData).eq("id", oldData.id)

        if (error) throw error
      } else if (operation === "DELETE") {
        // For DELETE, re-insert the deleted record
        const { error } = await supabase.from(tableName).insert(oldData)

        if (error) throw error
      }

      // Mark this audit log entry as reverted
      await supabase.from("audit_log").update({ reverted: true }).eq("id", id)

      // Refresh the data
      fetchData()
    } catch (error) {
      console.error("Error reverting change:", error)
    }
  }

  // Filter audit logs based on search and filters
  const filteredLogs = changes.filter((log) => {
    const matchesSearch = searchTerm
      ? log.table_name.includes(searchTerm) ||
        log.user_email?.includes(searchTerm) ||
        JSON.stringify(log.row_data).includes(searchTerm)
      : true

    const matchesTable = selectedTable ? log.table_name === selectedTable : true
    const matchesOperation = selectedOperation ? log.operation === selectedOperation : true

    return matchesSearch && matchesTable && matchesOperation
  })

  // Get unique table names and operations for filters
  const uniqueTables = Array.from(new Set(changes.map((log) => log.table_name)))
  const uniqueOperations = Array.from(new Set(changes.map((log) => log.operation)))

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatData = (data: unknown): string => {
    if (!data) return "—"
    if (typeof data === "object" && data !== null) {
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  }

  const getDiffText = (oldData: Record<string, unknown>, newData: Record<string, unknown>): string | null => {
    if (!oldData || !newData) return null

    const changes: string[] = []
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes.push(`${key}: ${formatData(oldData[key])} → ${formatData(newData[key])}`)
      }
    }

    // Also check for keys that were in old but not in new
    for (const key in oldData) {
      if (!(key in newData)) {
        changes.push(`${key}: ${formatData(oldData[key])} → (removed)`)
      }
    }

    return changes.length > 0 ? changes.join(", ") : null
  }

  if (!supabase) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle>QuickAudit Setup</CardTitle>
            <CardDescription>Environment variables not found</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              QuickAudit requires the following environment variables to be set:
            </p>
            <div className="text-xs bg-muted p-2 rounded-md">
              <pre>{`NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden">
      <Card className="border-none shadow-none md:shadow-sm md:border w-full max-w-[100vw]">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <TableIcon className="h-4 w-4" />
                </div>
                <CardTitle>QuickAudit</CardTitle>
              </div>
              <CardDescription className="mt-1">Audit trails for your Supabase data</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 md:p-6 space-y-6 w-full max-w-[100vw]">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                {error.includes("Permission denied") && (
                  <div className="mt-2 text-sm">
                    <strong>Solution:</strong> Use a service role key or database owner credentials, and ensure your RLS policies allow trigger creation.
                  </div>
                )}
              </AlertDescription>
                <Button variant="link" size="sm" className="absolute top-2 right-2" onClick={() => setError(null)}>
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                </Button>
            </Alert>
          )}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
            <Card className="w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                <TableIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalTables}</div>
                    <p className="text-xs text-muted-foreground">{stats.enabledTables} with audit enabled</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalEvents}</div>
                    <p className="text-xs text-muted-foreground">+{stats.recentEvents} in the last 24h</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <div className="flex items-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${stats.enabledTables > 0 ? 'bg-green-500' : 'bg-amber-500'} mr-1.5`}></span>
                  <span className="text-sm text-muted-foreground">{stats.enabledTables > 0 ? 'Active' : 'Inactive'}</span>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div className="text-sm">
                    {stats.enabledTables > 0 ? (
                      <p>QuickAudit is active with {stats.enabledTables} {stats.enabledTables === 1 ? 'table' : 'tables'} monitored.</p>
                    ) : (
                      <p>QuickAudit is installed but no tables are currently being monitored. Enable at least one table to start auditing.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Retention</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">30 days</div>
                <p className="text-xs text-muted-foreground">Default retention policy</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="tables" className="w-full max-w-[100vw]">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <TabsList>
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="logs">Audit Logs</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tables" className="space-y-4 w-full max-w-[100vw]">
              <div className="bg-card w-full max-w-[100vw]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 px-4">
                  <h3 className="font-semibold">Audit Table Setup</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enableAllTables}
                  >
                    Enable All
                  </Button>
                </div>

                <div className="overflow-x-auto w-full max-w-[100vw]" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Table Name
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Audit Enabled
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Last Modified
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-32" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-12" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-16" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-24" />
                                </td>
                              </tr>
                            ))
                          ) : tables.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                                No tables configured for audit. Run the setup SQL to create the required tables.
                              </td>
                            </tr>
                          ) : (
                            tables.map((table) => (
                              <tr key={table.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{table.table_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <Switch
                                    checked={table.audit_enabled}
                                    onCheckedChange={() => toggleAudit(table.id, table.audit_enabled, table.table_name)}
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  {table.audit_enabled ? (
                                    <Badge className="bg-green-500 hover:bg-green-600">
                                      <Check className="mr-1 h-3 w-3" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      <AlertCircle className="mr-1 h-3 w-3" />
                                      Inactive
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  {formatTimestamp(table.created_at)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4 w-full max-w-[100vw]">
              <div className="bg-card w-full max-w-[100vw]">
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 mb-4 px-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
                      value={selectedTable || ""}
                      onChange={(e) => setSelectedTable(e.target.value || null)}
                    >
                      <option value="">All Tables</option>
                      {uniqueTables.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                      value={selectedOperation || ""}
                      onChange={(e) => setSelectedOperation(e.target.value || null)}
                    >
                      <option value="">All Operations</option>
                      {uniqueOperations.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchTerm("")
                              setSelectedTable(null)
                              setSelectedOperation(null)
                            }}
                          >
                            <Filter className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear filters</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="overflow-x-auto w-full max-w-[100vw]" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Table
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              User
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Operation
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Timestamp
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              Changes
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase"
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-24" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-32" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-16" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-32" />
                                </td>
                                <td className="px-6 py-4">
                                  <Skeleton className="h-5 w-40" />
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Skeleton className="h-5 w-16 ml-auto" />
                                </td>
                              </tr>
                            ))
                          ) : filteredLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                                No audit logs found. Make sure you have audit enabled for some tables.
                              </td>
                            </tr>
                          ) : (
                            filteredLogs.map((log) => {
                              const diffText =
                                log.operation === "UPDATE"
                                  ? getDiffText(log.old_data, log.row_data)
                                  : log.operation === "INSERT"
                                    ? "New record created"
                                    : "Record deleted"

                              return (
                                <tr key={log.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{log.table_name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">{log.user_email || "System"}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <Badge
                                      variant={
                                        log.operation === "DELETE"
                                          ? "destructive"
                                          : log.operation === "INSERT"
                                            ? "default"
                                            : "outline"
                                      }
                                    >
                                      {log.operation}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {formatTimestamp(log.timestamp)}
                                  </td>
                                  <td className="px-6 py-4 text-sm">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="max-w-xs truncate cursor-pointer flex items-center">
                                            <span className="truncate">{diffText}</span>
                                            <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-sm">
                                          <ScrollArea className="h-[200px]">
                                            <div className="p-2">
                                              <p className="font-semibold mb-2">Change Details:</p>
                                              {log.operation === "UPDATE" ? (
                                                <div>
                                                  <p className="text-xs mb-1">Old Data:</p>
                                                  <pre className="text-xs bg-muted p-2 rounded mb-2 overflow-auto text-gray-700">
                                                    {JSON.stringify(log.old_data, null, 2)}
                                                  </pre>
                                                  <p className="text-xs mb-1">New Data:</p>
                                                  <pre className="text-xs bg-muted p-2 rounded overflow-auto text-gray-700">
                                                    {JSON.stringify(log.row_data, null, 2)}
                                                  </pre>
                                                </div>
                                              ) : log.operation === "INSERT" ? (
                                                <div>
                                                  <p className="text-xs mb-1">Inserted Data:</p>
                                                  <pre className="text-xs bg-muted p-2 rounded overflow-auto text-gray-700">
                                                    {JSON.stringify(log.row_data, null, 2)}
                                                  </pre>
                                                </div>
                                              ) : (
                                                <div>
                                                  <p className="text-xs mb-1">Deleted Data:</p>
                                                  <pre className="text-xs bg-muted p-2 rounded overflow-auto text-gray-700">
                                                    {JSON.stringify(log.old_data, null, 2)}
                                                  </pre>
                                                </div>
                                              )}
                                            </div>
                                          </ScrollArea>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleRevert(log.id, log.operation, log.old_data, log.table_name)
                                            }
                                            disabled={log.reverted}
                                          >
                                            Revert
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Attempt to revert this change</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                      
                      {filteredLogs.length > 0 && (
                        <div className="px-6 py-3 text-sm text-muted-foreground text-center">
                          Showing {filteredLogs.length} of {changes.length} audit logs
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

